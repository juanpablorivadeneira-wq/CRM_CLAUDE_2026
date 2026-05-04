import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { InviteUserDialog } from './_components/invite-user-dialog';
import { UserRowActions } from './_components/user-row-actions';

export default async function UsersPage() {
  const ctx = await getTenantContext();
  const canCreate = await hasPermission(ctx.userId, 'users', 'crear');
  const canEdit = await hasPermission(ctx.userId, 'users', 'editar');

  const [users, roles, projects, org] = await Promise.all([
    db.user.findMany({
      where: { orgId: ctx.orgId },
      include: { assignments: { include: { role: true, project: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    db.role.findMany({ where: { orgId: ctx.orgId }, orderBy: { name: 'asc' } }),
    db.project.findMany({
      where: { orgId: ctx.orgId, deletedAt: null },
      orderBy: { name: 'asc' },
    }),
    db.organization.findUnique({ where: { id: ctx.orgId } }),
  ]);

  return (
    <>
      <PageHeader
        title="Usuarios"
        description={`${users.length} de ${org?.maxUsers ?? 0} usuarios del plan ${org?.plan ?? ''}.`}
      >
        {canCreate && <InviteUserDialog roles={roles} projects={projects} />}
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Último acceso</TableHead>
                {canEdit && <TableHead className="w-[80px] text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    {u.assignments.length > 0
                      ? u.assignments.map((a) => a.role.name).join(', ')
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {u.assignments.length > 0
                      ? u.assignments.map((a) => a.project.name).join(', ')
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                      {u.status === 'active' ? 'Activo' : u.status === 'inactive' ? 'Inactivo' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.twoFactorEnabled
                      ? <Badge variant="default" className="bg-green-600">Activo</Badge>
                      : <Badge variant="outline">No</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.lastLoginAt ? format(u.lastLoginAt, 'dd MMM yyyy HH:mm') : 'Nunca'}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <UserRowActions
                        userId={u.id}
                        status={u.status}
                        isSelf={u.id === ctx.userId}
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
