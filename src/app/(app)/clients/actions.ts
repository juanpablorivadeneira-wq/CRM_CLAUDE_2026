'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { requirePermission } from '@/lib/permissions';
import { logger } from '@/lib/logger';
import type { ClientType, LeadOrigin } from '@prisma/client';

const clientSchema = z.object({
  type: z.enum(['person', 'company']).default('person'),
  name: z.string().min(2).max(120),
  ci: z.string().max(20).optional(),
  ruc: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(80).optional(),
  profession: z.string().max(80).optional(),
  origin: z.enum([
    'meta_ads', 'web_form', 'referral', 'trade_show',
    'cold_call', 'whatsapp_inbound', 'walk_in', 'other',
  ]).default('other'),
  originDetail: z.string().max(120).optional(),
  budgetMin: z.coerce.number().min(0).optional().nullable(),
  budgetMax: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
});

export async function createClient(data: z.infer<typeof clientSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'clients', 'crear');

  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  // Email único por org si se provee
  if (parsed.data.email) {
    const existing = await db.client.findFirst({
      where: { orgId: ctx.orgId, email: parsed.data.email, deletedAt: null },
    });
    if (existing) return { ok: false, error: 'Ya existe un cliente con ese email.' };
  }

  const created = await db.client.create({
    data: {
      orgId: ctx.orgId,
      type: parsed.data.type as ClientType,
      name: parsed.data.name,
      ci: parsed.data.ci || null,
      ruc: parsed.data.ruc || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      profession: parsed.data.profession || null,
      origin: parsed.data.origin as LeadOrigin,
      originDetail: parsed.data.originDetail || null,
      budgetMin: parsed.data.budgetMin ?? null,
      budgetMax: parsed.data.budgetMax ?? null,
      notes: parsed.data.notes || null,
      tags: parsed.data.tags ?? [],
      createdById: ctx.userId,
    },
  });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'create',
      module: 'clients',
      entityType: 'Client',
      entityId: created.id,
      actorType: 'human',
      actorId: ctx.userId,
      after: { name: created.name, email: created.email, origin: created.origin },
    },
  });

  logger.info({ orgId: ctx.orgId, clientId: created.id }, 'Client created');
  revalidatePath('/clients');
  return { ok: true, id: created.id };
}

export async function updateClient(id: string, data: z.infer<typeof clientSchema>) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'clients', 'editar');

  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message };

  const client = await db.client.findUnique({ where: { id } });
  if (!client || client.orgId !== ctx.orgId) return { ok: false, error: 'Cliente no encontrado' };

  await db.client.update({
    where: { id },
    data: {
      type: parsed.data.type as ClientType,
      name: parsed.data.name,
      ci: parsed.data.ci || null,
      ruc: parsed.data.ruc || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      profession: parsed.data.profession || null,
      origin: parsed.data.origin as LeadOrigin,
      originDetail: parsed.data.originDetail || null,
      budgetMin: parsed.data.budgetMin ?? null,
      budgetMax: parsed.data.budgetMax ?? null,
      notes: parsed.data.notes || null,
      tags: parsed.data.tags ?? [],
    },
  });

  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
  return { ok: true };
}

export async function deleteClient(id: string) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'clients', 'eliminar');

  const client = await db.client.findUnique({
    where: { id },
    include: { _count: { select: { opportunities: true } } },
  });
  if (!client || client.orgId !== ctx.orgId) return { ok: false, error: 'Cliente no encontrado' };
  if (client._count.opportunities > 0) {
    return { ok: false, error: `Este cliente tiene ${client._count.opportunities} oportunidad(es). Elimínalas primero.` };
  }

  await db.client.update({ where: { id }, data: { deletedAt: new Date() } });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'delete',
      module: 'clients',
      entityType: 'Client',
      entityId: id,
      actorType: 'human',
      actorId: ctx.userId,
    },
  });

  revalidatePath('/clients');
  return { ok: true };
}

const importRowSchema = z.object({
  type: z.enum(['person', 'company']).default('person'),
  name: z.string().min(2).max(120),
  ci: z.string().max(20).optional().nullable(),
  ruc: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().or(z.literal('')).nullable(),
  phone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  address: z.string().max(200).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  profession: z.string().max(80).optional().nullable(),
  origin: z.enum([
    'meta_ads', 'web_form', 'referral', 'trade_show',
    'cold_call', 'whatsapp_inbound', 'walk_in', 'other',
  ]).default('other'),
  notes: z.string().max(2000).optional().nullable(),
});

export type ImportClientRow = z.infer<typeof importRowSchema>;

export async function importClientsAction(rows: unknown[]) {
  const ctx = await getTenantContext();
  await requirePermission(ctx.userId, 'clients', 'crear');

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: 'No hay filas para importar.' };
  }
  if (rows.length > 2000) {
    return { ok: false, error: 'Máximo 2000 filas por importación.' };
  }

  const errors: { row: number; error: string }[] = [];
  const valid: ImportClientRow[] = [];

  rows.forEach((raw, idx) => {
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row: idx + 2, error: parsed.error.errors[0]?.message ?? 'Inválido' });
    } else {
      valid.push(parsed.data);
    }
  });

  if (valid.length === 0) {
    return { ok: false, error: 'Ninguna fila válida.', errors };
  }

  const emailsInBatch = valid
    .map((v) => v.email)
    .filter((e): e is string => typeof e === 'string' && e.length > 0);
  const existing = emailsInBatch.length
    ? await db.client.findMany({
        where: { orgId: ctx.orgId, email: { in: emailsInBatch }, deletedAt: null },
        select: { email: true },
      })
    : [];
  const existingEmails = new Set(existing.map((e) => e.email));

  const toCreate = valid.filter((r) => !r.email || !existingEmails.has(r.email));
  const skippedDuplicates = valid.length - toCreate.length;

  if (toCreate.length === 0) {
    return {
      ok: true,
      created: 0,
      skippedDuplicates,
      errors,
      message: 'Todos los clientes ya existían (email duplicado).',
    };
  }

  const result = await db.client.createMany({
    data: toCreate.map((r) => ({
      orgId: ctx.orgId,
      type: (r.type ?? 'person') as ClientType,
      name: r.name,
      ci: r.ci ?? null,
      ruc: r.ruc ?? null,
      email: r.email || null,
      phone: r.phone ?? null,
      whatsapp: r.whatsapp ?? null,
      address: r.address ?? null,
      city: r.city ?? null,
      profession: r.profession ?? null,
      origin: r.origin as LeadOrigin,
      notes: r.notes ?? null,
      tags: ['imported'],
      createdById: ctx.userId,
    })),
    skipDuplicates: true,
  });

  await db.auditLog.create({
    data: {
      orgId: ctx.orgId,
      action: 'create',
      module: 'clients',
      entityType: 'Client',
      entityId: 'bulk-import',
      actorType: 'human',
      actorId: ctx.userId,
      after: { created: result.count, skippedDuplicates, totalRows: rows.length },
    },
  });

  logger.info(
    { orgId: ctx.orgId, created: result.count, skipped: skippedDuplicates, errors: errors.length },
    'Bulk import clients',
  );

  revalidatePath('/clients');
  revalidatePath('/dashboard');

  return {
    ok: true,
    created: result.count,
    skippedDuplicates,
    errors,
  };
}
