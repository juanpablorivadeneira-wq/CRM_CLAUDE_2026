import NextAuth from 'next-auth';
import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from '@/lib/auth.config';

const { auth: middlewareAuth } = NextAuth(authConfig);

const PUBLIC_ROUTES = [
  '/login',
  '/onboarding',
  '/api/auth',
  '/api/health',
  '/api/onboarding',
];

const SUPER_ADMIN_ROUTES = ['/super-admin'];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isSuperAdmin(pathname: string): boolean {
  return SUPER_ADMIN_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function resolveOrgSlugFromHost(host: string | null): string | null {
  if (!host) return null;
  const rootDomain = process.env.APP_ROOT_DOMAIN ?? 'localhost';
  const hostname = host.split(':')[0];
  if (hostname === rootDomain || hostname === `www.${rootDomain}`) return null;
  if (!hostname.endsWith(`.${rootDomain}`)) return null;
  const sub = hostname.replace(`.${rootDomain}`, '');
  if (sub === 'app' || sub === 'www' || sub === 'admin') return null;
  return sub;
}

export default middlewareAuth(async (req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const session = req.auth;
  const orgSlugFromHost = resolveOrgSlugFromHost(req.headers.get('host'));

  if (isPublic(pathname)) {
    if (session?.user && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  if (!session?.user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isSuperAdmin(pathname)) {
    const userOrgSlug = (session as any).orgSlug as string | undefined;
    if (userOrgSlug !== 'system') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  if (orgSlugFromHost && (session as any).orgSlug !== orgSlugFromHost) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('error', 'wrong_tenant');
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('x-org-id', (session as any).orgId ?? '');
  response.headers.set('x-org-slug', (session as any).orgSlug ?? '');
  response.headers.set('x-user-id', (session.user as any).id ?? '');
  return response;
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
};
