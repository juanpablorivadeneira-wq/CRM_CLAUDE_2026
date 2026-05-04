'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { requirePermission } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import type { BusinessLine } from '@prisma/client';

// =============================================================================
// PROJECT TYPE
// =============================================================================
const projectTypeSchema = z.object({
  name: z.string().min(2).max(80),
  businessLine: z.enum(['real_estate', 'design', 'construction']),
  description: z.string().max(500).optional(),
});

export async function createProjectType(data: z.infer<typeof projectTypeSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'project_types', 'crear');

  const parsed = projectTypeSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  const exists = await db.projectType.findUnique({
    where: { orgId_name: { orgId: ctx.orgId, name: parsed.data.name } },
  });
  if (exists) return { ok: false, error: 'Ya existe un tipo con ese nombre.' };

  const created = await db.projectType.create({
    data: {
      orgId: ctx.orgId,
      name: parsed.data.name,
      businessLine: parsed.data.businessLine as BusinessLine,
      description: parsed.data.description,
      isSystem: false,
      // Etapas iniciales por defecto
      stages: {
        create: [
          { name: 'Lead', order: 1, probability: 5, slaDays: 1 },
          { name: 'En proceso', order: 2, probability: 50 },
          { name: 'Ganado', order: 99, probability: 100, isWon: true },
          { name: 'Perdido', order: 100, probability: 0, isLost: true },
        ],
      },
    },
  });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'create',
      module: 'project_types',
      entityType: 'ProjectType',
      entityId: created.id,
      actorType: 'human',
      actorId: ctx.userId,
      after: { name: created.name, businessLine: created.businessLine },
    },
  });

  logger.info({ orgId: ctx.orgId, projectTypeId: created.id }, 'ProjectType created');
  revalidatePath('/settings/project-types');
  return { ok: true, id: created.id };
}

export async function updateProjectType(id: string, data: z.infer<typeof projectTypeSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'project_types', 'editar');

  const parsed = projectTypeSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  const pt = await db.projectType.findUnique({ where: { id } });
  if (!pt || pt.orgId !== ctx.orgId) return { ok: false, error: 'Tipo no encontrado' };

  await db.projectType.update({
    where: { id },
    data: {
      name: parsed.data.name,
      businessLine: parsed.data.businessLine as BusinessLine,
      description: parsed.data.description,
    },
  });

  revalidatePath('/settings/project-types');
  revalidatePath(`/settings/project-types/${id}`);
  return { ok: true };
}

export async function deleteProjectType(id: string) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'project_types', 'eliminar');

  const pt = await db.projectType.findUnique({
    where: { id },
    include: { _count: { select: { projects: true } } },
  });
  if (!pt || pt.orgId !== ctx.orgId) return { ok: false, error: 'Tipo no encontrado' };
  if (pt.isSystem) return { ok: false, error: 'No se puede eliminar un tipo del sistema.' };
  if (pt._count.projects > 0) {
    return { ok: false, error: `Hay ${pt._count.projects} proyecto(s) usando este tipo. Elimínalos primero.` };
  }

  await db.projectType.delete({ where: { id } });
  revalidatePath('/settings/project-types');
  return { ok: true };
}

// =============================================================================
// PIPELINE STAGES
// =============================================================================
const stageSchema = z.object({
  name: z.string().min(1).max(60),
  probability: z.number().min(0).max(100),
  slaDays: z.number().int().min(0).optional().nullable(),
  color: z.string().optional().nullable(),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
});

export async function addStage(projectTypeId: string, data: z.infer<typeof stageSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'project_types', 'editar');

  const parsed = stageSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  const pt = await db.projectType.findUnique({ where: { id: projectTypeId } });
  if (!pt || pt.orgId !== ctx.orgId) return { ok: false, error: 'Tipo no encontrado' };

  // Insertar al final
  const last = await db.pipelineStage.findFirst({
    where: { projectTypeId },
    orderBy: { order: 'desc' },
  });
  const newOrder = (last?.order ?? 0) + 1;

  await db.pipelineStage.create({
    data: {
      projectTypeId,
      name: parsed.data.name,
      order: newOrder,
      probability: parsed.data.probability,
      slaDays: parsed.data.slaDays ?? undefined,
      color: parsed.data.color ?? undefined,
      isWon: parsed.data.isWon,
      isLost: parsed.data.isLost,
    },
  });

  revalidatePath(`/settings/project-types/${projectTypeId}`);
  return { ok: true };
}

export async function updateStage(id: string, data: z.infer<typeof stageSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'project_types', 'editar');

  const parsed = stageSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  const stage = await db.pipelineStage.findUnique({
    where: { id },
    include: { projectType: true },
  });
  if (!stage || stage.projectType.orgId !== ctx.orgId) {
    return { ok: false, error: 'Etapa no encontrada' };
  }

  await db.pipelineStage.update({
    where: { id },
    data: {
      name: parsed.data.name,
      probability: parsed.data.probability,
      slaDays: parsed.data.slaDays ?? null,
      color: parsed.data.color ?? null,
      isWon: parsed.data.isWon,
      isLost: parsed.data.isLost,
    },
  });

  revalidatePath(`/settings/project-types/${stage.projectTypeId}`);
  return { ok: true };
}

export async function deleteStage(id: string) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'project_types', 'editar');

  const stage = await db.pipelineStage.findUnique({
    where: { id },
    include: {
      projectType: true,
      _count: { select: { opportunities: true } },
    },
  });
  if (!stage || stage.projectType.orgId !== ctx.orgId) {
    return { ok: false, error: 'Etapa no encontrada' };
  }
  if (stage._count.opportunities > 0) {
    return { ok: false, error: `Hay ${stage._count.opportunities} oportunidad(es) en esta etapa. Muévelas primero.` };
  }

  await db.pipelineStage.delete({ where: { id } });
  revalidatePath(`/settings/project-types/${stage.projectTypeId}`);
  return { ok: true };
}

export async function reorderStages(projectTypeId: string, orderedIds: string[]) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'project_types', 'editar');

  const pt = await db.projectType.findUnique({ where: { id: projectTypeId } });
  if (!pt || pt.orgId !== ctx.orgId) return { ok: false, error: 'Tipo no encontrado' };

  await db.$transaction(
    orderedIds.map((id, idx) =>
      db.pipelineStage.update({ where: { id }, data: { order: idx + 1 } }),
    ),
  );

  revalidatePath(`/settings/project-types/${projectTypeId}`);
  return { ok: true };
}

// =============================================================================
// CUSTOM FIELDS
// =============================================================================
const customFieldSchema = z.object({
  key: z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Solo minúsculas, números y guion bajo'),
  label: z.string().min(1).max(80),
  type: z.enum(['text', 'textarea', 'select', 'number', 'date', 'boolean']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

export type CustomField = z.infer<typeof customFieldSchema>;

export async function updateCustomFields(projectTypeId: string, fields: CustomField[]) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'project_types', 'editar');

  const pt = await db.projectType.findUnique({ where: { id: projectTypeId } });
  if (!pt || pt.orgId !== ctx.orgId) return { ok: false, error: 'Tipo no encontrado' };

  // Validar keys únicas
  const keys = new Set<string>();
  for (const f of fields) {
    if (keys.has(f.key)) return { ok: false, error: `Clave duplicada: ${f.key}` };
    keys.add(f.key);
  }

  // Validar cada campo
  const validated = fields.map((f) => customFieldSchema.parse(f));

  await db.projectType.update({
    where: { id: projectTypeId },
    data: { customFields: validated as any },
  });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'update',
      module: 'project_types',
      entityType: 'ProjectType',
      entityId: projectTypeId,
      actorType: 'human',
      actorId: ctx.userId,
      after: { customFields: validated },
    },
  });

  revalidatePath(`/settings/project-types/${projectTypeId}`);
  return { ok: true };
}
