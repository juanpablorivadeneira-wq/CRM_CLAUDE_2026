'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { deleteProject } from '../../actions';

export function DeleteProjectButton({
  projectId,
  projectName,
  opportunityCount,
}: {
  projectId: string;
  projectName: string;
  opportunityCount: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const res = await deleteProject(projectId, { force: true });
      if (res.ok) {
        toast({
          title: 'Proyecto eliminado',
          description:
            res.deletedOpportunities && res.deletedOpportunities > 0
              ? `Se archivaron ${res.deletedOpportunities} oportunidad(es) junto con el proyecto.`
              : 'El proyecto fue archivado.',
        });
        setOpen(false);
        router.push('/projects');
        router.refresh();
      } else {
        toast({
          variant: 'destructive',
          title: 'No se pudo eliminar',
          description: res.error ?? 'Intenta de nuevo.',
        });
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar proyecto «{projectName}»
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Esta acción es <strong>reversible solo desde la base de datos</strong> (soft-delete:
              quedará archivado pero ya no aparecerá en la app).
            </span>
            {opportunityCount > 0 && (
              <span className="block rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive">
                ⚠ Se archivarán también {opportunityCount} oportunidad(es) vinculadas a este
                proyecto.
              </span>
            )}
            <span className="block text-xs text-muted-foreground">
              Los clientes no se eliminan: pueden tener oportunidades en otros proyectos.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sí, eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
