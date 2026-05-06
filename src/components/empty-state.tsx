import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed p-10 text-center flex flex-col items-center gap-3',
        className,
      )}
    >
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/50" />}
      <div className="space-y-1">
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
