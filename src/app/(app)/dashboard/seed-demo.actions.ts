'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { requirePermission } from '@/lib/permissions';
import { seedClientsForActiveProjects } from '../../../../scripts/seed-clients';

export async function seedDemoClientsForCurrentOrgAction() {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'projects', 'crear');

  const org = await db.organization.findUnique({ where: { id: ctx.orgId } });
  if (!org) return { ok: false, error: 'Organización no encontrada.' };

  await seedClientsForActiveProjects(db, { orgSlug: org.slug, perProject: 5 });

  revalidatePath('/dashboard');
  revalidatePath('/projects');
  return { ok: true };
}
