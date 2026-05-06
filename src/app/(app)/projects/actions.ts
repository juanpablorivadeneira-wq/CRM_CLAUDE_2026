'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { requirePermission } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import type { ProjectStatus } from '@prisma/client';

const projectSchema = z.object({
  name: z.string().min(2).max(80),
  projectTypeId: z.string().min(1),
  status: z.enum(['active', 'paused', 'sold_out', 'cancelled']).default('active'),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  referencePrice: z.coerce.number().min(0).optional().nullable(),
});

export async function createProject(data: z.infer<typeof projectSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'projects', 'crear');

  const parsed = projectSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  // Validar límite del plan
  const [org, count] = await Promise.all([
    db.organization.findUnique({ where: { id: ctx.orgId } }),
    db.project.count({ where: { orgId: ctx.orgId, deletedAt: null } }),
  ]);
  if (org && count >= org.maxProjects) {
    return { ok: false, error: `Plan limitado a ${org.maxProjects} proyectos. Actualiza tu plan.` };
  }

  // Validar que el ProjectType pertenezca a la org
  const pt = await db.projectType.findUnique({ where: { id: parsed.data.projectTypeId } });
  if (!pt || pt.orgId !== ctx.orgId) return { ok: false, error: 'Tipo de proyecto inválido' };

  const created = await db.project.create({
    data: {
      orgId: ctx.orgId,
      name: parsed.data.name,
      projectTypeId: parsed.data.projectTypeId,
      businessLine: pt.businessLine,
      status: parsed.data.status as ProjectStatus,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl || null,
      address: parsed.data.address,
      referencePrice: parsed.data.referencePrice ?? null,
    },
  });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'create',
      module: 'projects',
      entityType: 'Project',
      entityId: created.id,
      actorType: 'human',
      actorId: ctx.userId,
      after: { name: created.name, projectTypeId: created.projectTypeId },
    },
  });

  logger.info({ orgId: ctx.orgId, projectId: created.id }, 'Project created');
  revalidatePath('/projects');
  return { ok: true, id: created.id };
}

export async function updateProject(id: string, data: z.infer<typeof projectSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'projects', 'editar');

  const parsed = projectSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  const project = await db.project.findUnique({ where: { id } });
  if (!project || project.orgId !== ctx.orgId) return { ok: false, error: 'Proyecto no encontrado' };

  await db.project.update({
    where: { id },
    data: {
      name: parsed.data.name,
      projectTypeId: parsed.data.projectTypeId,
      status: parsed.data.status as ProjectStatus,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl || null,
      address: parsed.data.address,
      referencePrice: parsed.data.referencePrice ?? null,
    },
  });

  revalidatePath('/projects');
  revalidatePath(`/projects/${id}`);
  return { ok: true };
}

export async function deleteProject(id: string, options: { force?: boolean } = {}) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'projects', 'eliminar');

  const project = await db.project.findUnique({
    where: { id },
    include: { _count: { select: { opportunities: true } } },
  });
  if (!project || project.orgId !== ctx.orgId) return { ok: false, error: 'Proyecto no encontrado' };

  if (project._count.opportunities > 0 && !options.force) {
    return {
      ok: false,
      error: `Este proyecto tiene ${project._count.opportunities} oportunidad(es).`,
      requiresConfirm: true,
      opportunityCount: project._count.opportunities,
    };
  }

  const now = new Date();
  await db.$transaction([
    db.opportunity.updateMany({
      where: { projectId: id, deletedAt: null },
      data: { deletedAt: now },
    }),
    db.project.update({ where: { id }, data: { deletedAt: now } }),
  ]);

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'delete',
      module: 'projects',
      entityType: 'Project',
      entityId: id,
      actorType: 'human',
      actorId: ctx.userId,
      after: { cascadedOpportunities: project._count.opportunities },
    },
  });

  logger.info(
    { orgId: ctx.orgId, projectId: id, cascadedOpportunities: project._count.opportunities },
    'Project soft-deleted',
  );

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  return { ok: true, deletedOpportunities: project._count.opportunities };
}

/**
 * Elimina (soft) sólo los clientes y oportunidades creadas por el seed demo
 * (tag 'demo' en cliente). Útil cuando el usuario quiere cargar datos reales.
 */
export async function purgeDemoDataAction() {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'projects', 'eliminar');

  const demoClients = await db.client.findMany({
    where: { orgId: ctx.orgId, tags: { has: 'demo' }, deletedAt: null },
    select: { id: true },
  });
  const demoClientIds = demoClients.map((c) => c.id);

  if (demoClientIds.length === 0) {
    return { ok: true, deletedClients: 0, deletedOpportunities: 0 };
  }

  const now = new Date();
  const [{ count: oppsCount }] = await db.$transaction([
    db.opportunity.updateMany({
      where: { orgId: ctx.orgId, clientId: { in: demoClientIds }, deletedAt: null },
      data: { deletedAt: now },
    }),
    db.client.updateMany({
      where: { id: { in: demoClientIds } },
      data: { deletedAt: now },
    }),
  ]);

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'delete',
      module: 'clients',
      entityType: 'Client',
      entityId: 'demo-purge',
      actorType: 'human',
      actorId: ctx.userId,
      after: { deletedClients: demoClientIds.length, deletedOpportunities: oppsCount },
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/projects');
  return { ok: true, deletedClients: demoClientIds.length, deletedOpportunities: oppsCount };
}
