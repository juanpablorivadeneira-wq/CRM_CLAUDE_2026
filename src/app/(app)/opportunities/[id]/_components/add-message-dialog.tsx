'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, MessageCircle } from 'lucide-react';
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
import { addMessage } from '@/app/(app)/opportunities/actions';

const schema = z.object({
  channel: z.enum(['whatsapp', 'email', 'sms', 'call', 'meeting', 'note']),
  direction: z.enum(['inbound', 'outbound', 'internal']).default('outbound'),
  subject: z.string().max(200).optional(),
  body: z.string().min(1, 'Escribe el contenido').max(5000),
});

type Values = z.infer<typeof schema>;

export function AddMessageDialog({ opportunityId }: { opportunityId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { channel: 'note', direction: 'internal' },
  });

  const channel = form.watch('channel');

  async function onSubmit(values: Values) {
    setLoading(true);
    const res = await addMessage(opportunityId, values);
    setLoading(false);

    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }

    toast({ title: 'Registrado' });
    form.reset({ channel: 'note', direction: 'internal' });
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageCircle className="mr-2 h-4 w-4" /> Registrar contacto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar contacto</DialogTitle>
          <DialogDescription>
            Llamada, email, WhatsApp, reunión o nota interna.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select
                defaultValue="note"
                onValueChange={(v) => form.setValue('channel', v as any, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Nota interna</SelectItem>
                  <SelectItem value="call">Llamada</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="meeting">Reunión</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Select
                defaultValue="internal"
                onValueChange={(v) => form.setValue('direction', v as any, { shouldValidate: true })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Saliente (yo al cliente)</SelectItem>
                  <SelectItem value="inbound">Entrante (cliente a mí)</SelectItem>
                  <SelectItem value="internal">Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {channel === 'email' && (
            <div className="space-y-2">
              <Label>Asunto</Label>
              <Input {...form.register('subject')} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Contenido / resumen</Label>
            <Textarea rows={4} {...form.register('body')} placeholder="Resumen de la conversación, acuerdos, próximos pasos…" />
            {form.formState.errors.body && (
              <p className="text-sm text-destructive">{form.formState.errors.body.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
