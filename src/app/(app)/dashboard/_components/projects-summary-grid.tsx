import Link from 'next/link';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building2, Pencil, Hammer, ArrowRight, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const LINE_ICONS = {
  real_estate: Building2,
  design: Pencil,
  construction: Hammer,
} as const;

const LINE_LABELS = {
  real_estate: 'Inmobiliaria',
  design: 'Diseño',
  construction: 'Construcción',
} as const;

type ProjectSummary = {
  id: string;
  name: string;
  businessLine: keyof typeof LINE_LABELS;
  imageUrl: string | null;
  openCount: number;
  openValue: number;
  newLeadsThisMonth: number;
  wonThisMonth: number;
  wonValueThisMonth: number;
  pendingTasks: Array<{
    id: string;
    title: string;
    dueDate: Date | null;
    opportunityId: string;
    opportunity: { client: { name: string } };
  }>;
  pendingTasksTotal: number;
};

export function ProjectsSummaryGrid({ projects }: { projects: ProjectSummary[] }) {
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aún no tienes proyectos activos.
          </p>
          <Button asChild size="sm">
            <Link href="/projects">Crear el primero</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((p) => {
        const Icon = LINE_ICONS[p.businessLine];
        return (
          <Card key={p.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="truncate text-base font-semibold">
                    {p.name}
                  </CardTitle>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                  {LINE_LABELS[p.businessLine]}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" /> Pipeline
                  </div>
                  <div className="mt-0.5 font-semibold">
                    ${(p.openValue ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {p.openCount} {p.openCount === 1 ? 'oport.' : 'oports.'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> Nuevos
                  </div>
                  <div className="mt-0.5 font-semibold">{p.newLeadsThisMonth}</div>
                  <div className="text-[11px] text-muted-foreground">este mes</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ganadas</div>
                  <div className="mt-0.5 font-semibold">{p.wonThisMonth}</div>
                  <div className="text-[11px] text-muted-foreground">
                    ${(p.wonValueThisMonth ?? 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    Pendientes
                  </span>
                  {p.pendingTasksTotal > 3 && (
                    <span className="text-[11px] text-muted-foreground">
                      +{p.pendingTasksTotal - 3} más
                    </span>
                  )}
                </div>
                {p.pendingTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin tareas pendientes.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {p.pendingTasks.map((t) => {
                      const overdue = t.dueDate && isPast(new Date(t.dueDate));
                      return (
                        <li key={t.id} className="text-xs">
                          <Link
                            href={`/opportunities/${t.opportunityId}`}
                            className="flex items-start justify-between gap-2 hover:text-foreground"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              <span className="text-foreground">{t.title}</span>
                              <span className="text-muted-foreground">
                                {' · '}
                                {t.opportunity.client.name}
                              </span>
                            </span>
                            {t.dueDate && (
                              <span
                                className={`shrink-0 ${overdue ? 'font-medium text-destructive' : 'text-muted-foreground'}`}
                              >
                                {format(new Date(t.dueDate), 'dd MMM', { locale: es })}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="mt-auto flex items-center justify-end pt-2">
                <Button asChild variant="ghost" size="sm" className="-mr-2">
                  <Link href={`/projects/${p.id}`}>
                    Ver proyecto <ArrowRight className="ml-1.5 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
