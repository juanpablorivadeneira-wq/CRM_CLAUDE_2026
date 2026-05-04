'use client';

import { Building } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Fase 0: selector vacío — se conecta a Prisma en Fase 1.
export function ProjectSwitcher() {
  return (
    <Select disabled>
      <SelectTrigger className="w-auto md:w-[250px] text-base">
        <Building className="mr-2 h-5 w-5 hidden md:block" />
        <SelectValue placeholder="Seleccionar proyecto…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sin proyectos cargados</SelectItem>
      </SelectContent>
    </Select>
  );
}
