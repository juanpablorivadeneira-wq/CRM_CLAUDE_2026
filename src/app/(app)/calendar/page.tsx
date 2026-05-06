import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTenantContext } from '@/lib/tenant';

export default async function CalendarPage() {
  await getTenantContext();
  return (
    <>
      <PageHeader
        title="Calendario"
        description="Citas, visitas y bloqueos de los vendedores."
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
              Pronto podrás coordinar visitas, llamadas y reuniones con tus
              vendedores desde aquí, con sincronización a Google Calendar y
              recordatorios automáticos por WhatsApp.
            </p>
          </div>
          <ul className="mt-2 space-y-1 text-left text-xs text-muted-foreground">
            <li>· Disponibilidad por vendedor</li>
            <li>· Citas vinculadas a oportunidades y clientes</li>
            <li>· Sync bidireccional con Google Calendar</li>
            <li>· Recordatorios y confirmaciones automáticas</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
