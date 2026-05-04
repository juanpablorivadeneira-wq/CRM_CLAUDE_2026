'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Building, User, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ORIGIN_LABELS = {
  meta_ads: 'Meta Ads',
  web_form: 'Formulario web',
  referral: 'Referido',
  trade_show: 'Feria',
  cold_call: 'Llamada en frío',
  whatsapp_inbound: 'WhatsApp',
  walk_in: 'Visita espontánea',
  other: 'Otro',
} as const;

type ClientRow = {
  id: string;
  type: 'person' | 'company';
  name: string;
  email: string | null;
  phone: string | null;
  ci: string | null;
  ruc: string | null;
  city: string | null;
  origin: keyof typeof ORIGIN_LABELS;
  createdAt: Date;
  _count: { opportunities: number };
};

export function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [search, setSearch] = useState('');
  const [originFilter, setOriginFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return clients.filter((c) => {
      if (originFilter !== 'all' && c.origin !== originFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.ci?.includes(q) ||
        c.ruc?.includes(q)
      );
    });
  }, [clients, search, originFilter]);

  return (
    <div>
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono, CI o RUC..."
            className="pl-9"
          />
        </div>
        <Select value={originFilter} onValueChange={setOriginFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Origen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los orígenes</SelectItem>
            {Object.entries(ORIGIN_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} de {clients.length}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead>Identificación</TableHead>
            <TableHead>Ciudad</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead className="text-center">Oportunidades</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                {clients.length === 0 ? 'Aún no hay clientes registrados.' : 'Sin resultados con esos filtros.'}
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40">
                <TableCell>
                  <div className="rounded-full bg-muted p-2">
                    {c.type === 'company' ? (
                      <Building className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/clients/${c.id}`} className="hover:text-primary hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm">
                    {c.email && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="h-3 w-3" /> {c.email}
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {c.ruc && <div className="font-mono text-xs">RUC: {c.ruc}</div>}
                  {c.ci && <div className="font-mono text-xs">CI: {c.ci}</div>}
                  {!c.ci && !c.ruc && <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.city ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {ORIGIN_LABELS[c.origin]}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={c._count.opportunities > 0 ? 'default' : 'secondary'}>
                    {c._count.opportunities}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
