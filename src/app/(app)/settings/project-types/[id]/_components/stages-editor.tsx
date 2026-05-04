'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Trash2, GripVertical, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { addStage, updateStage, deleteStage, reorderStages } from '../../actions';
import type { PipelineStage } from '@prisma/client';

const stageSchema = z.object({
  name: z.string().min(1, 'Requerido').max(60),
  probability: z.coerce.number().min(0).max(100),
  slaDays: z.coerce.number().int().min(0).optional().nullable(),
  color: z.string().optional().nullable(),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
});

type StageValues = z.infer<typeof stageSchema>;

export function StagesEditor({
  projectTypeId,
  stages: initialStages,
  readOnly,
}: {
  projectTypeId: string;
  stages: PipelineStage[];
  readOnly: boolean;
}) {
  const { toast } = useToast();
  const [stages, setStages] = useState(initialStages);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<PipelineStage | null>(null);
  const [creating, setCreating] = useState(false);

  function move(index: number, direction: -1 | 1) {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= stages.length) return;
    const next = [...stages];
    [next[index], next[newIdx]] = [next[newIdx], next[index]];
    setStages(next);

    startTransition(async () => {
      const res = await reorderStages(projectTypeId, next.map((s) => s.id));
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
        setStages(initialStages);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta etapa? Las oportunidades en ella deben moverse antes.')) return;
    const res = await deleteStage(id);
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'No se pudo eliminar', description: res.error });
      return;
    }
    toast({ title: 'Etapa eliminada' });
    setStages(stages.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">Etapas del embudo</h3>
          <p className="text-sm text-muted-foreground">
            Define el flujo de la venta. Marca las etapas finales como ganadas o perdidas.
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> Añadir etapa
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        {stages.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Sin etapas. Añade la primera.
          </p>
        ) : (
          <ul className="divide-y">
            {stages.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 p-3">
                <span className="text-xs font-mono text-muted-foreground w-8">{i + 1}.</span>

                {!readOnly && (
                  <div className="flex flex-col gap-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || isPending}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => move(i, 1)}
                      disabled={i === stages.length - 1 || isPending}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{s.name}</span>
                    {s.isWon && <Badge className="bg-green-600">Ganada</Badge>}
                    {s.isLost && <Badge variant="destructive">Perdida</Badge>}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                    <span>{s.probability}% probabilidad</span>
                    {s.slaDays != null && <span>SLA {s.slaDays} días</span>}
                  </div>
                </div>

                {!readOnly && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditing(s)}>
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(s.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialog crear */}
      <StageDialog
        open={creating}
        onOpenChange={setCreating}
        title="Nueva etapa"
        onSubmit={async (values) => {
          const res = await addStage(projectTypeId, values);
          if (!res.ok) return res;
          toast({ title: 'Etapa creada' });
          window.location.reload();
          return { ok: true };
        }}
      />

      {/* Dialog editar */}
      <StageDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Editar etapa"
        defaultValues={
          editing
            ? {
                name: editing.name,
                probability: editing.probability,
                slaDays: editing.slaDays,
                color: editing.color,
                isWon: editing.isWon,
                isLost: editing.isLost,
              }
            : undefined
        }
        onSubmit={async (values) => {
          if (!editing) return { ok: false, error: 'Etapa no encontrada' };
          const res = await updateStage(editing.id, values);
          if (!res.ok) return res;
          toast({ title: 'Etapa actualizada' });
          window.location.reload();
          return { ok: true };
        }}
      />
    </div>
  );
}

function StageDialog({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  defaultValues?: Partial<StageValues>;
  onSubmit: (values: StageValues) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const form = useForm<StageValues>({
    resolver: zodResolver(stageSchema),
    values: {
      name: defaultValues?.name ?? '',
      probability: defaultValues?.probability ?? 50,
      slaDays: defaultValues?.slaDays ?? null,
      color: defaultValues?.color ?? null,
      isWon: defaultValues?.isWon ?? false,
      isLost: defaultValues?.isLost ?? false,
    },
  });

  async function submit(values: StageValues) {
    setLoading(true);
    const res = await onSubmit(values);
    setLoading(false);
    if (!res.ok) toast({ variant: 'destructive', title: 'Error', description: res.error });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Configura el comportamiento de esta etapa del embudo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Probabilidad (%)</Label>
              <Input type="number" min={0} max={100} {...form.register('probability')} />
            </div>
            <div className="space-y-2">
              <Label>SLA (días)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Sin límite"
                {...form.register('slaDays')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isWon"
                checked={form.watch('isWon') as any}
                onCheckedChange={(v) => form.setValue('isWon', v as any)}
              />
              <Label htmlFor="isWon" className="cursor-pointer">
                Etapa ganada (cierre exitoso)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isLost"
                checked={form.watch('isLost') as any}
                onCheckedChange={(v) => form.setValue('isLost', v as any)}
              />
              <Label htmlFor="isLost" className="cursor-pointer">
                Etapa perdida
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
