'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { DynamicFieldsForm, type CustomField } from '@/components/custom-fields/dynamic-field';
import { createOpportunity } from '@/app/(app)/opportunities/actions';

const baseSchema = z.object({
  clientId: z.string().min(1, 'Selecciona un cliente'),
  projectId: z.string().min(1, 'Selecciona un proyecto'),
  estimatedValue: z.coerce.number().min(0).optional().nullable(),
  unitDetail: z.string().max(200).optional(),
  salespersonId: z.string().optional(),
});

type Values = z.infer<typeof baseSchema>;

type ProjectOption = {
  id: string;
  name: string;
  projectType: { id: string; customFields: CustomField[] | null };
};

type ClientOption = { id: string; name: string };
type UserOption = { id: string; name: string };

export function NewOpportunityDialog({
  clients,
  projects,
  users,
  defaultProjectId,
}: {
  clients: ClientOption[];
  projects: ProjectOption[];
  users: UserOption[];
  defaultProjectId?: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, any>>({});

  const form = useForm<Values>({
    resolver: zodResolver(baseSchema),
    defaultValues: { projectId: defaultProjectId ?? '' },
  });

  const projectId = form.watch('projectId');

  const customFields = useMemo<CustomField[]>(() => {
    const project = projects.find((p) => p.id === projectId);
    return (project?.projectType.customFields as CustomField[] | null) ?? [];
  }, [projectId, projects]);

  async function onSubmit(values: Values) {
    // Validar campos requeridos
    for (const f of customFields) {
      if (f.required && !customValues[f.key]) {
        toast({ variant: 'destructive', title: 'Campo requerido', description: f.label });
        return;
      }
    }

    setLoading(true);
    const res = await createOpportunity({
      ...values,
      data: customValues,
    });
    setLoading(false);

    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }

    toast({ title: 'Oportunidad creada' });
    form.reset();
    setCustomValues({});
    setOpen(false);
    if (res.id) router.push(`/opportunities/${res.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nueva oportunidad
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva oportunidad</DialogTitle>
          <DialogDescription>
            Liga un cliente a un proyecto. Los campos cambian según el tipo de proyecto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Select
              onValueChange={(v) => form.setValue('clientId', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder={clients.length === 0 ? 'Crea un cliente primero' : 'Selecciona…'} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.clientId && (
              <p className="text-sm text-destructive">{form.formState.errors.clientId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Proyecto</Label>
            <Select
              defaultValue={defaultProjectId}
              onValueChange={(v) => form.setValue('projectId', v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder={projects.length === 0 ? 'Crea un proyecto primero' : 'Selecciona…'} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.projectId && (
              <p className="text-sm text-destructive">{form.formState.errors.projectId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor estimado</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register('estimatedValue')}
              />
            </div>
            <div className="space-y-2">
              <Label>Vendedor asignado</Label>
              <Select onValueChange={(v) => form.setValue('salespersonId', v)}>
                <SelectTrigger><SelectValue placeholder="Yo (por defecto)" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Unidad / detalle</Label>
            <Input
              placeholder="Ej. Depto 304, Torre B / Casa 220 m²"
              {...form.register('unitDetail')}
            />
          </div>

          {customFields.length > 0 && (
            <>
              <hr className="my-4" />
              <div>
                <h4 className="text-sm font-medium mb-3">Campos del tipo de proyecto</h4>
                <DynamicFieldsForm
                  fields={customFields}
                  values={customValues}
                  onChange={(k, v) => setCustomValues((prev) => ({ ...prev, [k]: v }))}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear oportunidad
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
