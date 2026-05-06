'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Building2, Pencil, Hammer, Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { setCurrentProjectAction } from './project-switcher.actions';
import type { CurrentProject } from '@/lib/current-project';

const LINE_ICONS = {
  real_estate: Building2,
  design: Pencil,
  construction: Hammer,
} as const;

const LINE_LABELS = {
  real_estate: 'Inmobiliaria',
  design: 'Diseño',
  construction: 'Construcción',
} as const;

export function ProjectSwitcher({
  projects,
  currentProject,
}: {
  projects: CurrentProject[];
  currentProject: CurrentProject | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  function selectProject(id: string | null) {
    startTransition(async () => {
      await setCurrentProjectAction(id);
      setOpen(false);

      const projectMatch = /^\/projects\/[^/]+(\/[^?]*)?/.exec(pathname);
      if (projectMatch && id) {
        const section = projectMatch[1] ?? '';
        router.push(`/projects/${id}${section}`);
      } else if (projectMatch && !id) {
        router.push('/projects');
      } else {
        router.refresh();
      }
    });
  }

  const currentProjectFromUrl = useMemo(() => {
    const m = /^\/projects\/([^/]+)/.exec(pathname);
    if (!m) return null;
    return projects.find((p) => p.id === m[1]) ?? null;
  }, [projects, pathname]);

  const displayed = currentProjectFromUrl ?? currentProject;
  const CurrentIcon = displayed ? LINE_ICONS[displayed.businessLine] : Building2;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Cambiar proyecto"
          className="h-9 w-[220px] justify-between gap-2 px-2"
          disabled={pending}
        >
          <span className="flex min-w-0 items-center gap-2">
            <CurrentIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm">
              {displayed ? displayed.name : 'Todos los proyectos'}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proyecto…"
            className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="ml-2 hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </div>

        <div className="max-h-[320px] overflow-y-auto py-1">
          <button
            type="button"
            onClick={() => selectProject(null)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
              !displayed && 'bg-accent/50'
            )}
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1">Todos los proyectos</span>
            {!displayed && <Check className="h-4 w-4" />}
          </button>

          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No hay proyectos que coincidan.
            </div>
          ) : (
            filtered.map((p) => {
              const Icon = LINE_ICONS[p.businessLine];
              const active = displayed?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProject(p.id)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
                    active && 'bg-accent/50'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {LINE_LABELS[p.businessLine]}
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {displayed && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => selectProject(null)}
            >
              <X className="mr-2 h-4 w-4" />
              Quitar proyecto seleccionado
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
