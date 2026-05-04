'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { exportToExcel } from '@/lib/exports/excel';

const ORIGIN_LABELS: Record<string, string> = {
  meta_ads: 'Meta Ads',
  web_form: 'Formulario web',
  referral: 'Referido',
  trade_show: 'Feria',
  cold_call: 'Llamada en frío',
  whatsapp_inbound: 'WhatsApp',
  walk_in: 'Visita espontánea',
  other: 'Otro',
};

type Row = { origin: string; total: number; won: number; conversion: number };

export function OriginsTable({ rows }: { rows: Row[] }) {
  function handleExport() {
    exportToExcel(
      rows.map((r) => ({
        Origen: ORIGIN_LABELS[r.origin] ?? r.origin,
        Oportunidades: r.total,
        Ganadas: r.won,
        'Conversión %': r.conversion.toFixed(1),
      })),
      `origenes-${new Date().toISOString().split('T')[0]}`,
      'Origenes',
    );
  }

  const totalAll = rows.reduce((s, r) => s + r.total, 0);
  const maxTotal = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-medium">Origen de leads</h3>
          <p className="text-sm text-muted-foreground">
            Distribución y conversión por canal de captación.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Excel
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Origen</TableHead>
            <TableHead className="text-right">Oportunidades</TableHead>
            <TableHead className="text-right">% del total</TableHead>
            <TableHead className="text-right">Ganadas</TableHead>
            <TableHead className="text-right">Conversión</TableHead>
            <TableHead>Distribución</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                Sin datos para mostrar.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.origin}>
                <TableCell className="font-medium">
                  {ORIGIN_LABELS[r.origin] ?? r.origin}
                </TableCell>
                <TableCell className="text-right">{r.total}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {((r.total / totalAll) * 100).toFixed(1)}%
                </TableCell>
                <TableCell className="text-right text-green-700">{r.won}</TableCell>
                <TableCell className="text-right">{r.conversion.toFixed(1)}%</TableCell>
                <TableCell className="w-[200px]">
                  <div className="bg-muted h-3 rounded overflow-hidden">
                    <div
                      className="h-full bg-primary/60"
                      style={{ width: `${(r.total / maxTotal) * 100}%` }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
