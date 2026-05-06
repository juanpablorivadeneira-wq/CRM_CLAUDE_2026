'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { CURRENT_PROJECT_COOKIE, COOKIE_MAX_AGE } from '@/lib/current-project';
import { getTenantContext } from '@/lib/tenant';
import { db } from '@/lib/db';

export async function setCurrentProjectAction(projectId: string | null) {
  const ctx = await getTenantContext();
  const c = await cookies();

  if (!projectId) {
    c.delete(CURRENT_PROJECT_COOKIE);
    revalidatePath('/', 'layout');
    return { ok: true };
  }

  const project = await db.project.findFirst({
    where: { id: projectId, orgId: ctx.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!project) return { ok: false, error: 'Proyecto no encontrado' };

  c.set(CURRENT_PROJECT_COOKIE, project.id, {
    path: '/',
    maxAge: COOKIE_MAX_AGE,
    sameSite: 'lax',
    httpOnly: false,
  });
  revalidatePath('/', 'layout');
  return { ok: true };
}
