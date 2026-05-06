import { notFound } from 'next/navigation';
import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function ProjectCalendarPage({
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

  return (
    <>
      <PageHeader
        title="Calendario"
        description={`Citas y bloqueos vinculados a ${project.name}.`}
      >
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" /> Próximamente
        </Badge>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <CalendarIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="max-w-md space-y-2">
            <h3 className="font-headline text-lg font-semibold">
              Agenda integrada en construcción
            </h3>
            <p className="text-sm text-muted-foreground">
              Pronto verás aquí las visitas, llamadas y reuniones de las
              oportunidades de {project.name}, con sincronización a Google
              Calendar y recordatorios automáticos por WhatsApp.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
