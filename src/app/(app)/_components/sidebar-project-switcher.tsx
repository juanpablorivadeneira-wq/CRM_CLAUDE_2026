'use client';

import { useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Building2, Pencil, Hammer, Check, ChevronDown, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setCurrentProjectAction } from './project-switcher.actions';
import { nextUrlForProjectChange } from './project-switcher-url';
import type { CurrentProject } from '@/lib/current-project';

const LINE_ICONS = {
  real_estate: Building2,
  design: Pencil,
  construction: Hammer,
} as const;

export function SidebarProjectSwitcher({
  active,
  projects,
}: {
  active: CurrentProject;
  projects: CurrentProject[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function selectProject(id: string | null) {
    startTransition(async () => {
      await setCurrentProjectAction(id);
      router.push(nextUrlForProjectChange(pathname, id));
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="flex w-full items-center gap-1 px-2 py-1 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/70 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring"
      >
        <span className="truncate">En {active.name}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Cambiar de proyecto
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.map((p) => {
          const Icon = LINE_ICONS[p.businessLine];
          const isActive = p.id === active.id;
          return (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => selectProject(p.id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => selectProject(null)} className="gap-2 text-muted-foreground">
          <X className="h-4 w-4" />
          Quitar proyecto seleccionado
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
