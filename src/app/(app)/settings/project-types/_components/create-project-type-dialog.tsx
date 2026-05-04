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
import { createProjectType } from '../actions';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80),
  businessLine: z.enum(['real_estate', 'design', 'construction']),
  description: z.string().max(500).optional(),
});

type Values = z.infer<typeof schema>;

export function CreateProjectTypeDialog() {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setLoading(true);
    const res = await createProjectType(values);
    setLoading(false);

    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }

    toast({ title: 'Tipo de proyecto creado', description: 'Configura sus etapas y campos.' });
    form.reset();
    setOpen(false);
    if (res.id) router.push(`/settings/project-types/${res.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nuevo tipo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo tipo de proyecto</DialogTitle>
          <DialogDescription>
            Cada tipo tiene su propio embudo, campos personalizados y documentos requeridos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Ej. Edificio en altura" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="businessLine">Línea de negocio</Label>
            <Select onValueChange={(v) => form.setValue('businessLine', v as any, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="real_estate">Inmobiliaria</SelectItem>
                <SelectItem value="design">Diseño</SelectItem>
                <SelectItem value="construction">Construcción</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.businessLine && (
              <p className="text-sm text-destructive">{form.formState.errors.businessLine.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Para qué se usa este tipo, qué lo diferencia…"
              {...form.register('description')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
