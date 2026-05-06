import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center gap-1 text-sm text-muted-foreground mb-2 mt-1',
        className,
      )}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn('truncate', isLast && 'text-foreground font-medium')}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
