'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, AlertCircle, FileSpreadsheet, ArrowRight } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  detectColumns,
  parseFunnelRow,
  type ColumnDetection,
  type FieldMapping,
  type CustomField,
  type ParsedRow,
} from '@/lib/funnel-parser';
import { importFunnelLeadsAction } from '../import.actions';

const STANDARD_LABELS = {
  date: 'Fecha del lead',
  name: 'Nombre del cliente',
  email: 'Email',
  phone: 'Teléfono / WhatsApp',
} as const;

type Step = 'upload' | 'mapping' | 'preview';

export function FunnelImportDialog({
  projectId,
  projectName,
  customFields,
}: {
  projectId: string;
  projectName: string;
  customFields: CustomField[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('upload');
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<ColumnDetection[]>([]);
  const [mapping, setMapping] = useState<FieldMapping[]>([]);

  function reset() {
    setStep('upload');
    setFileName('');
    setHeaders([]);
    setRawRows([]);
    setColumns([]);
    setMapping([]);
  }

  async function handleFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });

      if (json.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Archivo vacío',
          description: 'No se encontraron filas con datos.',
        });
        return;
      }

      const detectedHeaders = Object.keys(json[0]);
      const detectedColumns = detectColumns(detectedHeaders, customFields);

      setFileName(file.name);
      setHeaders(detectedHeaders);
      setRawRows(json);
      setColumns(detectedColumns);
      setMapping(detectedColumns.map((c) => c.suggested));
      setStep('mapping');
    } catch (err) {
      toast({ variant: 'destructive', title: 'No se pudo leer el archivo', description: String(err) });
    }
  }

  const parsedRows = useMemo<ParsedRow[]>(() => {
    if (step === 'upload') return [];
    return rawRows.map((row, i) => parseFunnelRow(row, columns, mapping, i + 2));
  }, [rawRows, columns, mapping, step]);

  const validRows = parsedRows.filter((r) => r.errors.length === 0 || (r.errors.length === 1 && r.emailInvalid));

  function updateMapping(idx: number, kind: FieldMapping['kind'], extra?: string) {
    setMapping((prev) => {
      const next = [...prev];
      const col = columns[idx];
      if (kind === 'ignore') next[idx] = { kind: 'ignore' };
      else if (kind === 'standard') next[idx] = { kind: 'standard', field: extra as any };
      else next[idx] = { kind: 'data', key: extra ?? col.slug, label: col.header };
      return next;
    });
  }

  function onImport() {
    startTransition(async () => {
      const payload = validRows.map((r) => ({
        date: r.date ? r.date.toISOString() : null,
        name: r.name,
        email: r.email,
        phone: r.phone,
        data: r.data,
      }));
      const res = await importFunnelLeadsAction(projectId, payload);
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
        return;
      }
      const lines = [`${res.created} lead(s) creados.`];
      if (res.skippedDuplicates) lines.push(`${res.skippedDuplicates} duplicado(s) omitidos.`);
      if (res.skippedInvalid) lines.push(`${res.skippedInvalid} fila(s) inválida(s).`);
      toast({ title: 'Importación completada', description: lines.join(' ') });
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" /> Importar leads del funnel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Importar leads — {projectName}</DialogTitle>
          <DialogDescription>
            Sube el CSV/Excel exportado del funnel. Cada fila crea un cliente y una oportunidad
            en la primera etapa del pipeline.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <label className="block">
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
              <div className="cursor-pointer rounded-md border-2 border-dashed p-12 text-center transition-colors hover:border-primary hover:bg-muted/40">
                <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 font-medium">Selecciona el archivo del funnel</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  .xlsx, .xls o .csv exportado de Google Forms / Sheets
                </p>
              </div>
            </label>

            <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Columnas que detecta automáticamente:</p>
              <p>
                <strong>Fecha</strong> (Fecha, Date, Timestamp) ·{' '}
                <strong>Nombre</strong> (Nombre, Nombre del Cliente, Cliente, Name) ·{' '}
                <strong>Email</strong> (Email, Correo) ·{' '}
                <strong>Teléfono</strong> (Teléfono, WhatsApp, Celular, Phone)
              </p>
              <p className="mt-1">
                El resto de columnas se guardan como respuestas del funnel en la oportunidad. En el
                siguiente paso puedes ajustar el mapeo.
              </p>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {fileName} · {rawRows.length} fila(s)
              </span>
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                Cambiar archivo
              </Button>
            </div>

            <div className="max-h-[360px] overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Columna del archivo</th>
                    <th className="px-3 py-2 text-left">Mapeo</th>
                    <th className="px-3 py-2 text-left">Ejemplo (fila 1)</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col, i) => {
                    const m = mapping[i];
                    const sample = (() => {
                      const v = rawRows[0]?.[col.header];
                      const s = String(v ?? '');
                      return s.length > 50 ? `${s.slice(0, 50)}…` : s;
                    })();
                    const value =
                      m.kind === 'standard'
                        ? `std:${m.field}`
                        : m.kind === 'data'
                        ? `data:${m.key}`
                        : 'ignore';

                    return (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 font-medium">{col.header}</td>
                        <td className="px-3 py-2">
                          <Select
                            value={value}
                            onValueChange={(v) => {
                              if (v === 'ignore') updateMapping(i, 'ignore');
                              else if (v.startsWith('std:')) updateMapping(i, 'standard', v.slice(4));
                              else if (v.startsWith('data:')) updateMapping(i, 'data', v.slice(5));
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(['date', 'name', 'email', 'phone'] as const).map((s) => (
                                <SelectItem key={s} value={`std:${s}`}>
                                  {STANDARD_LABELS[s]}
                                </SelectItem>
                              ))}
                              {customFields.map((cf) => (
                                <SelectItem key={cf.key} value={`data:${cf.key}`}>
                                  Pregunta del funnel: {cf.label}
                                </SelectItem>
                              ))}
                              <SelectItem value={`data:${col.slug || `col_${i}`}`}>
                                Pregunta nueva: {col.header}
                              </SelectItem>
                              <SelectItem value="ignore">— No importar —</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{sample}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setStep('preview')}>
                Ver preview <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-md border bg-muted/40 p-2 text-center">
                <div className="text-2xl font-bold">{validRows.length}</div>
                <div className="text-xs text-muted-foreground">listos</div>
              </div>
              <div className="rounded-md border p-2 text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {parsedRows.filter((r) => r.emailInvalid).length}
                </div>
                <div className="text-xs text-muted-foreground">email inválido (igual se importan)</div>
              </div>
              <div className="rounded-md border p-2 text-center">
                <div className="text-2xl font-bold text-destructive">
                  {parsedRows.filter((r) => r.errors.some((e) => !e.startsWith('Email inválido'))).length}
                </div>
                <div className="text-xs text-muted-foreground">descartadas</div>
              </div>
            </div>

            <div className="max-h-[320px] overflow-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left">#</th>
                    <th className="px-2 py-1.5 text-left">Fecha</th>
                    <th className="px-2 py-1.5 text-left">Nombre</th>
                    <th className="px-2 py-1.5 text-left">Email</th>
                    <th className="px-2 py-1.5 text-left">Teléfono</th>
                    <th className="px-2 py-1.5 text-left">Respuestas</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 100).map((r) => {
                    const hasFatalError = r.errors.some((e) => !e.startsWith('Email inválido'));
                    return (
                      <tr
                        key={r.rowIndex}
                        className={`border-t ${hasFatalError ? 'bg-destructive/5 text-muted-foreground line-through' : ''}`}
                      >
                        <td className="px-2 py-1.5">{r.rowIndex}</td>
                        <td className="px-2 py-1.5">{r.date ? r.date.toLocaleDateString() : '—'}</td>
                        <td className="px-2 py-1.5 font-medium">{r.name || '—'}</td>
                        <td className="px-2 py-1.5">
                          {r.email ?? (r.emailInvalid ? <span className="text-amber-600">inválido</span> : '—')}
                        </td>
                        <td className="px-2 py-1.5">{r.phone || '—'}</td>
                        <td className="px-2 py-1.5">
                          <span className="text-muted-foreground">
                            {Object.keys(r.data).length} campo(s)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {parsedRows.length > 100 && (
                <p className="border-t p-2 text-center text-xs text-muted-foreground">
                  Mostrando 100 de {parsedRows.length}. Todas se procesan.
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Se omiten leads con email duplicado en este proyecto. Si un cliente nuevo no tiene
                email se crea igualmente. La fecha del CSV se preserva como fecha de creación de la
                oportunidad. Las respuestas del funnel quedan en la oportunidad y son visibles en
                el detalle.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Volver al mapeo
              </Button>
              <Button onClick={onImport} disabled={pending || validRows.length === 0}>
                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar {validRows.length} lead(s)
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
