import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Building,
  Mail,
  Phone,
  TrendingUp,
} from 'lucide-react';
import { OpportunityTimeline } from './_components/opportunity-timeline';
import { AddMessageDialog } from './_components/add-message-dialog';
import { AddTaskDialog } from './_components/add-task-dialog';
import { TasksList } from './_components/tasks-list';
import { StageActions } from './_components/stage-actions';

const STATUS_LABELS = {
  open: 'Abierta',
  won: 'Ganada',
  lost: 'Perdida',
  paused: 'En pausa',
} as const;

const STATUS_VARIANTS = {
  open: 'default',
  won: 'default',
  lost: 'destructive',
  paused: 'secondary',
} as const;

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const canEdit = await hasPermission(ctx.userId, 'opportunities', 'editar');

  const opp = await db.opportunity.findUnique({
    where: { id },
    include: {
      client: true,
      project: { include: { projectType: { include: { stages: { orderBy: { order: 'asc' } } } } } },
      stage: true,
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { sentBy: { select: { name: true } } },
      },
      tasks: {
        orderBy: [{ completedAt: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        include: { assignee: { select: { name: true } } },
      },
      appointments: {
        orderBy: { startsAt: 'desc' },
        take: 20,
        include: { vendor: { select: { name: true } } },
      },
      stageHistory: {
        orderBy: { movedAt: 'desc' },
      },
    },
  });

  if (!opp || opp.orgId !== ctx.orgId) notFound();

  const users = await db.user.findMany({
    where: { orgId: ctx.orgId, status: 'active' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const customFields = (opp.project.projectType.customFields as any[]) ?? [];
  const oppData = (opp.data as Record<string, any>) ?? {};

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Pipeline', href: '/pipeline' },
          { label: opp.client.name },
        ]}
      />

      <PageHeader
        title={opp.client.name}
        description={
          <span className="flex items-center gap-2 flex-wrap text-sm">
            <Link href={`/projects/${opp.projectId}`} className="text-primary hover:underline">
              {opp.project.name}
            </Link>
            {opp.unitDetail && <span className="text-muted-foreground">· {opp.unitDetail}</span>}
          </span>
        }
      >
        <div className="flex items-center gap-2">
          <Badge
            variant={opp.stage.isWon ? 'default' : opp.stage.isLost ? 'destructive' : 'outline'}
            className={opp.stage.isWon ? 'bg-green-600' : ''}
          >
            {opp.stage.name}
          </Badge>
          <Badge variant={STATUS_VARIANTS[opp.status] as any}>{STATUS_LABELS[opp.status]}</Badge>
          {canEdit && (
            <StageActions
              opportunityId={opp.id}
              currentStageId={opp.stageId}
              stages={opp.project.projectType.stages}
            />
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Sidebar — datos del cliente */}
        <div className="md:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-base flex items-center gap-2">
                {opp.client.type === 'company' ? (
                  <Building className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                href={`/clients/${opp.client.id}`}
                className="font-medium text-primary hover:underline block"
              >
                {opp.client.name}
              </Link>
              {opp.client.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {opp.client.email}
                </div>
              )}
              {opp.client.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {opp.client.phone}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Valor:</span>{' '}
                <span className="font-medium">
                  {opp.estimatedValue ? `$${opp.estimatedValue.toLocaleString()}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Probabilidad:</span>{' '}
                {opp.stage.probability}%
              </div>
              <div>
                <span className="text-muted-foreground">Creada:</span>{' '}
                {format(opp.createdAt, "dd MMM yyyy", { locale: es })}
              </div>
              {opp.wonAt && (
                <div>
                  <span className="text-muted-foreground">Ganada:</span>{' '}
                  {format(opp.wonAt, "dd MMM yyyy", { locale: es })}
                </div>
              )}
              {opp.lostReason && (
                <div className="text-destructive text-xs mt-2">
                  Motivo de pérdida: {opp.lostReason}
                </div>
              )}

              {customFields.length > 0 && (
                <>
                  <hr className="my-2" />
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Campos del tipo
                  </p>
                  {customFields.map((f: any) => (
                    <div key={f.key} className="text-xs">
                      <span className="text-muted-foreground">{f.label}:</span>{' '}
                      <span>{oppData[f.key] ?? '—'}</span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main — timeline + tabs */}
        <div className="md:col-span-2 space-y-4">
          <Tabs defaultValue="timeline">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <TabsList>
                <TabsTrigger value="timeline">
                  Actividad ({opp.messages.length + opp.appointments.length + opp.stageHistory.length})
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  Tareas ({opp.tasks.filter((t) => !t.completedAt).length})
                </TabsTrigger>
              </TabsList>
              {canEdit && (
                <div className="flex gap-2">
                  <AddMessageDialog opportunityId={opp.id} />
                  <AddTaskDialog opportunityId={opp.id} users={users} />
                </div>
              )}
            </div>

            <TabsContent value="timeline" className="mt-4">
              <OpportunityTimeline
                messages={opp.messages.map((m) => ({
                  id: m.id,
                  channel: m.channel,
                  direction: m.direction,
                  body: m.body,
                  subject: m.subject,
                  actorType: m.actorType,
                  sentByName: m.sentBy?.name ?? null,
                  createdAt: m.createdAt,
                }))}
                appointments={opp.appointments.map((a) => ({
                  id: a.id,
                  type: a.type,
                  status: a.status,
                  startsAt: a.startsAt,
                  vendorName: a.vendor.name,
                  notes: a.notes,
                }))}
                stageHistory={opp.stageHistory.map((h) => ({
                  id: h.id,
                  movedAt: h.movedAt,
                  fromStageId: h.fromStageId,
                  toStageId: h.toStageId,
                  note: h.note,
                  actorType: h.actorType,
                }))}
                stages={opp.project.projectType.stages.map((s) => ({ id: s.id, name: s.name }))}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <TasksList
                tasks={opp.tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  description: t.description,
                  dueDate: t.dueDate,
                  completedAt: t.completedAt,
                  assigneeName: t.assignee?.name ?? null,
                }))}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
