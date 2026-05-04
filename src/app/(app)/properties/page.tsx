import { getSession } from '@/lib/session';
import { PageHeader } from '@/components/page-header';

export default async function PropertiesPage() {
  await getSession();
  return (
    <>
      <PageHeader title="Propiedades" description="Catálogo de propiedades por proyecto." />
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        <p className="text-sm">Propiedades — disponible en Fase 1.</p>
      </div>
    </>
  );
}
