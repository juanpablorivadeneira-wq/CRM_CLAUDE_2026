'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

type Client = {
  id: string;
  type: 'person' | 'company';
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  ci: string | null;
  ruc: string | null;
  city: string | null;
  origin: string;
  createdAt: Date;
  _count: { opportunities: number };
};

export function ExportClientsButton({ clients }: { clients: Client[] }) {
  function handleExport() {
    exportToExcel(
      clients.map((c) => ({
        Tipo: c.type === 'company' ? 'Empresa' : 'Persona',
        Nombre: c.name,
        CI: c.ci ?? '',
        RUC: c.ruc ?? '',
        Email: c.email ?? '',
        Teléfono: c.phone ?? '',
        WhatsApp: c.whatsapp ?? '',
        Ciudad: c.city ?? '',
        Origen: ORIGIN_LABELS[c.origin] ?? c.origin,
        Oportunidades: c._count.opportunities,
        'Fecha de registro': c.createdAt.toISOString().split('T')[0],
      })),
      `clientes-${new Date().toISOString().split('T')[0]}`,
      'Clientes',
    );
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={clients.length === 0}>
      <Download className="mr-2 h-4 w-4" /> Excel
    </Button>
  );
}
