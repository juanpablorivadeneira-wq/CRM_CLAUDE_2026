'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Pencil } from 'lucide-react';
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
import { ImageUploadField } from '@/components/image-upload-field';
import { createProject, updateProject } from '../actions';
import type { ProjectType, ProjectStatus } from '@prisma/client';

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

type ProjectFormProps = {
  projectTypes: ProjectType[];
  trigger?: React.ReactNode;
} & (
  | { mode: 'create' }
  | {
      mode: 'edit';
      project: {
        id: string;
        name: string;
        projectTypeId: string;
        status: ProjectStatus;
        description: string | null;
        imageUrl: string | null;
        address: string | null;
        referencePrice: number | null;
      };
    }
);

export function ProjectFormDialog(props: ProjectFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const defaultValues: Values =
    props.mode === 'edit'
      ? {
          name: props.project.name,
          projectTypeId: props.project.projectTypeId,
          status: props.project.status,
          description: props.project.description ?? '',
          imageUrl: props.project.imageUrl ?? '',
          address: props.project.address ?? '',
          referencePrice: props.project.referencePrice ?? null,
        }
      : { name: '', projectTypeId: '', status: 'active', imageUrl: '' };

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  async function onSubmit(values: Values) {
    setLoading(true);
    const res =
      props.mode === 'edit'
        ? await updateProject(props.project.id, values)
        : await createProject(values);
    setLoading(false);

    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }

    toast({ title: props.mode === 'edit' ? 'Proyecto actualizado' : 'Proyecto creado' });
    setOpen(false);
    if (props.mode === 'edit') {
      router.refresh();
    } else {
      form.reset();
      if ('id' in res && res.id) router.push(`/projects/${res.id}`);
    }
  }

  const trigger = props.trigger ?? (
    props.mode === 'edit' ? (
      <Button variant="outline" size="sm">
        <Pencil className="mr-2 h-4 w-4" /> Editar
      </Button>
    ) : (
      <Button>
        <Plus className="mr-2 h-4 w-4" /> Nuevo proyecto
      </Button>
    )
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset(defaultValues);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{props.mode === 'edit' ? 'Editar proyecto' : 'Nuevo proyecto'}</DialogTitle>
          <DialogDescription>
            {props.mode === 'edit'
              ? 'Modifica los datos del proyecto. La línea de negocio la define el tipo.'
              : 'Asocia el proyecto a un tipo para que use su embudo y campos personalizados.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Proyecto Arandá" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de proyecto</Label>
              <Controller
                control={form.control}
                name="projectTypeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {props.projectTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.projectTypeId && (
                <p className="text-sm text-destructive">{form.formState.errors.projectTypeId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Controller
                control={form.control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v as ProjectStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="paused">En pausa</SelectItem>
                      <SelectItem value="sold_out">Agotado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Precio referencial</Label>
              <Input type="number" step="0.01" placeholder="0.00" {...form.register('referencePrice')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input placeholder="Av. Principal 123, Ciudad" {...form.register('address')} />
          </div>

          <Controller
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <ImageUploadField
                value={field.value}
                onChange={field.onChange}
                prefix="projects"
                label="Foto del proyecto"
                disabled={loading}
              />
            )}
          />

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
              {props.mode === 'edit' ? 'Guardar cambios' : 'Crear proyecto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
