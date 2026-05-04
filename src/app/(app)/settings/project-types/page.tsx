import Link from 'next/link';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Pencil, Hammer, ArrowRight } from 'lucide-react';
import { CreateProjectTypeDialog } from './_components/create-project-type-dialog';

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

export default async function ProjectTypesPage() {
  const ctx = await getTenantContext();
  const canCreate = await hasPermission(ctx.userId, 'project_types', 'crear');

  const types = await db.projectType.findMany({
    where: { orgId: ctx.orgId, isActive: true },
    include: {
      _count: { select: { projects: true, stages: true } },
    },
    orderBy: [{ businessLine: 'asc' }, { name: 'asc' }],
  });

  return (
    <>
      <PageHeader
        title="Tipos de proyecto"
        description="Define la línea de negocio, embudo y campos personalizados para cada tipo de venta."
      >
        {canCreate && <CreateProjectTypeDialog />}
      </PageHeader>

      {types.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p>Aún no tienes tipos de proyecto. Crea el primero para empezar.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => {
            const Icon = LINE_ICONS[t.businessLine];
            return (
              <Link key={t.id} href={`/settings/project-types/${t.id}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-headline font-semibold">{t.name}</h3>
                          <Badge variant="outline" className="text-xs mt-1">
                            {LINE_LABELS[t.businessLine]}
                          </Badge>
                          {t.isSystem && (
                            <Badge variant="secondary" className="text-xs ml-1">Sistema</Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {t.description && (
                      <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                    )}
                    <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                      <span>{t._count.stages} etapas</span>
                      <span>·</span>
                      <span>{t._count.projects} proyectos</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
