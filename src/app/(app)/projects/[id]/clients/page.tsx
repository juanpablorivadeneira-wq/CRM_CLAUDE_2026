import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ClientsTable } from '../../../clients/_components/clients-table';
import { FunnelImportDialog } from './_components/funnel-import-dialog';

type CustomField = { key: string; label: string };

export default async function ProjectClientsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const canImport = await hasPermission(ctx.userId, 'clients', 'crear');

  const project = await db.project.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    select: {
      id: true,
      name: true,
      projectType: { select: { customFields: true } },
    },
  });
  if (!project) notFound();

  const customFields: CustomField[] = (() => {
    const raw = project.projectType.customFields;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((f): f is { key: string; label: string } =>
        !!f && typeof f === 'object' && typeof (f as any).key === 'string' && typeof (f as any).label === 'string',
      )
      .map((f) => ({ key: f.key, label: f.label }));
  })();

  const clients = await db.client.findMany({
    where: {
      orgId: ctx.orgId,
      deletedAt: null,
      opportunities: {
        some: { projectId: project.id, deletedAt: null },
      },
    },
    include: {
      _count: {
        select: {
          opportunities: { where: { projectId: project.id, deletedAt: null } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHeader
        title="Clientes del proyecto"
        description="Personas y empresas con oportunidades activas en este proyecto."
      >
        {canImport && (
          <FunnelImportDialog
            projectId={project.id}
            projectName={project.name}
            customFields={customFields}
          />
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <p className="p-12 text-center text-sm text-muted-foreground">
              Aún no hay clientes con oportunidades en este proyecto.
            </p>
          ) : (
            <ClientsTable clients={clients} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
