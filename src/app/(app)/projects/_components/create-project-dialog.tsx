'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { createProject } from '../actions';
import type { ProjectType } from '@prisma/client';

const schema = z.object({
  name: z.string().min(2).max(80),
  projectTypeId: z.string().min(1, 'Selecciona un tipo'),
  status: z.enum(['active', 'paused', 'sold_out', 'cancelled']).default('active'),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  referencePrice: z.coerce.number().min(0).optional().nullable(),
});

type Values = z.infer<typeof schema>;

export function CreateProjectDialog({ projectTypes }: { projectTypes: ProjectType[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  });

  async function onSubmit(values: Values) {
    setLoading(true);
    const res = await createProject(values);
    setLoading(false);

    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }

    toast({ title: 'Proyecto creado' });
    form.reset();
    setOpen(false);
    if (res.id) router.push(`/projects/${res.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nuevo proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nuevo proyecto</DialogTitle>
          <DialogDescription>
            Asocia el proyecto a un tipo para que use su embudo y campos personalizados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Proyecto Arandá" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de proyecto</Label>
              <Select onValueChange={(v) => form.setValue('projectTypeId', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {projectTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.projectTypeId && (
                <p className="text-sm text-destructive">{form.formState.errors.projectTypeId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                defaultValue="active"
                onValueChange={(v) => form.setValue('status', v as any, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="paused">En pausa</SelectItem>
                  <SelectItem value="sold_out">Agotado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Precio referencial</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register('referencePrice')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input placeholder="Av. Principal 123, Ciudad" {...form.register('address')} />
          </div>

          <div className="space-y-2">
            <Label>URL de imagen (opcional)</Label>
            <Input placeholder="https://…" {...form.register('imageUrl')} />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea rows={3} {...form.register('description')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear proyecto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
