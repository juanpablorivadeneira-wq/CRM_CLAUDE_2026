import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { redirect, notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) redirect('/dashboard');
  const { id } = await params;
  const org = await db.organization.findUnique({
    where: { id },
    include: { _count: { select: { users: true, projects: true, opportunities: true, clients: true } } },
  });
  if (!org) notFound();

  return (
    <>
      <PageHeader title={org.name} description={`Organización /${org.slug}`}>
        <Badge>{org.plan}</Badge>
      </PageHeader>
      <Card>
        <CardHeader><CardTitle>Resumen</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-muted-foreground">Usuarios</div><div className="text-2xl font-bold">{org._count.users}</div></div>
          <div><div className="text-muted-foreground">Proyectos</div><div className="text-2xl font-bold">{org._count.projects}</div></div>
          <div><div className="text-muted-foreground">Clientes</div><div className="text-2xl font-bold">{org._count.clients}</div></div>
          <div><div className="text-muted-foreground">Oportunidades</div><div className="text-2xl font-bold">{org._count.opportunities}</div></div>
        </CardContent>
      </Card>
    </>
  );
}
