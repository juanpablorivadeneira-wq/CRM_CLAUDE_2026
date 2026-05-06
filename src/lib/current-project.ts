import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';

export const CURRENT_PROJECT_COOKIE = 'current_project_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export type CurrentProject = {
  id: string;
  name: string;
  businessLine: 'real_estate' | 'design' | 'construction';
  imageUrl: string | null;
};

export async function getCurrentProjectId(): Promise<string | null> {
  const c = await cookies();
  return c.get(CURRENT_PROJECT_COOKIE)?.value ?? null;
}

export const getCurrentProject = cache(async (): Promise<CurrentProject | null> => {
  const id = await getCurrentProjectId();
  if (!id) return null;

  const ctx = await getTenantContext();
  const project = await db.project.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    select: { id: true, name: true, businessLine: true, imageUrl: true },
  });
  return project;
});

export const listSwitcherProjects = cache(async (): Promise<CurrentProject[]> => {
  const ctx = await getTenantContext();
  const projects = await db.project.findMany({
    where: { orgId: ctx.orgId, deletedAt: null },
    select: { id: true, name: true, businessLine: true, imageUrl: true },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
    take: 100,
  });
  return projects;
});

export { COOKIE_MAX_AGE };
