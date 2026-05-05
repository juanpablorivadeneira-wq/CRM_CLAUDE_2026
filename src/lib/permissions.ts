import { db } from '@/lib/db';
import { cache } from 'react';
import type { PermissionAction } from '@prisma/client';

// =============================================================================
// Catálogo de módulos del sistema (alineado a la matriz BuildKontrol)
// =============================================================================
export const MODULES = {
  // CRM (esta app)
  crm: 'CRM',
  clients: 'Clientes',
  opportunities: 'Oportunidades',
  pipeline: 'Pipeline',
  calendar: 'Calendario',
  reports: 'Reportes',
  // Configuración
  projects: 'Proyectos',
  project_types: 'Tipos de proyecto',
  users: 'Usuarios',
  roles: 'Roles',
  audit: 'Auditoría',
  // Integraciones (Fase 6+)
  integrations: 'Integraciones',
  ai: 'Agente IA',
  billing: 'Facturación',
} as const;

export type ModuleKey = keyof typeof MODULES;

// =============================================================================
// Permisos por defecto de los roles del sistema
// =============================================================================
type RolePermissionMap = Partial<Record<ModuleKey, PermissionAction[]>>;

export const SYSTEM_ROLE_PERMISSIONS: Record<string, RolePermissionMap> = {
  // Acceso total a todo
  Superadmin: {
    crm: ['ver', 'crear', 'editar', 'eliminar', 'aprobar', 'exportar'],
    clients: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
    opportunities: ['ver', 'crear', 'editar', 'eliminar', 'aprobar', 'exportar'],
    pipeline: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
    calendar: ['ver', 'crear', 'editar', 'eliminar', 'aprobar'],
    reports: ['ver', 'exportar'],
    projects: ['ver', 'crear', 'editar', 'eliminar', 'aprobar'],
    project_types: ['ver', 'crear', 'editar', 'eliminar'],
    users: ['ver', 'crear', 'editar', 'eliminar'],
    roles: ['ver', 'crear', 'editar', 'eliminar'],
    audit: ['ver', 'exportar'],
    integrations: ['ver', 'crear', 'editar', 'eliminar'],
    ai: ['ver', 'crear', 'editar', 'eliminar', 'aprobar'],
    billing: ['ver', 'editar'],
  },
  // Acceso completo al CRM y configuración comercial; sin gestión de usuarios
  'Gerente Comercial': {
    crm: ['ver', 'crear', 'editar', 'aprobar', 'exportar'],
    clients: ['ver', 'crear', 'editar', 'exportar'],
    opportunities: ['ver', 'crear', 'editar', 'aprobar', 'exportar'],
    pipeline: ['ver', 'crear', 'editar', 'exportar'],
    calendar: ['ver', 'crear', 'editar', 'aprobar'],
    reports: ['ver', 'exportar'],
    projects: ['ver', 'editar'],
    project_types: ['ver'],
    audit: ['ver'],
    integrations: ['ver'],
    ai: ['ver', 'editar'],
  },
  // Solo su cartera asignada; lee proyectos pero no los configura
  Vendedor: {
    crm: ['ver', 'crear', 'editar'],
    clients: ['ver', 'crear', 'editar'],
    opportunities: ['ver', 'crear', 'editar'],
    pipeline: ['ver'],
    calendar: ['ver', 'crear', 'editar'],
    reports: ['ver'],
    projects: ['ver'],
  },
};

export const SYSTEM_ROLES = Object.keys(SYSTEM_ROLE_PERMISSIONS);

// =============================================================================
// Verificación de permisos
// =============================================================================
export const getUserPermissions = cache(async (userId: string, projectId?: string) => {
  const where = projectId ? { userId, projectId } : { userId };
  const assignments = await db.userProjectAssignment.findMany({
    where,
    include: { role: { include: { permissions: true } } },
  });

  // Aplanar todos los permisos del usuario en sus proyectos
  const perms = new Map<string, Set<PermissionAction>>();
  for (const a of assignments) {
    for (const p of a.role.permissions) {
      const key = p.module;
      if (!perms.has(key)) perms.set(key, new Set());
      perms.get(key)!.add(p.action);
    }
  }
  return perms;
});

export async function hasPermission(
  userId: string,
  module: ModuleKey,
  action: PermissionAction,
  projectId?: string,
): Promise<boolean> {
  const perms = await getUserPermissions(userId, projectId);
  return perms.get(module)?.has(action) ?? false;
}

/**
 * Throw si el usuario no tiene el permiso requerido.
 * Usar en server actions para proteger operaciones.
 */
export async function requirePermission(
  userId: string,
  module: ModuleKey,
  action: PermissionAction,
  projectId?: string,
): Promise<void> {
  const ok = await hasPermission(userId, module, action, projectId);
  if (!ok) {
    throw new Error(`Forbidden: missing permission ${module}.${action}`);
  }
}

/**
 * Crea los roles del sistema y sus permisos para una organización nueva.
 * Se llama desde el onboarding y se puede llamar de nuevo (es idempotente).
 */
export async function seedSystemRoles(orgId: string): Promise<Record<string, string>> {
  const roleIds: Record<string, string> = {};

  for (const [name, perms] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    const role = await db.role.upsert({
      where: { orgId_name: { orgId, name } },
      update: {},
      create: { orgId, name, isSystem: true },
    });
    roleIds[name] = role.id;

    // Limpiar permisos viejos y reescribir (idempotente)
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    const flat = Object.entries(perms).flatMap(([module, actions]) =>
      (actions ?? []).map((action) => ({ roleId: role.id, module, action })),
    );
    if (flat.length > 0) {
      await db.rolePermission.createMany({ data: flat, skipDuplicates: true });
    }
  }
  return roleIds;
}
