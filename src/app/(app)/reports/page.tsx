import { getTenantContext } from '@/lib/tenant';
import {
  getForecast,
  getSalespersonProductivity,
  getLeadOrigins,
  getLossAnalysis,
} from '@/lib/analytics';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ForecastTable } from './_components/forecast-table';
import { ProductivityTable } from './_components/productivity-table';
import { OriginsTable } from './_components/origins-table';
import { LossTable } from './_components/loss-table';
import { ReportsProjectFilter } from './_components/reports-project-filter';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; tab?: string }>;
}) {
  const ctx = await getTenantContext();
  const sp = (await searchParams) ?? {};
  const projectId = sp.projectId;

  const [forecast, productivity, origins, loss, projects] = await Promise.all([
    getForecast(ctx.orgId, projectId),
    getSalespersonProductivity(ctx.orgId, projectId),
    getLeadOrigins(ctx.orgId, projectId),
    getLossAnalysis(ctx.orgId, projectId),
    db.project.findMany({
      where: { orgId: ctx.orgId, deletedAt: null, status: 'active' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Forecast, productividad, origen de leads y análisis de pérdida."
      >
        <ReportsProjectFilter projects={projects} selectedId={projectId} />
      </PageHeader>

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
