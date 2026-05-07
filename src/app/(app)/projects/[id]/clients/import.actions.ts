'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { requirePermission } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import type { LeadOrigin } from '@prisma/client';

export type ImportLeadInput = {
  date: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  data: Record<string, string>;
};

export type ImportLeadsResult = {
  ok: boolean;
  error?: string;
  created: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  skippedSamples?: string[];
};

const MAX_ROWS = 2000;

export async function importFunnelLeadsAction(
  projectId: string,
  rows: ImportLeadInput[],
): Promise<ImportLeadsResult> {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'clients', 'crear');

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: 'No hay filas para importar.', created: 0, skippedDuplicates: 0, skippedInvalid: 0 };
  }
  if (rows.length > MAX_ROWS) {
    return {
      ok: false,
      error: `Máximo ${MAX_ROWS} filas por importación.`,
      created: 0,
      skippedDuplicates: 0,
      skippedInvalid: 0,
    };
  }

  const project = await db.project.findFirst({
    where: { id: projectId, orgId: ctx.orgId, deletedAt: null },
    include: { projectType: { include: { stages: { orderBy: { order: 'asc' }, take: 1 } } } },
  });
  if (!project) return { ok: false, error: 'Proyecto no encontrado.', created: 0, skippedDuplicates: 0, skippedInvalid: 0 };

  const initialStage = project.projectType.stages[0];
  if (!initialStage) {
    return {
      ok: false,
      error: 'Este proyecto no tiene etapas definidas en su tipo. Configúralas antes de importar.',
      created: 0,
      skippedDuplicates: 0,
      skippedInvalid: 0,
    };
  }

  // Filtrar inválidas (sin nombre)
  const valid = rows.filter((r) => r.name && r.name.trim().length >= 2);
  const skippedInvalid = rows.length - valid.length;

  // Lookup de oportunidades existentes en este proyecto por email
  const emailsInBatch = Array.from(
    new Set(valid.map((r) => r.email).filter((e): e is string => !!e)),
  );
  const existingOpps = emailsInBatch.length
    ? await db.opportunity.findMany({
        where: {
          orgId: ctx.orgId,
          projectId: project.id,
          deletedAt: null,
          client: { email: { in: emailsInBatch } },
        },
        select: { client: { select: { email: true } } },
      })
    : [];
  const existingEmailsForProject = new Set(
    existingOpps.map((o) => o.client.email?.toLowerCase()).filter(Boolean) as string[],
  );

  // Lookup de clientes existentes en la org por email (para reusarlos)
  const existingClients = emailsInBatch.length
    ? await db.client.findMany({
        where: { orgId: ctx.orgId, email: { in: emailsInBatch }, deletedAt: null },
        select: { id: true, email: true },
      })
    : [];
  const clientByEmail = new Map(
    existingClients.map((c) => [c.email!.toLowerCase(), c.id] as const),
  );

  // Dedup interno del batch (mismo email repetido en el mismo CSV)
  const seenEmails = new Set<string>();
  const skippedSamples: string[] = [];
  let created = 0;
  let skippedDuplicates = 0;

  // Leads sin email se procesan como nuevos clientes (no podemos dedupar)
  for (const lead of valid) {
    const emailLower = lead.email?.toLowerCase() ?? null;

    if (emailLower) {
      if (seenEmails.has(emailLower) || existingEmailsForProject.has(emailLower)) {
        skippedDuplicates++;
        if (skippedSamples.length < 5) skippedSamples.push(lead.name);
        continue;
      }
      seenEmails.add(emailLower);
    }

    let clientId = emailLower ? clientByEmail.get(emailLower) : undefined;

    if (!clientId) {
      const newClient = await db.client.create({
        data: {
          orgId: ctx.orgId,
          type: 'person',
          name: lead.name.trim(),
          email: emailLower,
          phone: lead.phone ?? null,
          whatsapp: lead.phone ?? null,
          origin: 'web_form' as LeadOrigin,
          tags: ['imported'],
          createdById: ctx.userId,
        },
      });
      clientId = newClient.id;
      if (emailLower) clientByEmail.set(emailLower, newClient.id);
    }

    const createdAt = lead.date ? new Date(lead.date) : new Date();
    const validCreatedAt = !isNaN(createdAt.getTime()) ? createdAt : new Date();

    await db.opportunity.create({
      data: {
        orgId: ctx.orgId,
        clientId,
        projectId: project.id,
        stageId: initialStage.id,
        status: 'open',
        data: lead.data && Object.keys(lead.data).length > 0 ? lead.data : undefined,
        createdAt: validCreatedAt,
      },
    });

    created++;
  }

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'create',
      module: 'clients',
      entityType: 'Opportunity',
      entityId: `import-${project.id}`,
      actorType: 'human',
      actorId: ctx.userId,
      after: { projectId, created, skippedDuplicates, skippedInvalid, totalRows: rows.length },
    },
  });

  logger.info(
    { orgId: ctx.orgId, projectId, created, skippedDuplicates, skippedInvalid },
    'Funnel leads imported',
  );

  revalidatePath(`/projects/${projectId}/clients`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/dashboard');

  return { ok: true, created, skippedDuplicates, skippedInvalid, skippedSamples };
}
