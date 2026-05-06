import Link from 'next/link';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTenantContext } from '@/lib/tenant';
import {
  getDashboardMetrics,
  getRecentLeads,
  getProjectsSummary,
} from '@/lib/analytics';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, TrendingUp, Calendar, Trophy,
  Percent, ArrowRight, AlertCircle,
} from 'lucide-react';
import { ProjectsSummaryGrid } from './_components/projects-summary-grid';

export default async function DashboardPage() {
  const ctx = await getTenantContext();

  const [metrics, recent, projects] = await Promise.all([
    getDashboardMetrics(ctx.orgId),
    getRecentLeads(ctx.orgId, 6),
    getProjectsSummary(ctx.orgId),
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
        title="Dashboard"
        description="Vista global de la organización y resumen por proyecto."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Mis proyectos</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">
              Ver todos <ArrowRight className="ml-1.5 h-3 w-3" />
            </Link>
          </Button>
        </div>
        <ProjectsSummaryGrid projects={projects} />
      </section>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> Tareas pendientes (todos los proyectos)
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
                    className="block p-4 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.opportunity.client.name}
                          {t.assignee && ` · ${t.assignee.name}`}
                        </p>
                      </div>
                      {t.dueDate && (
                        <span
                          className={`whitespace-nowrap text-xs ${overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                        >
                          {format(t.dueDate, 'dd MMM', { locale: es })}
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-headline flex items-center gap-2">
            <Users className="h-5 w-5" /> Oportunidades recientes
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/pipeline">
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
                  className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{o.client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.project.name}
                      {o.unitDetail && ` · ${o.unitDetail}`}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
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
