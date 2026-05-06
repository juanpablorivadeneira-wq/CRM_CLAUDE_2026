'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, KanbanSquare, Users, Calendar, BarChart3, Building2, Pencil, Hammer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

const STATUS_LABELS = {
  active: 'Activo',
  paused: 'En pausa',
  sold_out: 'Agotado',
  cancelled: 'Cancelado',
} as const;

const STATUS_VARIANTS = {
  active: 'default',
  paused: 'secondary',
  sold_out: 'outline',
  cancelled: 'destructive',
} as const;

type BusinessLine = keyof typeof LINE_LABELS;
type ProjectStatus = keyof typeof STATUS_LABELS;

export function ProjectSubNav({
  projectId,
  projectName,
  businessLine,
  status,
}: {
  projectId: string;
  projectName: string;
  businessLine: BusinessLine;
  status: ProjectStatus;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const Icon = LINE_ICONS[businessLine];

  const tabs = [
    { href: base, label: 'Resumen', icon: FileText, exact: true },
    { href: `${base}/pipeline`, label: 'Pipeline', icon: KanbanSquare },
    { href: `${base}/clients`, label: 'Clientes', icon: Users },
    { href: `${base}/calendar`, label: 'Calendario', icon: Calendar },
    { href: `${base}/reports`, label: 'Reportes', icon: BarChart3 },
  ];

  return (
    <div className="-mx-4 mb-6 border-b bg-card sm:-mx-6">
      <div className="px-4 pt-4 sm:px-6">
        <nav className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground">
            Proyectos
          </Link>
          <span>/</span>
          <span className="text-foreground">{projectName}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-3 pb-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="truncate text-xl font-semibold tracking-tight">{projectName}</h2>
          <Badge variant="outline" className="text-xs">
            {LINE_LABELS[businessLine]}
          </Badge>
          <Badge variant={STATUS_VARIANTS[status]} className="text-xs">
            {STATUS_LABELS[status]}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto px-4 sm:px-6">
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
