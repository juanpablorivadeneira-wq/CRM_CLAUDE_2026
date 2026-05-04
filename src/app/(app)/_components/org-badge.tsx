import { Badge } from '@/components/ui/badge';
import type { OrgPlan } from '@prisma/client';

const PLAN_LABELS: Record<OrgPlan, string> = {
  trial: 'Trial',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const PLAN_VARIANTS: Record<OrgPlan, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  trial: 'outline',
  starter: 'secondary',
  pro: 'default',
  enterprise: 'default',
};

export function OrgBadge({ name, plan }: { name: string; plan: OrgPlan }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-medium text-foreground">{name}</span>
      <Badge variant={PLAN_VARIANTS[plan]} className="text-xs">
        {PLAN_LABELS[plan]}
      </Badge>
    </div>
  );
}
