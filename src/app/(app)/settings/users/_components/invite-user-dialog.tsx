'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, UserPlus } from 'lucide-react';
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
import { inviteUser } from '../actions';
import type { Role, Project } from '@prisma/client';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  roleId: z.string().min(1, 'Selecciona un rol'),
  projectId: z.string().min(1, 'Selecciona un proyecto'),
  tempPassword: z.string().min(10, 'Mínimo 10 caracteres'),
});

type Values = z.infer<typeof schema>;

export function InviteUserDialog({ roles, projects }: { roles: Role[]; projects: Project[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const form = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setLoading(true);
    const res = await inviteUser(values);
    setLoading(false);

    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }

    toast({ title: 'Usuario invitado', description: `Comparte la contraseña temporal con ${values.email}.` });
    form.reset();
    setOpen(false);
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const len = 14;
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    const pwd = Array.from(arr, (b) => chars[b % chars.length]).join('');
    form.setValue('tempPassword', pwd);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Invitar usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Invitar nuevo usuario</DialogTitle>
          <DialogDescription>
            Se crea con contraseña temporal. El usuario deberá cambiarla en su primer acceso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre completo</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roleId">Rol</Label>
              <Select onValueChange={(v) => form.setValue('roleId', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.roleId && (
                <p className="text-sm text-destructive">{form.formState.errors.roleId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectId">Proyecto</Label>
              <Select onValueChange={(v) => form.setValue('projectId', v, { shouldValidate: true })}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tempPassword">Contraseña temporal</Label>
              <Button type="button" variant="link" size="sm" onClick={generatePassword} className="h-auto p-0">
                Generar
              </Button>
            </div>
            <Input id="tempPassword" {...form.register('tempPassword')} />
            {form.formState.errors.tempPassword && (
              <p className="text-sm text-destructive">{form.formState.errors.tempPassword.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invitar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
