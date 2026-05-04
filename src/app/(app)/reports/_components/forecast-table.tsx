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
  TableFooter,
} from '@/components/ui/table';
import { exportToExcel } from '@/lib/exports/excel';

type Forecast = {
  totalGross: number;
  totalWeighted: number;
  count: number;
  items: {
    id: string;
    clientName: string;
    projectName: string;
    stageName: string;
    probability: number;
    value: number;
    weighted: number;
  }[];
};

export function ForecastTable({ forecast }: { forecast: Forecast }) {
  function handleExport() {
    exportToExcel(
      forecast.items.map((i) => ({
        Cliente: i.clientName,
        Proyecto: i.projectName,
        Etapa: i.stageName,
        Probabilidad: `${i.probability}%`,
        Valor: i.value,
        Ponderado: Math.round(i.weighted),
      })),
      `forecast-${new Date().toISOString().split('T')[0]}`,
      'Forecast',
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-medium">Forecast de cierre</h3>
          <p className="text-sm text-muted-foreground">
            {forecast.count} oportunidades abiertas · Bruto ${forecast.totalGross.toLocaleString()} ·
            Ponderado <strong>${Math.round(forecast.totalWeighted).toLocaleString()}</strong>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={forecast.items.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Excel
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Proyecto</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead className="text-right">Probabilidad</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Ponderado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forecast.items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                Sin oportunidades abiertas con valor estimado.
              </TableCell>
            </TableRow>
          ) : (
            forecast.items.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.clientName}</TableCell>
                <TableCell>{i.projectName}</TableCell>
                <TableCell className="text-muted-foreground">{i.stageName}</TableCell>
                <TableCell className="text-right text-muted-foreground">{i.probability}%</TableCell>
                <TableCell className="text-right">${i.value.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">
                  ${Math.round(i.weighted).toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        {forecast.items.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} className="text-right font-medium">Totales</TableCell>
              <TableCell className="text-right">${forecast.totalGross.toLocaleString()}</TableCell>
              <TableCell className="text-right font-bold">
                ${Math.round(forecast.totalWeighted).toLocaleString()}
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
