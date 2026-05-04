import { PageHeader } from '@/components/page-header';
import { getTenantContext, getCurrentOrg } from '@/lib/tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function GeneralSettingsPage() {
  const ctx = await getTenantContext();
  const org = await getCurrentOrg(ctx.orgId);
  return (
    <>
      <PageHeader title="Configuración general" description="Branding, idioma, zona horaria y datos de la organización." />
      <Card>
        <CardHeader><CardTitle>Datos de la organización</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Nombre:</span> {org?.name}</div>
          <div><span className="text-muted-foreground">Slug:</span> {org?.slug}</div>
          <div><span className="text-muted-foreground">Plan:</span> {org?.plan}</div>
          <div><span className="text-muted-foreground">Locale:</span> {org?.locale}</div>
          <div><span className="text-muted-foreground">Timezone:</span> {org?.timezone}</div>
        </CardContent>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">Edición disponible en Fase 2.</p>
    </>
  );
}
