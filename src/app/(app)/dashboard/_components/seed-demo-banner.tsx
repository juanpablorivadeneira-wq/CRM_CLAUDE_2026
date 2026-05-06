'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { seedDemoClientsForCurrentOrgAction } from '../seed-demo.actions';

export function SeedDemoBanner() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  function onSeed() {
    startTransition(async () => {
      const res = await seedDemoClientsForCurrentOrgAction();
      if (res.ok) {
        toast({
          title: 'Datos demo creados',
          description: '5 clientes con oportunidades por proyecto activo.',
        });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'No se pudo sembrar',
          description: res.error ?? 'Intenta de nuevo o ejecuta el seed por consola.',
        });
      }
    });
  }

  return (
    <Card className="mb-6 border-dashed bg-muted/30">
      <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">¿Quieres datos para probar?</p>
            <p className="text-sm text-muted-foreground">
              Crea 5 clientes con oportunidades en cada proyecto activo. Es seguro
              repetirlo: no duplica datos existentes.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            Ahora no
          </Button>
          <Button size="sm" onClick={onSeed} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sembrar datos demo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
