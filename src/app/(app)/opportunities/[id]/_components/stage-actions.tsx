'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Trophy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { moveOpportunityStage, markOpportunityLost } from '@/app/(app)/opportunities/actions';
import type { PipelineStage } from '@prisma/client';

export function StageActions({
  opportunityId,
  currentStageId,
  stages,
}: {
  opportunityId: string;
  currentStageId: string;
  stages: PipelineStage[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function move(stageId: string) {
    startTransition(async () => {
      const res = await moveOpportunityStage(opportunityId, stageId);
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      } else {
        toast({ title: 'Etapa actualizada' });
        router.refresh();
      }
    });
  }

  function lose() {
    const reason = window.prompt('Motivo de pérdida (precio, financiamiento, plazo, etc.):');
    if (!reason) return;
    startTransition(async () => {
      const res = await markOpportunityLost(opportunityId, { reason });
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      } else {
        toast({ title: 'Marcada como perdida' });
        router.refresh();
      }
    });
  }

  const currentIdx = stages.findIndex((s) => s.id === currentStageId);
  const nonTerminal = stages.filter((s) => !s.isLost);
  const wonStage = stages.find((s) => s.isWon);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          Cambiar etapa <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Mover a…</DropdownMenuLabel>
        {nonTerminal.map((s) => (
          <DropdownMenuItem
            key={s.id}
            disabled={s.id === currentStageId}
            onClick={() => move(s.id)}
          >
            {s.name}
            {s.isWon && <Trophy className="ml-auto h-3 w-3 text-green-600" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={lose}>
          <X className="mr-2 h-4 w-4" /> Marcar como perdida
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
