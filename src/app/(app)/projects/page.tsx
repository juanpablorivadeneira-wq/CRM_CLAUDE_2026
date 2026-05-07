import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Pencil, Hammer, MapPin, ArrowRight } from 'lucide-react';
import { ProjectFormDialog } from './_components/project-form-dialog';

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

const STATUS_LABELS = {
  active: 'Activo',
  paused: 'En pausa',
  sold_out: 'Agotado',
  cancelled: 'Cancelado',
} as const;

const STATUS_VARIANTS = {
  active: 'default',
  paused: 'secondary',
  sold_out: 'outline',
  cancelled: 'destructive',
} as const;

export default async function ProjectsPage() {
  const ctx = await getTenantContext();
  const canCreate = await hasPermission(ctx.userId, 'projects', 'crear');

  const [projects, projectTypes, org] = await Promise.all([
    db.project.findMany({
      where: { orgId: ctx.orgId, deletedAt: null },
      include: {
        projectType: { select: { name: true } },
        _count: { select: { opportunities: true } },
      },
      orderBy: [{ businessLine: 'asc' }, { createdAt: 'desc' }],
    }),
    db.projectType.findMany({
      where: { orgId: ctx.orgId, isActive: true },
      orderBy: { name: 'asc' },
    }),
    db.organization.findUnique({ where: { id: ctx.orgId } }),
  ]);

  return (
    <>
      <PageHeader
        title="Proyectos"
        description={`${projects.length} de ${org?.maxProjects ?? 0} proyectos del plan ${org?.plan ?? ''}.`}
      >
        {canCreate && projectTypes.length > 0 && (
          <ProjectFormDialog mode="create" projectTypes={projectTypes} />
        )}
      </PageHeader>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            Aún no tienes proyectos.{' '}
            {projectTypes.length === 0 ? (
              <>
                Primero crea un{' '}
                <Link href="/settings/project-types" className="text-primary hover:underline">
                  tipo de proyecto
                </Link>
                .
              </>
            ) : (
              'Crea el primero arriba.'
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const Icon = LINE_ICONS[p.businessLine];
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="h-full overflow-hidden transition-colors hover:border-primary">
                  {p.imageUrl ? (
                    <div className="relative aspect-video w-full bg-muted">
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-muted">
                      <Icon className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant={STATUS_VARIANTS[p.status] as any}>
                        {STATUS_LABELS[p.status]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {LINE_LABELS[p.businessLine]}
                      </Badge>
                    </div>
                    <h3 className="font-headline font-semibold text-lg flex items-center gap-2">
                      {p.name}
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{p.projectType.name}</p>
                    {p.address && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {p.address}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between text-sm">
                      {p.referencePrice ? (
                        <span className="font-medium">
                          ${p.referencePrice.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sin precio referencia</span>
                      )}
                      <span className="text-muted-foreground text-xs">
                        {p._count.opportunities} oportunidades
                      </span>
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
