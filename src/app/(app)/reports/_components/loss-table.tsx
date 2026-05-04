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

type Row = { reason: string; count: number; value: number };

export function LossTable({ rows }: { rows: Row[] }) {
  function handleExport() {
    exportToExcel(
      rows.map((r) => ({
        Motivo: r.reason,
        'Cantidad': r.count,
        'Valor perdido': r.value,
      })),
      `perdidas-${new Date().toISOString().split('T')[0]}`,
      'Pérdidas',
    );
  }

  const totalLost = rows.reduce((s, r) => s + r.value, 0);
  const totalCount = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-medium">Análisis de pérdida</h3>
          <p className="text-sm text-muted-foreground">
            {totalCount} oportunidades perdidas · ${totalLost.toLocaleString()} en valor.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Excel
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">% del total</TableHead>
            <TableHead className="text-right">Valor perdido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                Sin oportunidades perdidas registradas. ¡Bien por el equipo!
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.reason}>
                <TableCell className="font-medium">{r.reason}</TableCell>
                <TableCell className="text-right">{r.count}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {totalCount > 0 ? ((r.count / totalCount) * 100).toFixed(1) : '0'}%
                </TableCell>
                <TableCell className="text-right">${r.value.toLocaleString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
