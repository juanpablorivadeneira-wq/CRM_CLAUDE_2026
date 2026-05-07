'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, AlertCircle, FileSpreadsheet, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { importClientsAction, type ImportClientRow } from '../actions';

const TEMPLATE_HEADERS = [
  'name',
  'type',
  'ci',
  'ruc',
  'email',
  'phone',
  'whatsapp',
  'address',
  'city',
  'profession',
  'origin',
  'notes',
];

const ORIGIN_VALUES = new Set([
  'meta_ads', 'web_form', 'referral', 'trade_show',
  'cold_call', 'whatsapp_inbound', 'walk_in', 'other',
]);

function normalizeRow(raw: Record<string, any>): Partial<ImportClientRow> {
  const lower = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k.toString().trim().toLowerCase(), v]),
  );
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = lower[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
    }
    return undefined;
  };

  const typeRaw = get('type', 'tipo')?.toLowerCase();
  const type: ImportClientRow['type'] =
    typeRaw === 'company' || typeRaw === 'empresa' ? 'company' : 'person';

  const originRaw = get('origin', 'origen')?.toLowerCase();
  const origin: ImportClientRow['origin'] =
    originRaw && ORIGIN_VALUES.has(originRaw) ? (originRaw as ImportClientRow['origin']) : 'other';

  return {
    type,
    name: get('name', 'nombre') ?? '',
    ci: get('ci', 'cédula', 'cedula'),
    ruc: get('ruc'),
    email: get('email', 'correo'),
    phone: get('phone', 'teléfono', 'telefono'),
    whatsapp: get('whatsapp', 'wsp'),
    address: get('address', 'dirección', 'direccion'),
    city: get('city', 'ciudad'),
    profession: get('profession', 'profesión', 'profesion'),
    origin,
    notes: get('notes', 'notas'),
  };
}

export function ImportClientsDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState<Partial<ImportClientRow>[]>([]);
  const [fileName, setFileName] = useState<string>('');

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      [
        'Juan Pérez', 'person', '0102030405', '', 'juan@example.com', '0998877665',
        '0998877665', 'Av. 6 de Diciembre N12-34', 'Quito', 'Arquitecto',
        'referral', 'Referido por Carlos',
      ],
      [
        'Constructora ABC', 'company', '', '1790012345001', 'ventas@abc.com', '022345678',
        '', 'Av. 12 de Octubre', 'Quito', '',
        'web_form', '',
      ],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    XLSX.writeFile(wb, 'plantilla-clientes.xlsx');
  }

  async function handleFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      const normalized = json.map(normalizeRow).filter((r) => r.name && r.name.length >= 2);
      if (normalized.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Sin filas válidas',
          description: 'Asegúrate de que la primera fila tenga los encabezados (name, email, ...).',
        });
        return;
      }
      setRows(normalized);
      setFileName(file.name);
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo leer el archivo', description: String(err) });
    }
  }

  function onImport() {
    startTransition(async () => {
      const res = await importClientsAction(rows);
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
        return;
      }
      const lines = [`${res.created} cliente(s) creados.`];
      if (res.skippedDuplicates) lines.push(`${res.skippedDuplicates} duplicados omitidos.`);
      if (res.errors && res.errors.length) lines.push(`${res.errors.length} fila(s) con errores.`);
      toast({ title: 'Importación completada', description: lines.join(' ') });
      setOpen(false);
      setRows([]);
      setFileName('');
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" /> Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Importar clientes desde Excel/CSV</DialogTitle>
          <DialogDescription>
            Sube un archivo .xlsx o .csv. La primera fila debe tener los encabezados. Acepta nombres
            en español (nombre, correo, teléfono, etc.) o inglés (name, email, phone, …).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Descargar plantilla
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
              <Button type="button" size="sm" asChild>
                <span>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {fileName ? 'Cambiar archivo' : 'Seleccionar archivo'}
                </span>
              </Button>
            </label>
            {fileName && (
              <span className="text-xs text-muted-foreground">
                {fileName} · {rows.length} fila(s)
              </span>
            )}
          </div>

          {rows.length > 0 && (
            <div className="max-h-[280px] overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Nombre</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Teléfono</th>
                    <th className="px-3 py-2 text-left">Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5 font-medium">{r.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.type}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.email}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.phone}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.origin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                  Mostrando 50 de {rows.length}. Todas se importan.
                </p>
              )}
            </div>
          )}

          {rows.length === 0 && (
            <div className="flex items-start gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Selecciona un archivo para ver el preview. Los clientes con email duplicado en la
                org se omiten automáticamente.
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={rows.length === 0 || pending} onClick={onImport}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Importar {rows.length > 0 ? `${rows.length} cliente(s)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
