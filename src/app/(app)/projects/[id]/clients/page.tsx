import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ClientsTable } from '../../../clients/_components/clients-table';

export default async function ProjectClientsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();

  const project = await db.project.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) notFound();

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
      />

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
