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

type Row = {
  userId: string;
  name: string;
  total: number;
  won: number;
  lost: number;
  openValue: number;
  wonValue: number;
  conversion: number;
  avgTicket: number;
  avgCycleDays: number;
};

export function ProductivityTable({ rows }: { rows: Row[] }) {
  function handleExport() {
    exportToExcel(
      rows.map((r) => ({
        Vendedor: r.name,
        Total: r.total,
        Ganadas: r.won,
        Perdidas: r.lost,
        'Conversión %': r.conversion.toFixed(1),
        'Pipeline abierto': r.openValue,
        'Ventas cerradas': r.wonValue,
        'Ticket promedio': Math.round(r.avgTicket),
        'Ciclo promedio (días)': Math.round(r.avgCycleDays),
      })),
      `productividad-${new Date().toISOString().split('T')[0]}`,
      'Productividad',
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-medium">Productividad por vendedor</h3>
          <p className="text-sm text-muted-foreground">
            Métricas históricas de cada miembro del equipo comercial.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Excel
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendedor</TableHead>
            <TableHead className="text-right">Oportunidades</TableHead>
            <TableHead className="text-right">Ganadas</TableHead>
            <TableHead className="text-right">Perdidas</TableHead>
            <TableHead className="text-right">Conversión</TableHead>
            <TableHead className="text-right">Pipeline</TableHead>
            <TableHead className="text-right">Cerrado</TableHead>
            <TableHead className="text-right">Ticket</TableHead>
            <TableHead className="text-right">Ciclo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                Sin oportunidades con vendedor asignado.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.userId}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-right">{r.total}</TableCell>
                <TableCell className="text-right text-green-700">{r.won}</TableCell>
                <TableCell className="text-right text-destructive">{r.lost}</TableCell>
                <TableCell className="text-right">{r.conversion.toFixed(1)}%</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  ${r.openValue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${r.wonValue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  ${Math.round(r.avgTicket).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {r.avgCycleDays > 0 ? `${Math.round(r.avgCycleDays)} d` : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
