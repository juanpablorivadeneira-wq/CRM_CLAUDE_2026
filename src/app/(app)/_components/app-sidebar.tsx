'use client';

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
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarFooter,
} from '@/components/ui/sidebar';

type NavItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

const MAIN_NAV: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: Building2, label: 'Proyectos' },
  { href: '/clients', icon: Users, label: 'Clientes' },
  { href: '/pipeline', icon: KanbanSquare, label: 'Pipeline' },
  { href: '/calendar', icon: Calendar, label: 'Calendario' },
  { href: '/reports', icon: BarChart3, label: 'Reportes' },
];

const SETTINGS_NAV: NavItem[] = [
  { href: '/settings/project-types', icon: Layers, label: 'Tipos de proyecto' },
  { href: '/settings/users', icon: Users, label: 'Usuarios' },
  { href: '/settings/roles', icon: ShieldCheck, label: 'Roles y permisos' },
  { href: '/settings/security', icon: KeyRound, label: 'Seguridad' },
  { href: '/settings/general', icon: Settings, label: 'General' },
];

export function AppSidebar({
  orgName,
  orgSlug,
  primaryColor,
  isSuperAdmin,
}: {
  orgName: string;
  orgSlug: string;
  primaryColor: string;
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-sidebar-border">
      <SidebarHeader className="h-14 p-0">
        <Link
          href="/dashboard"
          className="flex h-full w-full items-center justify-center bg-sidebar-primary/10 px-3"
        >
          <div className="flex items-center gap-2 whitespace-nowrap transition-opacity duration-200 group-data-[state=collapsed]:opacity-0">
            <div className="font-headline text-xl font-bold tracking-wider text-sidebar-foreground">
              BK<span className="text-primary mx-1">—</span>CRM
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-data-[state=collapsed]:opacity-100">
            <span className="font-headline text-2xl font-bold text-sidebar-foreground">B</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {MAIN_NAV.map(({ href, icon: Icon, label }) => (
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

        <SidebarSeparator />

        <SidebarMenu>
          {SETTINGS_NAV.map(({ href, icon: Icon, label }) => (
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

        {isSuperAdmin && (
          <>
            <SidebarSeparator />
            <SidebarMenu>
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
            </SidebarMenu>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 text-xs text-sidebar-foreground/60">
        <div className="truncate group-data-[state=collapsed]:hidden">
          {orgName} · /{orgSlug}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
