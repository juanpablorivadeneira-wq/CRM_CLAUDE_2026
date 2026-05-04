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
import { createClient } from '../actions';

const schema = z.object({
  type: z.enum(['person', 'company']).default('person'),
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  ci: z.string().max(20).optional(),
  ruc: z.string().max(20).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  whatsapp: z.string().max(30).optional(),
  city: z.string().max(80).optional(),
  origin: z.enum([
    'meta_ads', 'web_form', 'referral', 'trade_show',
    'cold_call', 'whatsapp_inbound', 'walk_in', 'other',
  ]).default('other'),
  notes: z.string().max(2000).optional(),
});

type Values = z.infer<typeof schema>;

const ORIGIN_OPTIONS = [
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'web_form', label: 'Formulario web' },
  { value: 'referral', label: 'Referido' },
  { value: 'trade_show', label: 'Feria' },
  { value: 'cold_call', label: 'Llamada en frío' },
  { value: 'whatsapp_inbound', label: 'WhatsApp' },
  { value: 'walk_in', label: 'Visita espontánea' },
  { value: 'other', label: 'Otro' },
];

export function CreateClientDialog() {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'person', origin: 'other' },
  });

  const type = form.watch('type');

  async function onSubmit(values: Values) {
    setLoading(true);
    const res = await createClient(values);
    setLoading(false);

    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }

    toast({ title: 'Cliente creado' });
    form.reset();
    setOpen(false);
    if (res.id) router.push(`/clients/${res.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
          <DialogDescription>
            Persona o empresa. Después podrás crear una oportunidad asociada a un proyecto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              defaultValue="person"
              onValueChange={(v) => form.setValue('type', v as any, { shouldValidate: true })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="person">Persona</SelectItem>
                <SelectItem value="company">Empresa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{type === 'company' ? 'Razón social' : 'Nombre completo'}</Label>
            <Input {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {type === 'company' ? (
              <div className="space-y-2 col-span-2">
                <Label>RUC</Label>
                <Input placeholder="1790000000001" {...form.register('ruc')} />
              </div>
            ) : (
              <div className="space-y-2 col-span-2">
                <Label>Cédula</Label>
                <Input placeholder="0102030405" {...form.register('ci')} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input type="tel" {...form.register('phone')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>WhatsApp</Label>
              <Input type="tel" {...form.register('whatsapp')} />
            </div>
            <div className="space-y-2">
              <Label>Ciudad</Label>
              <Input {...form.register('city')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Origen del lead</Label>
            <Select
              defaultValue="other"
              onValueChange={(v) => form.setValue('origin', v as any, { shouldValidate: true })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORIGIN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea rows={3} {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
