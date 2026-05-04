'use client';

import { MoreHorizontal, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { deactivateUser, reactivateUser } from '../actions';
import type { UserStatus } from '@prisma/client';

export function UserRowActions({
  userId,
  status,
  isSelf,
}: {
  userId: string;
  status: UserStatus;
  isSelf: boolean;
}) {
  const { toast } = useToast();

  async function handle(action: 'deactivate' | 'reactivate') {
    const fn = action === 'deactivate' ? deactivateUser : reactivateUser;
    const res = await fn(userId);
    if (!res.ok) {
      toast({ variant: 'destructive', title: 'Error', description: res.error });
      return;
    }
    toast({ title: action === 'deactivate' ? 'Usuario desactivado' : 'Usuario reactivado' });
  }

  if (isSelf) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === 'active' ? (
          <DropdownMenuItem className="text-destructive" onClick={() => handle('deactivate')}>
            <UserX className="mr-2 h-4 w-4" /> Desactivar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => handle('reactivate')}>
            <UserCheck className="mr-2 h-4 w-4" /> Reactivar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
