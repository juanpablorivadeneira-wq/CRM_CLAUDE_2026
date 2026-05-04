import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/lib/auth';

// Rutas públicas (sin auth)
const PUBLIC_ROUTES = [
  '/login',
  '/onboarding',
  '/api/auth',
  '/api/health',
  '/api/onboarding',
];

// Rutas exclusivas de super-admin
const SUPER_ADMIN_ROUTES = ['/super-admin'];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isSuperAdmin(pathname: string): boolean {
  return SUPER_ADMIN_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Resuelve el slug de la organización a partir del host.
 * - En producción: subdominio (ej. arquetika.bk-crm.com → "arquetika").
 * - En desarrollo / localhost: devuelve null (se usa el orgSlug del JWT).
 * - El subdominio "app" o "www" se trata como root (sin tenant).
 */
function resolveOrgSlugFromHost(host: string | null): string | null {
  if (!host) return null;
  const rootDomain = process.env.APP_ROOT_DOMAIN ?? 'localhost';

  // Quitar puerto si existe
  const hostname = host.split(':')[0];

  if (hostname === rootDomain || hostname === `www.${rootDomain}`) return null;
  if (!hostname.endsWith(`.${rootDomain}`)) return null;

  const sub = hostname.replace(`.${rootDomain}`, '');
  if (sub === 'app' || sub === 'www' || sub === 'admin') return null;
  return sub;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Saltarse archivos estáticos (manejado por matcher, pero por seguridad)
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const session = await auth();
  const orgSlugFromHost = resolveOrgSlugFromHost(req.headers.get('host'));

  // Rutas públicas: pasar
  if (isPublic(pathname)) {
    // Si ya hay sesión y vas a /login, redirigir a /dashboard
    if (session?.user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Rutas privadas: exigir sesión
  if (!session?.user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Super-admin: solo usuarios de la organización "system"
  if (isSuperAdmin(pathname)) {
    const userOrgSlug = (session as any).orgSlug as string | undefined;
    if (userOrgSlug !== 'system') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // Validar coherencia de subdominio con sesión (white-label en prod)
  if (orgSlugFromHost && (session as any).orgSlug !== orgSlugFromHost) {
    // El usuario está en un subdominio que no es su org → cerrar sesión y redirigir
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'wrong_tenant');
    return NextResponse.redirect(loginUrl);
  }

  // Adjuntar headers de contexto para que server components los lean
  const response = NextResponse.next();
  response.headers.set('x-org-id', (session as any).orgId ?? '');
  response.headers.set('x-org-slug', (session as any).orgSlug ?? '');
  response.headers.set('x-user-id', (session.user as any).id ?? '');
  return response;
}

export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto:
    // - /_next/static, /_next/image (assets)
    // - favicon, robots, sitemap, manifest
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
};
