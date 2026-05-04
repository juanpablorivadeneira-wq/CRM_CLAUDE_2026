import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission, MODULES } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { PermissionsMatrix } from './_components/permissions-matrix';

export default async function RolesPage() {
  const ctx = await getTenantContext();
  const canEdit = await hasPermission(ctx.userId, 'roles', 'editar');

  const roles = await db.role.findMany({
    where: { orgId: ctx.orgId },
    include: { permissions: true },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });

  return (
    <>
      <PageHeader
        title="Roles y permisos"
        description="Define qué puede hacer cada rol en cada módulo del sistema."
      />

      <Card>
        <CardContent className="p-0">
          <PermissionsMatrix
            roles={roles.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
              isSystem: r.isSystem,
              permissions: r.permissions.map((p) => ({ module: p.module, action: p.action })),
            }))}
            modules={MODULES}
            readOnly={!canEdit}
          />
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Acciones disponibles por módulo: <span className="font-mono">ver · crear · editar · eliminar · aprobar · exportar</span>.
        Los roles del sistema (Superadmin, Gerente Comercial, Vendedor) son editables pero no se pueden eliminar.
      </p>
    </>
  );
}
