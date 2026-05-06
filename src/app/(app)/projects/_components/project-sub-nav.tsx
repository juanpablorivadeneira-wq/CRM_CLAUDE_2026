'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, KanbanSquare, Users, Calendar, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProjectSubNav({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  const tabs = [
    { href: base, label: 'Resumen', icon: FileText, exact: true },
    { href: `${base}/pipeline`, label: 'Pipeline', icon: KanbanSquare },
    { href: `${base}/clients`, label: 'Clientes', icon: Users },
    { href: `${base}/calendar`, label: 'Calendario', icon: Calendar },
    { href: `${base}/reports`, label: 'Reportes', icon: BarChart3 },
  ];

  return (
    <div className="-mx-4 mb-4 border-b sm:-mx-6">
      <div className="flex items-center gap-1 overflow-x-auto px-4 sm:px-6">
        <span className="mr-3 truncate text-sm font-medium text-muted-foreground sm:max-w-[160px]">
          {projectName}
        </span>
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
