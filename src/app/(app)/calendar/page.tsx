import { PageHeader } from '@/components/page-header';
import { getTenantContext } from '@/lib/tenant';

export default async function CalendarPage() {
  await getTenantContext();
  return (
    <>
      <PageHeader title="Calendario" description="Citas, visitas y bloqueos de los vendedores." />
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p className="text-sm">Calendario — disponible en Fase 5.</p>
      </div>
    </>
  );
}
