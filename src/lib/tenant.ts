import 'server-only';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Contexto del tenant + usuario para server components y server actions.
 * Toda lógica de negocio debe usar getTenantContext() en lugar de auth() directo
 * para que orgId esté siempre disponible y validado.
 */
export type TenantContext = {
  orgId: string;
  orgSlug: string;
  orgName: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  isSuperAdmin: boolean;
};

export async function getTenantContext(): Promise<TenantContext> {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const orgSlug = (session as any).orgSlug as string | undefined;
  const orgId = (session as any).orgId as string | undefined;
  const orgName = (session as any).orgName as string | undefined;

  if (!orgId || !orgSlug) {
    redirect('/login?error=no_tenant');
  }

  return {
    orgId,
    orgSlug,
    orgName: orgName ?? '',
    userId: session.user.id as string,
    userEmail: session.user.email as string,
    userName: session.user.name ?? null,
    isSuperAdmin: orgSlug === 'system',
  };
}

/**
 * Igual que getTenantContext pero devuelve null si no hay sesión (sin redirect).
 * Útil para layouts que quieren mostrar UI de invitado.
 */
export async function getOptionalTenantContext(): Promise<TenantContext | null> {
  const session = await auth();
  if (!session?.user) return null;

  const orgSlug = (session as any).orgSlug as string | undefined;
  const orgId = (session as any).orgId as string | undefined;
  if (!orgId || !orgSlug) return null;

  return {
    orgId,
    orgSlug,
    orgName: (session as any).orgName ?? '',
    userId: session.user.id as string,
    userEmail: session.user.email as string,
    userName: session.user.name ?? null,
    isSuperAdmin: orgSlug === 'system',
  };
}

/**
 * Carga la organización completa con su branding y plan.
 * Se cachea por request mediante React's cache().
 */
import { cache } from 'react';
export const getCurrentOrg = cache(async (orgId: string) => {
  return db.organization.findUnique({ where: { id: orgId } });
});

/**
 * Helper para tomar el slug del subdominio en server components
 * (alternativa a la sesión cuando se necesita branding antes de login).
 */
export async function getSubdomainSlug(): Promise<string | null> {
  const h = await headers();
  const host = h.get('host');
  if (!host) return null;
  const rootDomain = process.env.APP_ROOT_DOMAIN ?? 'localhost';
  const hostname = host.split(':')[0];
  if (!hostname.endsWith(`.${rootDomain}`)) return null;
  const sub = hostname.replace(`.${rootDomain}`, '');
  if (sub === 'app' || sub === 'www' || sub === 'admin') return null;
  return sub;
}
