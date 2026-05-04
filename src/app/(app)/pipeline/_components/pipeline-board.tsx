'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, MoreHorizontal, User, Building } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { moveOpportunityStage } from '@/app/(app)/opportunities/actions';
import type { PipelineStage } from '@prisma/client';

type Opp = {
  id: string;
  stageId: string;
  estimatedValue: number | null;
  unitDetail: string | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    type: 'person' | 'company';
  };
};

export function PipelineBoard({
  stages,
  opportunities,
}: {
  stages: PipelineStage[];
  opportunities: Opp[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function moveOpportunity(oppId: string, newStageId: string) {
    startTransition(async () => {
      const res = await moveOpportunityStage(oppId, newStageId);
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      } else {
        toast({ title: 'Etapa actualizada' });
        router.refresh();
      }
    });
  }

  // Filtrar etapa "perdido" del kanban principal — solo aparece como opción de movimiento
  const visibleStages = stages.filter((s) => !s.isLost);

  return (
    <div className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto pb-4">
      <div className="flex gap-3 min-h-[60vh]" style={{ minWidth: visibleStages.length * 280 + 'px' }}>
        {visibleStages.map((stage, idx) => {
          const stageOpps = opportunities.filter((o) => o.stageId === stage.id);
          const totalValue = stageOpps.reduce((sum, o) => sum + (o.estimatedValue ?? 0), 0);

          return (
            <div
              key={stage.id}
              className="flex-1 min-w-[260px] flex flex-col bg-muted/40 rounded-lg"
            >
              <div className="p-3 border-b">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {stage.name}
                    {stage.isWon && <Badge className="bg-green-600 text-xs">Ganada</Badge>}
                  </div>
                  <Badge variant="secondary">{stageOpps.length}</Badge>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{stage.probability}% prob.</span>
                  {totalValue > 0 && <span>${totalValue.toLocaleString()}</span>}
                </div>
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {stageOpps.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Sin oportunidades
                  </div>
                ) : (
                  stageOpps.map((opp) => (
                    <Card key={opp.id} className="cursor-default">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/opportunities/${opp.id}`}
                            className="font-medium text-sm hover:text-primary hover:underline flex-1 min-w-0 truncate"
                          >
                            {opp.client.name}
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {idx > 0 && (
                                <DropdownMenuItem
                                  onClick={() => moveOpportunity(opp.id, visibleStages[idx - 1].id)}
                                  disabled={isPending}
                                >
                                  <ChevronLeft className="mr-2 h-4 w-4" />
                                  Mover a "{visibleStages[idx - 1].name}"
                                </DropdownMenuItem>
                              )}
                              {idx < visibleStages.length - 1 && (
                                <DropdownMenuItem
                                  onClick={() => moveOpportunity(opp.id, visibleStages[idx + 1].id)}
                                  disabled={isPending}
                                >
                                  <ChevronRight className="mr-2 h-4 w-4" />
                                  Mover a "{visibleStages[idx + 1].name}"
                                </DropdownMenuItem>
                              )}
                              {stages.find((s) => s.isLost) && !stage.isLost && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() =>
                                    moveOpportunity(opp.id, stages.find((s) => s.isLost)!.id)
                                  }
                                  disabled={isPending}
                                >
                                  Marcar como perdida
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                          {opp.client.type === 'company' ? (
                            <Building className="h-3 w-3" />
                          ) : (
                            <User className="h-3 w-3" />
                          )}
                          {opp.client.email ?? opp.client.phone ?? 'Sin contacto'}
                        </div>

                        {opp.unitDetail && (
                          <p className="mt-2 text-xs">{opp.unitDetail}</p>
                        )}

                        {opp.estimatedValue && (
                          <div className="mt-2 text-xs font-medium">
                            ${opp.estimatedValue.toLocaleString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
