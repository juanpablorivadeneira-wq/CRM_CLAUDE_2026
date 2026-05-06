import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeft, MapPin, Building2, Pencil, Hammer,
  Users, TrendingUp, Bot, DollarSign, Settings,
} from 'lucide-react';

const LINE_LABELS = {
  real_estate: 'Inmobiliaria',
  design: 'Diseño',
  construction: 'Construcción',
} as const;

const LINE_ICONS = {
  real_estate: Building2,
  design: Pencil,
  construction: Hammer,
} as const;

const STATUS_LABELS = {
  active: 'Activo',
  paused: 'En pausa',
  sold_out: 'Agotado',
  cancelled: 'Cancelado',
} as const;

const AI_MODE_LABELS = {
  off: 'Desactivado',
  assistant: 'Asistente',
  copilot: 'Co-piloto',
  supervised: 'Autónomo supervisado',
  autonomous: 'Autónomo total',
} as const;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const canEdit = await hasPermission(ctx.userId, 'projects', 'editar');

  const project = await db.project.findUnique({
    where: { id },
    include: {
      projectType: { include: { stages: { orderBy: { order: 'asc' } } } },
      _count: { select: { opportunities: true } },
    },
  });

  if (!project || project.orgId !== ctx.orgId) notFound();

  const stageCounts = await db.opportunity.groupBy({
    by: ['stageId'],
    where: { projectId: project.id, deletedAt: null },
    _count: true,
  });
  const countByStage = new Map(stageCounts.map((s) => [s.stageId, s._count]));

  const openValue = await db.opportunity.aggregate({
    where: { projectId: project.id, status: 'open', deletedAt: null },
    _sum: { estimatedValue: true },
  });

  const projectOpportunities = await db.opportunity.findMany({
    where: { projectId: project.id, deletedAt: null },
    include: {
      client: { select: { id: true, name: true, email: true, phone: true } },
      stage: { select: { id: true, name: true, isWon: true, isLost: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  type ClientGroup = {
    client: (typeof projectOpportunities)[number]['client'];
    count: number;
    totalValue: number;
    latestStage: (typeof projectOpportunities)[number]['stage'];
  };
  const clientsMap = new Map<string, ClientGroup>();
  for (const opp of projectOpportunities) {
    const existing = clientsMap.get(opp.clientId);
    const oppValue = Number(opp.estimatedValue ?? 0);
    if (existing) {
      existing.count += 1;
      existing.totalValue += oppValue;
    } else {
      clientsMap.set(opp.clientId, {
        client: opp.client,
        count: 1,
        totalValue: oppValue,
        latestStage: opp.stage,
      });
    }
  }
  const projectClients = Array.from(clientsMap.values());

  const Icon = LINE_ICONS[project.businessLine];

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" /> Proyectos
          </Link>
        </Button>
      </div>

      <PageHeader title={project.name} description={project.description ?? 'Sin descripción.'}>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{LINE_LABELS[project.businessLine]}</Badge>
          <Badge>{STATUS_LABELS[project.status]}</Badge>
          {canEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="outline" size="sm" disabled>
                    <Settings className="mr-2 h-4 w-4" /> Editar
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edición de proyecto disponible próximamente.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project._count.opportunities}</div>
            <p className="text-xs text-muted-foreground">Total registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline abierto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(openValue._sum.estimatedValue ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Valor estimado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio referencial</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.referencePrice ? `$${project.referencePrice.toLocaleString()}` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Por unidad/proyecto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modo IA</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{AI_MODE_LABELS[project.aiMode]}</div>
            <p className="text-xs text-muted-foreground">
              {project.aiMode === 'off' ? 'Activable cuando esté disponible' : 'Activo'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <Icon className="h-5 w-5" /> Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">Tipo:</span>{' '}
              <Link
                href={`/settings/project-types/${project.projectTypeId}`}
                className="text-primary hover:underline"
              >
                {project.projectType.name}
              </Link>
            </div>
            {project.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span>{project.address}</span>
              </div>
            )}
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
          </CardContent>
        </Card>

        {project.imageUrl && (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <Image src={project.imageUrl} alt={project.name} fill className="object-cover" sizes="33vw" />
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Distribución del pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {project.projectType.stages.map((stage) => {
              const count = countByStage.get(stage.id) ?? 0;
              const max = Math.max(...stageCounts.map((s) => s._count), 1);
              const width = (count / max) * 100;
              return (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className="w-48 truncate text-sm">
                    {stage.name}
                    {stage.isWon && <Badge className="ml-2 bg-green-600 text-xs">Ganada</Badge>}
                    {stage.isLost && <Badge variant="destructive" className="ml-2 text-xs">Perdida</Badge>}
                  </div>
                  <div className="flex-1 bg-muted h-6 rounded overflow-hidden">
                    <div className="h-full bg-primary/60 transition-all" style={{ width: `${width}%` }} />
                  </div>
                  <div className="w-16 text-right text-sm font-medium">{count}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-headline flex items-center gap-2">
            <Users className="h-5 w-5" /> Clientes en este proyecto
          </CardTitle>
          <Badge variant="outline">{projectClients.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {projectClients.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Aún no hay clientes con oportunidades en este proyecto.
            </p>
          ) : (
            <div className="divide-y">
              {projectClients.map(({ client, count, totalValue, latestStage }) => (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {count} {count === 1 ? 'oportunidad' : 'oportunidades'}
                      {client.email && ` · ${client.email}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant={latestStage.isWon ? 'default' : latestStage.isLost ? 'destructive' : 'outline'}
                      className={latestStage.isWon ? 'bg-green-600' : ''}
                    >
                      {latestStage.name}
                    </Badge>
                    <div className="text-right w-28">
                      <div className="text-sm font-medium">
                        ${totalValue.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">valor total</div>
                    </div>
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
