import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default async function SuperAdminPage() {
  const ctx = await getTenantContext();
  if (!ctx.isSuperAdmin) redirect('/dashboard');

  const [orgs, totalUsers, totalOpportunities, recentOrgs] = await Promise.all([
    db.organization.count(),
    db.user.count(),
    db.opportunity.count(),
    db.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        _count: { select: { users: true, projects: true, opportunities: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Super Admin"
        description="Vista global del SaaS BK-CRM. Solo accesible para la organización 'system'."
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organizaciones</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgs}</div>
            <p className="text-xs text-muted-foreground">Total registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">En todas las orgs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpportunities}</div>
            <p className="text-xs text-muted-foreground">Pipeline global</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Organizaciones recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentOrgs.map((o) => (
              <Link
                key={o.id}
                href={`/super-admin/orgs/${o.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{o.name}</p>
                    <Badge variant="outline" className="text-xs">/{o.slug}</Badge>
                    <Badge
                      variant={
                        o.status === 'active' ? 'default' : o.status === 'suspended' ? 'destructive' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {o.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Plan {o.plan} · {o._count.users} usuarios · {o._count.projects} proyectos · {o._count.opportunities} oportunidades
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Creada {o.createdAt.toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
