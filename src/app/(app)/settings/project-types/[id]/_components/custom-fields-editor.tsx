'use client';

import { useState, useTransition } from 'react';
import { Loader2, Plus, Trash2, Save, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateCustomFields, type CustomField } from '../../actions';

const FIELD_TYPES: Array<{ value: CustomField['type']; label: string }> = [
  { value: 'text', label: 'Texto corto' },
  { value: 'textarea', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Fecha' },
  { value: 'select', label: 'Selección' },
  { value: 'boolean', label: 'Sí / No' },
];

export function CustomFieldsEditor({
  projectTypeId,
  initialFields,
  readOnly,
}: {
  projectTypeId: string;
  initialFields: CustomField[];
  readOnly: boolean;
}) {
  const { toast } = useToast();
  const [fields, setFields] = useState<CustomField[]>(initialFields ?? []);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update(idx: number, patch: Partial<CustomField>) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
    setDirty(true);
  }

  function add() {
    setFields((prev) => [
      ...prev,
      { key: `campo_${prev.length + 1}`, label: 'Nuevo campo', type: 'text', required: false },
    ]);
    setDirty(true);
  }

  function remove(idx: number) {
    setFields((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function move(idx: number, dir: -1 | 1) {
    const ni = idx + dir;
    if (ni < 0 || ni >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      return next;
    });
    setDirty(true);
  }

  function save() {
    startTransition(async () => {
      const res = await updateCustomFields(projectTypeId, fields);
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
        return;
      }
      toast({ title: 'Campos guardados' });
      setDirty(false);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Campos personalizados</h3>
          <p className="text-sm text-muted-foreground">
            Cada oportunidad de este tipo capturará estos campos adicionales (rango de presupuesto, tipo de obra, etc.).
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={add}>
              <Plus className="mr-2 h-4 w-4" /> Añadir campo
            </Button>
            {dirty && (
              <Button onClick={save} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Guardar
              </Button>
            )}
          </div>
        )}
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Sin campos personalizados.
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((f, i) => (
            <div key={i} className="rounded-md border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-muted-foreground">Campo #{i + 1}</span>
                {!readOnly && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === fields.length - 1}>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Etiqueta visible</Label>
                  <Input
                    value={f.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Clave (sin espacios)</Label>
                  <Input
                    value={f.key}
                    onChange={(e) => update(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                    disabled={readOnly}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={f.type}
                    onValueChange={(v) => update(i, { type: v as CustomField['type'] })}
                    disabled={readOnly}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {f.type === 'select' && (
                <div className="space-y-1">
                  <Label className="text-xs">Opciones (una por línea)</Label>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
                    value={(f.options ?? []).join('\n')}
                    onChange={(e) =>
                      update(i, {
                        options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    disabled={readOnly}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id={`req-${i}`}
                  checked={f.required as any}
                  onCheckedChange={(v) => update(i, { required: v as any })}
                  disabled={readOnly}
                />
                <Label htmlFor={`req-${i}`} className="cursor-pointer text-sm">
                  Campo obligatorio al crear oportunidad
                </Label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
