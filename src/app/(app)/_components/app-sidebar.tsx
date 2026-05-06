'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  KanbanSquare,
  Calendar,
  BarChart3,
  Settings,
  ShieldCheck,
  KeyRound,
  Bot,
  Layers,
  ChevronDown,
  Folder,
  FileText,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { SidebarProjectSwitcher } from './sidebar-project-switcher';
import type { CurrentProject } from '@/lib/current-project';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

const GENERAL_NAV: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/calendar', icon: Calendar, label: 'Calendario' },
];

const DIRECTORY_NAV: NavItem[] = [
  { href: '/projects', icon: Folder, label: 'Todos los proyectos' },
  { href: '/pipeline', icon: KanbanSquare, label: 'Pipeline global' },
  { href: '/reports', icon: BarChart3, label: 'Reportes' },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/settings/project-types', icon: Layers, label: 'Tipos de proyecto' },
  { href: '/settings/users', icon: Users, label: 'Usuarios' },
  { href: '/settings/roles', icon: ShieldCheck, label: 'Roles y permisos' },
  { href: '/settings/security', icon: KeyRound, label: 'Seguridad' },
  { href: '/settings/general', icon: Settings, label: 'General' },
];

function projectNav(projectId: string): NavItem[] {
  const base = `/projects/${projectId}`;
  return [
    { href: base, icon: FileText, label: 'Resumen' },
    { href: `${base}/pipeline`, icon: KanbanSquare, label: 'Pipeline' },
    { href: `${base}/clients`, icon: Users, label: 'Clientes' },
    { href: `${base}/calendar`, icon: Calendar, label: 'Calendario' },
    { href: `${base}/reports`, icon: BarChart3, label: 'Reportes' },
  ];
}

function projectIdFromPath(pathname: string): string | null {
  const match = /^\/projects\/([^/]+)/.exec(pathname);
  return match ? match[1] : null;
}

export function AppSidebar({
  orgName,
  orgSlug,
  isSuperAdmin,
  currentProject,
  projects,
}: {
  orgName: string;
  orgSlug: string;
  primaryColor: string;
  isSuperAdmin: boolean;
  currentProject: CurrentProject | null;
  projects: CurrentProject[];
}) {
  const pathname = usePathname();
  const urlProjectId = projectIdFromPath(pathname);
  const urlProject = urlProjectId ? projects.find((p) => p.id === urlProjectId) ?? null : null;
  const activeProject = urlProject ?? currentProject;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const [adminOpen, setAdminOpen] = useState(
    pathname.startsWith('/settings') || pathname.startsWith('/super-admin')
  );

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-sidebar-border">
      <SidebarHeader className="h-14 p-0">
        <Link
          href="/dashboard"
          className="relative flex h-full w-full items-center justify-center bg-sidebar-primary/10 px-3"
        >
          <div className="flex items-center justify-center transition-opacity duration-200 group-data-[state=collapsed]:opacity-0">
            <Image
              src="/logo.png"
              alt="BuildKontrol"
              width={919}
              height={169}
              priority
              className="h-7 w-auto"
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-data-[state=collapsed]:opacity-100">
            <span className="font-headline text-2xl font-bold text-sidebar-foreground">B</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {GENERAL_NAV.map(({ href, icon: Icon, label }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)} tooltip={{ children: label }}>
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {activeProject && (
          <SidebarGroup>
            <SidebarGroupLabel asChild className="p-0">
              <SidebarProjectSwitcher active={activeProject} projects={projects} />
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectNav(activeProject.id).map(({ href, icon: Icon, label }) => (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === href}
                      tooltip={{ children: label }}
                    >
                      <Link href={href}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Directorio global</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DIRECTORY_NAV.map(({ href, icon: Icon, label }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)} tooltip={{ children: label }}>
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Collapsible open={adminOpen} onOpenChange={setAdminOpen} className="group/admin">
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel
                role="button"
                className="cursor-pointer hover:text-sidebar-foreground"
              >
                <span className="flex-1">Administración</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    adminOpen && 'rotate-180'
                  )}
                />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ADMIN_NAV.map(({ href, icon: Icon, label }) => (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(href)}
                        tooltip={{ children: label }}
                      >
                        <Link href={href}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive('/super-admin')}
                        tooltip={{ children: 'Super Admin' }}
                      >
                        <Link href="/super-admin">
                          <Bot />
                          <span>Super Admin</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="p-3 text-xs text-sidebar-foreground/60">
        <div className="truncate group-data-[state=collapsed]:hidden">
          {orgName} · /{orgSlug}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
