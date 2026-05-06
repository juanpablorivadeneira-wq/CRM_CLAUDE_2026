import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { PipelineBoard } from '../../../pipeline/_components/pipeline-board';
import { NewOpportunityDialog } from '../../../pipeline/_components/new-opportunity-dialog';
import { ExportPipelineButton } from '../../../pipeline/_components/export-pipeline-button';

export default async function ProjectPipelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();

  const project = await db.project.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
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
  });
  if (!project) notFound();

  const [canCreate, canExport, opportunities, clients, users] = await Promise.all([
    hasPermission(ctx.userId, 'opportunities', 'crear'),
    hasPermission(ctx.userId, 'opportunities', 'exportar'),
    db.opportunity.findMany({
      where: { projectId: project.id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, type: true } },
        stage: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
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
      <PageHeader
        title="Pipeline del proyecto"
        description="Oportunidades por etapa, drag-and-drop para mover."
      >
        <div className="flex items-center gap-2">
          {canExport && opportunities.length > 0 && (
            <ExportPipelineButton
              projectName={project.name}
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
          {canCreate && (
            <NewOpportunityDialog
              clients={clients}
              projects={[
                {
                  id: project.id,
                  name: project.name,
                  projectType: {
                    id: project.projectType.id,
                    customFields: project.projectType.customFields as any,
                  },
                },
              ]}
              users={users}
              defaultProjectId={project.id}
            />
          )}
        </div>
      </PageHeader>

      <PipelineBoard
        stages={project.projectType.stages}
        opportunities={opportunities.map((o) => ({
          id: o.id,
          stageId: o.stageId,
          estimatedValue: o.estimatedValue,
          unitDetail: o.unitDetail,
          client: o.client,
        }))}
      />
    </>
  );
}
