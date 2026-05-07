import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { ClientsTable } from './_components/clients-table';
import { CreateClientDialog } from './_components/create-client-dialog';
import { ExportClientsButton } from './_components/export-clients-button';
import { ImportClientsDialog } from './_components/import-clients-dialog';

export default async function ClientsPage() {
  const ctx = await getTenantContext();
  const [canCreate, canExport] = await Promise.all([
    hasPermission(ctx.userId, 'clients', 'crear'),
    hasPermission(ctx.userId, 'clients', 'exportar'),
  ]);

  const clients = await db.client.findMany({
    where: { orgId: ctx.orgId, deletedAt: null },
    include: {
      _count: { select: { opportunities: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <>
      <PageHeader title="Clientes" description="Directorio unificado de personas y empresas.">
        <div className="flex items-center gap-2">
          {canExport && <ExportClientsButton clients={clients} />}
          {canCreate && <ImportClientsDialog />}
          {canCreate && <CreateClientDialog />}
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <ClientsTable clients={clients} />
        </CardContent>
      </Card>
    </>
  );
}
