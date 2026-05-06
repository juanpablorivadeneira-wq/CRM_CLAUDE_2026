'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { seedDemoClientsForCurrentOrgAction } from '../seed-demo.actions';
import { purgeDemoDataAction } from '../../projects/actions';

export function SeedDemoBanner({ hasDemoData }: { hasDemoData: boolean }) {
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

  function onPurge() {
    startTransition(async () => {
      const res = await purgeDemoDataAction();
      if (res.ok) {
        toast({
          title: 'Datos demo eliminados',
          description:
            res.deletedClients === 0
              ? 'No había datos demo que limpiar.'
              : `Se archivaron ${res.deletedClients} cliente(s) demo y ${res.deletedOpportunities} oportunidad(es).`,
        });
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'No se pudo limpiar',
          description: res.error ?? 'Intenta de nuevo.',
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
            <p className="font-medium">
              {hasDemoData ? 'Tienes datos demo cargados' : '¿Quieres datos para probar?'}
            </p>
            <p className="text-sm text-muted-foreground">
              {hasDemoData
                ? 'Puedes seguir agregando o limpiar todos los datos demo (clientes con tag «demo») antes de cargar tu información real.'
                : 'Crea 5 clientes con oportunidades en cada proyecto activo. Es seguro repetirlo: no duplica datos existentes.'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} disabled={pending}>
            Ocultar
          </Button>
          {hasDemoData && (
            <Button variant="outline" size="sm" onClick={onPurge} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Eraser className="mr-1.5 h-4 w-4" />
              Limpiar datos demo
            </Button>
          )}
          <Button size="sm" onClick={onSeed} disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasDemoData ? 'Sembrar más' : 'Sembrar datos demo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
