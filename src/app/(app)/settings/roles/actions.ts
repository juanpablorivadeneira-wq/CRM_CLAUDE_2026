'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { requirePermission, type ModuleKey } from '@/lib/permissions';
import type { PermissionAction } from '@prisma/client';

const updatePermissionsSchema = z.object({
  roleId: z.string(),
  permissions: z.record(z.array(z.string())),
});

export async function updateRolePermissions(data: z.infer<typeof updatePermissionsSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'roles', 'editar');

  const parsed = updatePermissionsSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const { roleId, permissions } = parsed.data;

  // Validar que el rol pertenezca a la org del usuario
  const role = await db.role.findUnique({ where: { id: roleId } });
  if (!role || role.orgId !== ctx.orgId) {
    return { ok: false, error: 'Rol no encontrado' };
  }

  // Reemplazar permisos del rol
  const flat = Object.entries(permissions).flatMap(([module, actions]) =>
    actions.map((action) => ({ roleId, module, action: action as PermissionAction })),
  );

  await db.$transaction([
    db.rolePermission.deleteMany({ where: { roleId } }),
    db.rolePermission.createMany({ data: flat, skipDuplicates: true }),
    db.auditLog.create({
      data: {
        orgId: ctx.orgId,
        action: 'update',
        module: 'roles',
        entityType: 'Role',
        entityId: roleId,
        actorType: 'human',
        actorId: ctx.userId,
        after: { permissions },
      },
    }),
  ]);

  revalidatePath('/settings/roles');
  return { ok: true };
}

const createRoleSchema = z.object({
  name: z.string().min(2).max(40),
  description: z.string().max(200).optional(),
});

export async function createRole(data: z.infer<typeof createRoleSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'roles', 'crear');

  const parsed = createRoleSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Datos inválidos' };

  const existing = await db.role.findUnique({
    where: { orgId_name: { orgId: ctx.orgId, name: parsed.data.name } },
  });
  if (existing) return { ok: false, error: 'Ya existe un rol con ese nombre.' };

  await db.role.create({
    data: {
      orgId: ctx.orgId,
      name: parsed.data.name,
      description: parsed.data.description,
      isSystem: false,
    },
  });

  revalidatePath('/settings/roles');
  return { ok: true };
}
