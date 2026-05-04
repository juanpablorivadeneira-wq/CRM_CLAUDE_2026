'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ListTodo } from 'lucide-react';
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
import { addTask } from '@/app/(app)/opportunities/actions';

const schema = z.object({
  title: z.string().min(1, 'Requerido').max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export function AddTaskDialog({
  opportunityId,
  users,
}: {
  opportunityId: string;
  users: { id: string; name: string }[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setLoading(true);
    const res = await addTask(opportunityId, values);
    setLoading(false);

    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }

    toast({ title: 'Tarea creada' });
    form.reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ListTodo className="mr-2 h-4 w-4" /> Nueva tarea
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
          <DialogDescription>
            Recordatorio o seguimiento que aparecerá en la agenda del responsable.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input {...form.register('title')} placeholder="Llamar para confirmar visita" />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea rows={2} {...form.register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha límite</Label>
              <Input type="date" {...form.register('dueDate')} />
            </div>
            <div className="space-y-2">
              <Label>Asignar a</Label>
              <Select onValueChange={(v) => form.setValue('assigneeId', v)}>
                <SelectTrigger><SelectValue placeholder="Yo (default)" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
