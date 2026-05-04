import Link from 'next/link';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTenantContext } from '@/lib/tenant';
import {
  getDashboardMetrics,
  getFunnelData,
  getRecentLeads,
} from '@/lib/analytics';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Building2, Users, TrendingUp, Calendar, Trophy,
  Percent, ArrowRight, AlertCircle,
} from 'lucide-react';
import { FunnelChart } from './_components/funnel-chart';
import { DashboardProjectFilter } from './_components/dashboard-project-filter';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const ctx = await getTenantContext();
  const sp = (await searchParams) ?? {};
  const projectId = sp.projectId;

  const [metrics, funnel, recent, projects, project] = await Promise.all([
    getDashboardMetrics(ctx.orgId, projectId),
    getFunnelData(ctx.orgId, projectId),
    getRecentLeads(ctx.orgId, 6, projectId),
    db.project.findMany({
      where: { orgId: ctx.orgId, deletedAt: null, status: 'active' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    projectId
      ? db.project.findUnique({
          where: { id: projectId },
          select: { name: true, businessLine: true, referencePrice: true },
        })
      : Promise.resolve(null),
  ]);

  const KPIs = [
    {
      title: 'Pipeline abierto',
      value: `$${(metrics.openValue ?? 0).toLocaleString()}`,
      sub: `${metrics.openCount} oportunidades`,
      icon: TrendingUp,
    },
    {
      title: 'Ventas del mes',
      value: `$${(metrics.wonValueThisMonth ?? 0).toLocaleString()}`,
      sub: `${metrics.wonThisMonth} cerradas`,
      icon: Trophy,
    },
    {
      title: 'Leads nuevos del mes',
      value: metrics.newLeadsThisMonth.toString(),
      sub: 'oportunidades creadas',
      icon: Users,
    },
    {
      title: 'Conversión 90 días',
      value: `${metrics.conversion90Days.toFixed(1)}%`,
      sub: 'creadas → ganadas',
      icon: Percent,
    },
    {
      title: 'Citas hoy',
      value: metrics.appointmentsToday.toString(),
      sub: 'agendadas',
      icon: Calendar,
    },
  ];

  return (
    <>
      <PageHeader
        title={project ? `Dashboard · ${project.name}` : 'Dashboard'}
        description={
          project ? 'Vista del proyecto seleccionado.' : 'Vista global de ventas y oportunidades.'
        }
      >
        <DashboardProjectFilter
          projects={projects}
          selectedId={projectId}
        />
      </PageHeader>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        {KPIs.map(({ title, value, sub, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Embudo */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Embudo</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={funnel} />
          </CardContent>
        </Card>

        {/* Tareas pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Tareas pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {metrics.pendingTasks.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Sin tareas pendientes.
              </p>
            ) : (
              <div className="divide-y">
                {metrics.pendingTasks.map((t: any) => {
                  const overdue = t.dueDate && isPast(t.dueDate);
                  return (
                    <Link
                      key={t.id}
                      href={`/opportunities/${t.opportunityId}`}
                      className="block p-4 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.opportunity.client.name}
                            {t.assignee && ` · ${t.assignee.name}`}
                          </p>
                        </div>
                        {t.dueDate && (
                          <span
                            className={`text-xs whitespace-nowrap ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                          >
                            {format(t.dueDate, "dd MMM", { locale: es })}
                            {overdue && ' (vencida)'}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads recientes */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-headline flex items-center gap-2">
            <Users className="h-5 w-5" /> Oportunidades recientes
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href={projectId ? `/pipeline?projectId=${projectId}` : '/pipeline'}>
              Ver pipeline <ArrowRight className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Sin oportunidades aún.
            </p>
          ) : (
            <div className="divide-y">
              {recent.map((o) => (
                <Link
                  key={o.id}
                  href={`/opportunities/${o.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{o.client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.project.name}
                      {o.unitDetail && ` · ${o.unitDetail}`}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge
                      variant={o.stage.isWon ? 'default' : o.stage.isLost ? 'destructive' : 'outline'}
                      className={o.stage.isWon ? 'bg-green-600' : ''}
                    >
                      {o.stage.name}
                    </Badge>
                    {o.estimatedValue && (
                      <div className="text-xs text-muted-foreground">
                        ${o.estimatedValue.toLocaleString()}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
