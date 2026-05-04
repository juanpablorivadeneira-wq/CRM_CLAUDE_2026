'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Pencil, Hammer } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LINE_ICONS = {
  real_estate: Building2,
  design: Pencil,
  construction: Hammer,
} as const;

export function ProjectSelector({
  projects,
  selectedId,
}: {
  projects: { id: string; name: string; businessLine: keyof typeof LINE_ICONS }[];
  selectedId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(projectId: string) {
    const params = new URLSearchParams(searchParams);
    params.set('projectId', projectId);
    router.push(`/pipeline?${params.toString()}`);
  }

  return (
    <Select value={selectedId} onValueChange={onChange}>
      <SelectTrigger className="w-[260px]">
        <SelectValue placeholder="Selecciona proyecto…" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((p) => {
          const Icon = LINE_ICONS[p.businessLine];
          return (
            <SelectItem key={p.id} value={p.id}>
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {p.name}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
