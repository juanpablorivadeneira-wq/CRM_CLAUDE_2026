'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ReportsProjectFilter({
  projects,
  selectedId,
}: {
  projects: { id: string; name: string }[];
  selectedId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === 'all') params.delete('projectId');
    else params.set('projectId', value);
    const qs = params.toString();
    router.push(`/reports${qs ? `?${qs}` : ''}`);
  }

  return (
    <Select value={selectedId ?? 'all'} onValueChange={onChange}>
      <SelectTrigger className="w-[260px]">
        <SelectValue placeholder="Todos los proyectos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los proyectos</SelectItem>
        {projects.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
