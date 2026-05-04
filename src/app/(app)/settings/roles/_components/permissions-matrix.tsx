'use client';

import { useState, useTransition } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { updateRolePermissions } from '../actions';

const ACTIONS = ['ver', 'crear', 'editar', 'eliminar', 'aprobar', 'exportar'] as const;
type Action = (typeof ACTIONS)[number];

type RoleData = {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: { module: string; action: string }[];
};

type Props = {
  roles: RoleData[];
  modules: Record<string, string>;
  readOnly: boolean;
};

export function PermissionsMatrix({ roles, modules, readOnly }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeRoleId, setActiveRoleId] = useState(roles[0]?.id);
  const [permissions, setPermissions] = useState<Record<string, Set<Action>>>(() =>
    Object.fromEntries(
      roles.map((r) => [
        r.id,
        new Set(r.permissions.map((p) => p.action as Action)),
      ]),
    ) as any,
  );

  // Reorganizar por módulo+rol para acceso rápido
  const [byRoleModule, setByRoleModule] = useState<Map<string, Set<Action>>>(() => {
    const m = new Map<string, Set<Action>>();
    for (const r of roles) {
      for (const p of r.permissions) {
        const key = `${r.id}::${p.module}`;
        if (!m.has(key)) m.set(key, new Set());
        m.get(key)!.add(p.action as Action);
      }
    }
    return m;
  });

  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const moduleEntries = Object.entries(modules);

  function toggle(roleId: string, module: string, action: Action) {
    const key = `${roleId}::${module}`;
    setByRoleModule((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(key) ?? []);
      if (set.has(action)) set.delete(action);
      else set.add(action);
      next.set(key, set);
      return next;
    });
    setDirty((prev) => new Set(prev).add(roleId));
  }

  async function save(roleId: string) {
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;

    const permsByModule: Record<string, Action[]> = {};
    for (const module of Object.keys(modules)) {
      const set = byRoleModule.get(`${roleId}::${module}`);
      if (set && set.size > 0) permsByModule[module] = Array.from(set);
    }

    startTransition(async () => {
      const res = await updateRolePermissions({ roleId, permissions: permsByModule });
      if (!res.ok) {
        toast({ variant: 'destructive', title: 'Error', description: res.error });
        return;
      }
      toast({ title: `Permisos de "${role.name}" guardados` });
      setDirty((prev) => {
        const next = new Set(prev);
        next.delete(roleId);
        return next;
      });
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr]">
      {/* Lista de roles */}
      <div className="border-b lg:border-b-0 lg:border-r">
        <div className="p-4 text-xs font-medium uppercase text-muted-foreground">
          Roles
        </div>
        <div className="divide-y">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRoleId(r.id)}
              className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                activeRoleId === r.id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  {r.name}
                </span>
                {dirty.has(r.id) && (
                  <Badge variant="outline" className="text-xs">Sin guardar</Badge>
                )}
              </div>
              {r.isSystem && (
                <span className="text-xs text-muted-foreground">Predefinido</span>
              )}
              {r.description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.description}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Matriz de permisos */}
      <div>
        {activeRoleId ? (
          <>
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h3 className="font-medium">
                  Permisos de {roles.find((r) => r.id === activeRoleId)?.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Marca los permisos que tendrá este rol en cada módulo.
                </p>
              </div>
              {!readOnly && dirty.has(activeRoleId) && (
                <Button onClick={() => save(activeRoleId)} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" /> Guardar
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">Módulo</TableHead>
                  {ACTIONS.map((a) => (
                    <TableHead key={a} className="text-center capitalize">{a}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {moduleEntries.map(([key, label]) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{label}</TableCell>
                    {ACTIONS.map((action) => {
                      const checked = byRoleModule.get(`${activeRoleId}::${key}`)?.has(action) ?? false;
                      return (
                        <TableCell key={action} className="text-center">
                          <Checkbox
                            checked={checked}
                            disabled={readOnly}
                            onCheckedChange={() => toggle(activeRoleId, key, action)}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            Selecciona un rol para ver sus permisos.
          </div>
        )}
      </div>
    </div>
  );
}
