'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { requirePermission } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import type { OpportunityStatus } from '@prisma/client';

// =============================================================================
// CREATE OPPORTUNITY
// =============================================================================
const createSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().min(1),
  estimatedValue: z.coerce.number().min(0).optional().nullable(),
  unitDetail: z.string().max(200).optional(),
  salespersonId: z.string().optional(),
  data: z.record(z.any()).optional(),
});

export async function createOpportunity(values: z.infer<typeof createSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'opportunities', 'crear');

  const parsed = createSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  // Validar que cliente y proyecto pertenezcan a la org
  const [client, project] = await Promise.all([
    db.client.findUnique({ where: { id: parsed.data.clientId } }),
    db.project.findUnique({
      where: { id: parsed.data.projectId },
      include: { projectType: { include: { stages: { orderBy: { order: 'asc' } } } } },
    }),
  ]);

  if (!client || client.orgId !== ctx.orgId) return { ok: false, error: 'Cliente no encontrado' };
  if (!project || project.orgId !== ctx.orgId) return { ok: false, error: 'Proyecto no encontrado' };

  // Primera etapa del pipeline del tipo de proyecto
  const firstStage = project.projectType.stages.find((s) => !s.isLost) ?? project.projectType.stages[0];
  if (!firstStage) return { ok: false, error: 'El tipo de proyecto no tiene etapas configuradas' };

  const created = await db.opportunity.create({
    data: {
      orgId: ctx.orgId,
      clientId: parsed.data.clientId,
      projectId: parsed.data.projectId,
      stageId: firstStage.id,
      salespersonId: parsed.data.salespersonId || ctx.userId,
      status: 'open',
      estimatedValue: parsed.data.estimatedValue ?? null,
      unitDetail: parsed.data.unitDetail || null,
      data: parsed.data.data ?? {},
    },
  });

  // Registro inicial en stage history
  await db.opportunityStageHistory.create({
    data: {
      opportunityId: created.id,
      fromStageId: null,
      toStageId: firstStage.id,
      actorType: 'human',
      actorId: ctx.userId,
      note: 'Oportunidad creada',
    },
  });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'create',
      module: 'opportunities',
      entityType: 'Opportunity',
      entityId: created.id,
      actorType: 'human',
      actorId: ctx.userId,
      after: { clientId: created.clientId, projectId: created.projectId, stageId: firstStage.id },
    },
  });

  logger.info({ orgId: ctx.orgId, opportunityId: created.id }, 'Opportunity created');
  revalidatePath('/pipeline');
  revalidatePath(`/clients/${client.id}`);
  return { ok: true, id: created.id };
}

// =============================================================================
// MOVE STAGE
// =============================================================================
export async function moveOpportunityStage(opportunityId: string, newStageId: string, note?: string) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'opportunities', 'editar');

  const [opp, newStage] = await Promise.all([
    db.opportunity.findUnique({
      where: { id: opportunityId },
      include: { stage: true, project: { include: { projectType: true } } },
    }),
    db.pipelineStage.findUnique({ where: { id: newStageId } }),
  ]);

  if (!opp || opp.orgId !== ctx.orgId) return { ok: false, error: 'Oportunidad no encontrada' };
  if (!newStage || newStage.projectTypeId !== opp.project.projectType.id) {
    return { ok: false, error: 'La etapa no pertenece a este tipo de proyecto.' };
  }
  if (opp.stageId === newStageId) return { ok: true };

  const updates: any = { stageId: newStageId };
  if (newStage.isWon) {
    updates.status = 'won';
    updates.wonAt = new Date();
  } else if (newStage.isLost) {
    updates.status = 'lost';
  } else if (opp.status === 'won' || opp.status === 'lost') {
    updates.status = 'open';
    updates.wonAt = null;
  }

  await db.$transaction([
    db.opportunity.update({ where: { id: opportunityId }, data: updates }),
    db.opportunityStageHistory.create({
      data: {
        opportunityId,
        fromStageId: opp.stageId,
        toStageId: newStageId,
        actorType: 'human',
        actorId: ctx.userId,
        note: note ?? null,
      },
    }),
    db.auditLog.create({
      data: {
        orgId: ctx.orgId,
        action: 'update',
        module: 'opportunities',
        entityType: 'Opportunity',
        entityId: opportunityId,
        actorType: 'human',
        actorId: ctx.userId,
        before: { stageId: opp.stageId, status: opp.status },
        after: { stageId: newStageId, status: updates.status ?? opp.status },
      },
    }),
  ]);

  revalidatePath('/pipeline');
  revalidatePath(`/opportunities/${opportunityId}`);
  return { ok: true };
}

// =============================================================================
// MARK LOST (con motivo)
// =============================================================================
const markLostSchema = z.object({
  reason: z.string().min(2).max(120),
});

export async function markOpportunityLost(opportunityId: string, data: z.infer<typeof markLostSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'opportunities', 'editar');

  const parsed = markLostSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: 'Motivo requerido' };

  const opp = await db.opportunity.findUnique({
    where: { id: opportunityId },
    include: { project: { include: { projectType: { include: { stages: true } } } } },
  });
  if (!opp || opp.orgId !== ctx.orgId) return { ok: false, error: 'Oportunidad no encontrada' };

  const lostStage = opp.project.projectType.stages.find((s) => s.isLost);
  if (!lostStage) return { ok: false, error: 'Sin etapa de pérdida configurada en este tipo' };

  await db.$transaction([
    db.opportunity.update({
      where: { id: opportunityId },
      data: { stageId: lostStage.id, status: 'lost', lostReason: parsed.data.reason },
    }),
    db.opportunityStageHistory.create({
      data: {
        opportunityId,
        fromStageId: opp.stageId,
        toStageId: lostStage.id,
        actorType: 'human',
        actorId: ctx.userId,
        note: `Marcada como perdida: ${parsed.data.reason}`,
      },
    }),
  ]);

  revalidatePath('/pipeline');
  revalidatePath(`/opportunities/${opportunityId}`);
  return { ok: true };
}

// =============================================================================
// MESSAGES (Decisión 3 — tabla unificada por canal)
// =============================================================================
const messageSchema = z.object({
  channel: z.enum(['whatsapp', 'email', 'sms', 'call', 'in_app', 'meeting', 'note']),
  direction: z.enum(['inbound', 'outbound', 'internal']).default('outbound'),
  subject: z.string().max(200).optional(),
  body: z.string().min(1, 'Contenido requerido').max(5000),
});

export async function addMessage(opportunityId: string, data: z.infer<typeof messageSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'opportunities', 'editar');

  const parsed = messageSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  const opp = await db.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp || opp.orgId !== ctx.orgId) return { ok: false, error: 'Oportunidad no encontrada' };

  await db.message.create({
    data: {
      orgId: ctx.orgId,
      opportunityId,
      channel: parsed.data.channel,
      direction: parsed.data.direction,
      subject: parsed.data.subject || null,
      body: parsed.data.body,
      actorType: 'human',
      actorId: ctx.userId,
      sentById: ctx.userId,
      sentAt: new Date(),
    },
  });

  revalidatePath(`/opportunities/${opportunityId}`);
  return { ok: true };
}

// =============================================================================
// TASKS
// =============================================================================
const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().optional(), // ISO date
  assigneeId: z.string().optional(),
});

export async function addTask(opportunityId: string, data: z.infer<typeof taskSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'opportunities', 'editar');

  const parsed = taskSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  const opp = await db.opportunity.findUnique({ where: { id: opportunityId } });
  if (!opp || opp.orgId !== ctx.orgId) return { ok: false, error: 'Oportunidad no encontrada' };

  await db.task.create({
    data: {
      orgId: ctx.orgId,
      opportunityId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assigneeId: parsed.data.assigneeId || ctx.userId,
      createdById: ctx.userId,
      actorType: 'human',
    },
  });

  revalidatePath(`/opportunities/${opportunityId}`);
  return { ok: true };
}

export async function toggleTaskComplete(taskId: string) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'opportunities', 'editar');

  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task || task.orgId !== ctx.orgId) return { ok: false, error: 'Tarea no encontrada' };

  await db.task.update({
    where: { id: taskId },
    data: { completedAt: task.completedAt ? null : new Date() },
  });

  revalidatePath(`/opportunities/${task.opportunityId}`);
  return { ok: true };
}
