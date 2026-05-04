import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { PipelineBoard } from './_components/pipeline-board';
import { NewOpportunityDialog } from './_components/new-opportunity-dialog';
import { ProjectSelector } from './_components/project-selector';
import { ExportPipelineButton } from './_components/export-pipeline-button';

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const ctx = await getTenantContext();
  const sp = (await searchParams) ?? {};
  const [canCreate, canExport] = await Promise.all([
    hasPermission(ctx.userId, 'opportunities', 'crear'),
    hasPermission(ctx.userId, 'opportunities', 'exportar'),
  ]);

  const projects = await db.project.findMany({
    where: { orgId: ctx.orgId, deletedAt: null, status: 'active' },
    include: {
      projectType: {
        select: {
          id: true,
          name: true,
          customFields: true,
          stages: { orderBy: { order: 'asc' } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const selectedProjectId = sp.projectId ?? projects[0]?.id;
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const opportunities = selectedProject
    ? await db.opportunity.findMany({
        where: { projectId: selectedProject.id, deletedAt: null },
        include: {
          client: { select: { id: true, name: true, email: true, phone: true, type: true } },
          stage: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  const [clients, users] = await Promise.all([
    db.client.findMany({
      where: { orgId: ctx.orgId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.user.findMany({
      where: { orgId: ctx.orgId, status: 'active' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <>
      <PageHeader title="Pipeline" description="Tablero de oportunidades por etapa.">
        <div className="flex items-center gap-2">
          <ProjectSelector
            projects={projects.map((p) => ({ id: p.id, name: p.name, businessLine: p.businessLine }))}
            selectedId={selectedProjectId}
          />
          {canExport && selectedProject && opportunities.length > 0 && (
            <ExportPipelineButton
              projectName={selectedProject.name}
              opportunities={opportunities.map((o) => ({
                id: o.id,
                estimatedValue: o.estimatedValue,
                unitDetail: o.unitDetail,
                stageName: o.stage.name,
                stageProbability: o.stage.probability,
                clientName: o.client.name,
                clientEmail: o.client.email,
                clientPhone: o.client.phone,
                status: o.status,
              }))}
            />
          )}
          {canCreate && projects.length > 0 && (
            <NewOpportunityDialog
              clients={clients}
              projects={projects.map((p) => ({
                id: p.id,
                name: p.name,
                projectType: {
                  id: p.projectType.id,
                  customFields: p.projectType.customFields as any,
                },
              }))}
              users={users}
              defaultProjectId={selectedProjectId}
            />
          )}
        </div>
      </PageHeader>

      {!selectedProject ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p>Crea un proyecto primero para ver el pipeline.</p>
        </div>
      ) : (
        <PipelineBoard
          stages={selectedProject.projectType.stages}
          opportunities={opportunities.map((o) => ({
            id: o.id,
            stageId: o.stageId,
            estimatedValue: o.estimatedValue,
            unitDetail: o.unitDetail,
            client: o.client,
          }))}
        />
      )}
    </>
  );
}
