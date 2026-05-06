import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getTenantContext } from '@/lib/tenant';
import { ProjectSubNav } from '../_components/project-sub-nav';

export default async function ProjectScopedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getTenantContext();

  const project = await db.project.findFirst({
    where: { id, orgId: ctx.orgId, deletedAt: null },
    select: { id: true, name: true, businessLine: true, status: true },
  });
  if (!project) notFound();

  return (
    <>
      <ProjectSubNav
        projectId={project.id}
        projectName={project.name}
        businessLine={project.businessLine}
        status={project.status}
      />
      {children}
    </>
  );
}
