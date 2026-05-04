import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { hasPermission } from '@/lib/permissions';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { StagesEditor } from './_components/stages-editor';
import { CustomFieldsEditor } from './_components/custom-fields-editor';

const LINE_LABELS = {
  real_estate: 'Inmobiliaria',
  design: 'Diseño',
  construction: 'Construcción',
} as const;

export default async function ProjectTypeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();
  const canEdit = await hasPermission(ctx.userId, 'project_types', 'editar');

  const projectType = await db.projectType.findUnique({
    where: { id },
    include: {
      stages: { orderBy: { order: 'asc' } },
      _count: { select: { projects: true } },
    },
  });

  if (!projectType || projectType.orgId !== ctx.orgId) notFound();

  return (
    <>
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings/project-types">
            <ArrowLeft className="mr-2 h-4 w-4" /> Tipos de proyecto
          </Link>
        </Button>
      </div>

      <PageHeader
        title={projectType.name}
        description={projectType.description ?? 'Sin descripción.'}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline">{LINE_LABELS[projectType.businessLine]}</Badge>
          {projectType.isSystem && <Badge variant="secondary">Sistema</Badge>}
          <Badge>{projectType._count.projects} proyectos</Badge>
        </div>
      </PageHeader>

      <Tabs defaultValue="stages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stages">Etapas del embudo</TabsTrigger>
          <TabsTrigger value="fields">Campos personalizados</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
        </TabsList>

        <TabsContent value="stages">
          <Card>
            <CardContent className="p-6">
              <StagesEditor
                projectTypeId={projectType.id}
                stages={projectType.stages}
                readOnly={!canEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields">
          <Card>
            <CardContent className="p-6">
              <CustomFieldsEditor
                projectTypeId={projectType.id}
                initialFields={(projectType.customFields as any) ?? []}
                readOnly={!canEdit}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardContent className="p-6 space-y-3 text-sm">
              <div><span className="text-muted-foreground">Nombre:</span> {projectType.name}</div>
              <div><span className="text-muted-foreground">Línea de negocio:</span> {LINE_LABELS[projectType.businessLine]}</div>
              <div><span className="text-muted-foreground">Descripción:</span> {projectType.description ?? '—'}</div>
              <div><span className="text-muted-foreground">Tipo del sistema:</span> {projectType.isSystem ? 'Sí' : 'No'}</div>
              <div><span className="text-muted-foreground">Proyectos asociados:</span> {projectType._count.projects}</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
