import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import {
  getForecast,
  getSalespersonProductivity,
  getLeadOrigins,
  getLossAnalysis,
} from '@/lib/analytics';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ForecastTable } from '../../../reports/_components/forecast-table';
import { ProductivityTable } from '../../../reports/_components/productivity-table';
import { OriginsTable } from '../../../reports/_components/origins-table';
import { LossTable } from '../../../reports/_components/loss-table';

export default async function ProjectReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const ctx = await getTenantContext();

  const project = await db.project.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!project) notFound();

  const [forecast, productivity, origins, loss] = await Promise.all([
    getForecast(ctx.orgId, project.id),
    getSalespersonProductivity(ctx.orgId, project.id),
    getLeadOrigins(ctx.orgId, project.id),
    getLossAnalysis(ctx.orgId, project.id),
  ]);

  return (
    <>
      <PageHeader
        title="Reportes del proyecto"
        description="Forecast, productividad, origen de leads y análisis de pérdida."
      />

      <Tabs defaultValue={sp.tab ?? 'forecast'} className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="productivity">Productividad</TabsTrigger>
          <TabsTrigger value="origins">Origen</TabsTrigger>
          <TabsTrigger value="loss">Pérdidas</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast">
          <Card>
            <CardContent className="p-0">
              <ForecastTable forecast={forecast} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="productivity">
          <Card>
            <CardContent className="p-0">
              <ProductivityTable rows={productivity} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="origins">
          <Card>
            <CardContent className="p-0">
              <OriginsTable rows={origins} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loss">
          <Card>
            <CardContent className="p-0">
              <LossTable rows={loss} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
