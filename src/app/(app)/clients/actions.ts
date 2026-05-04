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
