'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { getTenantContext } from '@/lib/tenant';
import { requirePermission } from '@/lib/permissions';
import { logger } from '@/lib/logger';

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  roleId: z.string().min(1),
  projectId: z.string().min(1),
  tempPassword: z.string().min(10),
});

export async function inviteUser(data: z.infer<typeof inviteSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'users', 'crear');

  const parsed = inviteSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  const { email, name, roleId, projectId, tempPassword } = parsed.data;

  // Verificar límite de usuarios del plan
  const org = await db.organization.findUnique({ where: { id: ctx.orgId } });
  const userCount = await db.user.count({ where: { orgId: ctx.orgId } });
  if (org && userCount >= org.maxUsers) {
    return { ok: false, error: `Plan limitado a ${org.maxUsers} usuarios. Actualiza tu plan para invitar más.` };
  }

  // Email único por org
  const existing = await db.user.findUnique({
    where: { orgId_email: { orgId: ctx.orgId, email: email.toLowerCase() } },
  });
  if (existing) return { ok: false, error: 'Ya existe un usuario con ese email.' };

  const passwordHash = await hashPassword(tempPassword);

  const user = await db.user.create({
    data: {
      orgId: ctx.orgId,
      email: email.toLowerCase(),
      name,
      passwordHash,
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });

  await db.userProjectAssignment.create({
    data: { userId: user.id, projectId, roleId },
  });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'create',
      module: 'users',
      entityType: 'User',
      entityId: user.id,
      actorType: 'human',
      actorId: ctx.userId,
      after: { email, name, roleId, projectId },
    },
  });

  logger.info({ orgId: ctx.orgId, newUserId: user.id }, 'User invited');
  revalidatePath('/settings/users');
  return { ok: true };
}

export async function deactivateUser(userId: string) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'users', 'editar');

  if (userId === ctx.userId) return { ok: false, error: 'No puedes desactivarte a ti mismo.' };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.orgId !== ctx.orgId) return { ok: false, error: 'Usuario no encontrado.' };

  await db.user.update({ where: { id: userId }, data: { status: 'inactive' } });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'update',
      module: 'users',
      entityType: 'User',
      entityId: userId,
      actorType: 'human',
      actorId: ctx.userId,
      after: { status: 'inactive' },
    },
  });

  revalidatePath('/settings/users');
  return { ok: true };
}

export async function reactivateUser(userId: string) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'users', 'editar');

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.orgId !== ctx.orgId) return { ok: false, error: 'Usuario no encontrado.' };

  await db.user.update({ where: { id: userId }, data: { status: 'active' } });

  revalidatePath('/settings/users');
  return { ok: true };
}
