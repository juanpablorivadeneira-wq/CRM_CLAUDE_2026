import 'server-only';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths } from 'date-fns';
import { db } from '@/lib/db';

/**
 * Métricas globales del dashboard de una organización.
 */
export async function getDashboardMetrics(orgId: string, projectId?: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const baseFilter = {
    orgId,
    deletedAt: null,
    ...(projectId ? { projectId } : {}),
  };

  const [
    openCount,
    openValue,
    wonThisMonth,
    wonValueThisMonth,
    newLeadsThisMonth,
    appointmentsToday,
    pendingTasksWeek,
  ] = await Promise.all([
    db.opportunity.count({ where: { ...baseFilter, status: 'open' } }),
    db.opportunity.aggregate({
      where: { ...baseFilter, status: 'open' },
      _sum: { estimatedValue: true },
    }),
    db.opportunity.count({
      where: { ...baseFilter, status: 'won', wonAt: { gte: monthStart, lte: monthEnd } },
    }),
    db.opportunity.aggregate({
      where: { ...baseFilter, status: 'won', wonAt: { gte: monthStart, lte: monthEnd } },
      _sum: { estimatedValue: true },
    }),
    db.opportunity.count({
      where: { ...baseFilter, createdAt: { gte: monthStart, lte: monthEnd } },
    }),
    db.appointment.count({
      where: {
        orgId,
        startsAt: { gte: dayStart, lte: dayEnd },
        ...(projectId ? { opportunity: { projectId } } : {}),
      },
    }),
    db.task.findMany({
      where: {
        orgId,
        completedAt: null,
        ...(projectId ? { opportunity: { projectId } } : {}),
      },
      include: {
        opportunity: { include: { client: { select: { name: true } } } },
        assignee: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 8,
    }),
  ]);

  // Conversión de los últimos 90 días
  const ninetyDaysAgo = subMonths(now, 3);
  const [created90, won90] = await Promise.all([
    db.opportunity.count({
      where: { ...baseFilter, createdAt: { gte: ninetyDaysAgo } },
    }),
    db.opportunity.count({
      where: { ...baseFilter, status: 'won', wonAt: { gte: ninetyDaysAgo } },
    }),
  ]);
  const conversion = created90 > 0 ? (won90 / created90) * 100 : 0;

  return {
    openCount,
    openValue: openValue._sum.estimatedValue ?? 0,
    wonThisMonth,
    wonValueThisMonth: wonValueThisMonth._sum.estimatedValue ?? 0,
    newLeadsThisMonth,
    appointmentsToday,
    pendingTasks: pendingTasksWeek,
    conversion90Days: conversion,
  };
}

/**
 * Datos para el gráfico de embudo (oportunidades agrupadas por etapa).
 */
export async function getFunnelData(orgId: string, projectId?: string) {
  if (!projectId) {
    // Sin proyecto: agregamos por nombre de etapa
    const grouped = await db.opportunity.groupBy({
      by: ['stageId'],
      where: { orgId, deletedAt: null, status: { in: ['open', 'won'] } },
      _count: true,
      _sum: { estimatedValue: true },
    });
    const stages = await db.pipelineStage.findMany({
      where: { id: { in: grouped.map((g) => g.stageId) } },
    });
    const map = new Map(stages.map((s) => [s.id, s]));
    return grouped
      .map((g) => ({
        stageId: g.stageId,
        name: map.get(g.stageId)?.name ?? '—',
        order: map.get(g.stageId)?.order ?? 0,
        count: g._count,
        value: g._sum.estimatedValue ?? 0,
        isWon: map.get(g.stageId)?.isWon ?? false,
      }))
      .sort((a, b) => a.order - b.order);
  }

  // Con proyecto: ordenamos por orden de etapa del tipo de proyecto
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: { projectType: { include: { stages: { orderBy: { order: 'asc' } } } } },
  });
  if (!project) return [];

  const counts = await db.opportunity.groupBy({
    by: ['stageId'],
    where: { orgId, projectId, deletedAt: null },
    _count: true,
    _sum: { estimatedValue: true },
  });
  const countMap = new Map(counts.map((c) => [c.stageId, c]));

  return project.projectType.stages.map((s) => ({
    stageId: s.id,
    name: s.name,
    order: s.order,
    count: countMap.get(s.id)?._count ?? 0,
    value: countMap.get(s.id)?._sum.estimatedValue ?? 0,
    isWon: s.isWon,
  }));
}

/**
 * Forecast: oportunidades abiertas con su probabilidad ponderada.
 */
export async function getForecast(orgId: string, projectId?: string) {
  const opps = await db.opportunity.findMany({
    where: {
      orgId,
      deletedAt: null,
      status: 'open',
      estimatedValue: { not: null },
      ...(projectId ? { projectId } : {}),
    },
    include: {
      stage: { select: { name: true, probability: true } },
      project: { select: { name: true } },
      client: { select: { name: true } },
    },
  });

  let totalGross = 0;
  let totalWeighted = 0;
  for (const o of opps) {
    const value = o.estimatedValue ?? 0;
    totalGross += value;
    totalWeighted += value * (o.stage.probability / 100);
  }

  return {
    totalGross,
    totalWeighted,
    count: opps.length,
    items: opps.map((o) => ({
      id: o.id,
      clientName: o.client.name,
      projectName: o.project.name,
      stageName: o.stage.name,
      probability: o.stage.probability,
      value: o.estimatedValue ?? 0,
      weighted: (o.estimatedValue ?? 0) * (o.stage.probability / 100),
    })),
  };
}

/**
 * Productividad por vendedor.
 */
export async function getSalespersonProductivity(orgId: string, projectId?: string) {
  const opps = await db.opportunity.findMany({
    where: {
      orgId,
      deletedAt: null,
      salespersonId: { not: null },
      ...(projectId ? { projectId } : {}),
    },
    select: {
      salespersonId: true,
      status: true,
      estimatedValue: true,
      createdAt: true,
      wonAt: true,
    },
  });

  const users = await db.user.findMany({
    where: { orgId, status: 'active' },
    select: { id: true, name: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const byUser = new Map<
    string,
    { name: string; total: number; won: number; lost: number; openValue: number; wonValue: number; totalCycleDays: number; cycleSamples: number }
  >();

  for (const o of opps) {
    const id = o.salespersonId!;
    if (!byUser.has(id)) {
      byUser.set(id, {
        name: userMap.get(id) ?? '—',
        total: 0,
        won: 0,
        lost: 0,
        openValue: 0,
        wonValue: 0,
        totalCycleDays: 0,
        cycleSamples: 0,
      });
    }
    const u = byUser.get(id)!;
    u.total++;
    if (o.status === 'won') {
      u.won++;
      u.wonValue += o.estimatedValue ?? 0;
      if (o.wonAt) {
        u.totalCycleDays += Math.round((o.wonAt.getTime() - o.createdAt.getTime()) / 86400000);
        u.cycleSamples++;
      }
    }
    if (o.status === 'lost') u.lost++;
    if (o.status === 'open') u.openValue += o.estimatedValue ?? 0;
  }

  return Array.from(byUser.entries())
    .map(([id, u]) => ({
      userId: id,
      name: u.name,
      total: u.total,
      won: u.won,
      lost: u.lost,
      openValue: u.openValue,
      wonValue: u.wonValue,
      conversion: u.total > 0 ? (u.won / u.total) * 100 : 0,
      avgTicket: u.won > 0 ? u.wonValue / u.won : 0,
      avgCycleDays: u.cycleSamples > 0 ? u.totalCycleDays / u.cycleSamples : 0,
    }))
    .sort((a, b) => b.wonValue - a.wonValue);
}

/**
 * Origen de los leads (clientes con al menos una oportunidad).
 */
export async function getLeadOrigins(orgId: string, projectId?: string) {
  const opps = await db.opportunity.findMany({
    where: { orgId, deletedAt: null, ...(projectId ? { projectId } : {}) },
    select: { clientId: true, status: true },
  });

  const clientIds = Array.from(new Set(opps.map((o) => o.clientId)));
  const clients = await db.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, origin: true },
  });
  const originByClient = new Map(clients.map((c) => [c.id, c.origin]));

  const byOrigin = new Map<string, { total: number; won: number }>();
  for (const o of opps) {
    const origin = originByClient.get(o.clientId) ?? 'other';
    if (!byOrigin.has(origin)) byOrigin.set(origin, { total: 0, won: 0 });
    const cur = byOrigin.get(origin)!;
    cur.total++;
    if (o.status === 'won') cur.won++;
  }

  return Array.from(byOrigin.entries())
    .map(([origin, v]) => ({
      origin,
      total: v.total,
      won: v.won,
      conversion: v.total > 0 ? (v.won / v.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Análisis de pérdida: agrupa motivos de oportunidades lost.
 */
export async function getLossAnalysis(orgId: string, projectId?: string) {
  const opps = await db.opportunity.findMany({
    where: {
      orgId,
      deletedAt: null,
      status: 'lost',
      ...(projectId ? { projectId } : {}),
    },
    select: { lostReason: true, estimatedValue: true },
  });

  const byReason = new Map<string, { count: number; value: number }>();
  for (const o of opps) {
    const reason = o.lostReason ?? 'Sin motivo registrado';
    if (!byReason.has(reason)) byReason.set(reason, { count: 0, value: 0 });
    const cur = byReason.get(reason)!;
    cur.count++;
    cur.value += o.estimatedValue ?? 0;
  }

  return Array.from(byReason.entries())
    .map(([reason, v]) => ({ reason, ...v }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Leads recientes (últimos N) con sus relaciones.
 */
export async function getRecentLeads(orgId: string, limit: number, projectId?: string) {
  return db.opportunity.findMany({
    where: { orgId, deletedAt: null, ...(projectId ? { projectId } : {}) },
    include: {
      client: { select: { id: true, name: true, origin: true } },
      project: { select: { name: true } },
      stage: { select: { name: true, isWon: true, isLost: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
