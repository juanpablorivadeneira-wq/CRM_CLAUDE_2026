'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportToExcel } from '@/lib/exports/excel';

type Opp = {
  id: string;
  estimatedValue: number | null;
  unitDetail: string | null;
  stageName: string;
  stageProbability: number;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  status: string;
};

export function ExportPipelineButton({
  opportunities,
  projectName,
}: {
  opportunities: Opp[];
  projectName: string;
}) {
  function handleExport() {
    exportToExcel(
      opportunities.map((o) => ({
        Cliente: o.clientName,
        Email: o.clientEmail ?? '',
        Teléfono: o.clientPhone ?? '',
        Etapa: o.stageName,
        Probabilidad: `${o.stageProbability}%`,
        Estado: o.status,
        Unidad: o.unitDetail ?? '',
        Valor: o.estimatedValue ?? 0,
        Ponderado: Math.round((o.estimatedValue ?? 0) * (o.stageProbability / 100)),
      })),
      `pipeline-${projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}`,
      'Pipeline',
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={opportunities.length === 0}
    >
      <Download className="mr-2 h-4 w-4" /> Excel
    </Button>
  );
}
