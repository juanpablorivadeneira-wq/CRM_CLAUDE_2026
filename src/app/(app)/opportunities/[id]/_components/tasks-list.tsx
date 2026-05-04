'use client';

import { useTransition } from 'react';
import { format, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { toggleTaskComplete } from '@/app/(app)/opportunities/actions';

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  assigneeName: string | null;
};

export function TasksList({ tasks }: { tasks: Task[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    startTransition(async () => {
      const res = await toggleTaskComplete(id);
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
      } else {
        router.refresh();
      }
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm">Sin tareas pendientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((t) => {
        const isOverdue = t.dueDate && !t.completedAt && isPast(t.dueDate);
        return (
          <Card key={t.id} className={t.completedAt ? 'opacity-60' : ''}>
            <CardContent className="p-3 flex items-start gap-3">
              <Checkbox
                checked={!!t.completedAt}
                onCheckedChange={() => toggle(t.id)}
                disabled={isPending}
                className="mt-1"
              />
              <div className="flex-1">
                <p className={`font-medium text-sm ${t.completedAt ? 'line-through text-muted-foreground' : ''}`}>
                  {t.title}
                </p>
                {t.description && (
                  <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  {t.dueDate && (
                    <span className={`flex items-center gap-1 ${isOverdue ? 'text-destructive' : ''}`}>
                      <Calendar className="h-3 w-3" />
                      {format(t.dueDate, "dd MMM yyyy", { locale: es })}
                      {isOverdue && ' · vencida'}
                    </span>
                  )}
                  {t.assigneeName && <span>Asignada a {t.assigneeName}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
