import { getTenantContext, getCurrentOrg } from '@/lib/tenant';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './_components/app-sidebar';
import { UserAvatar } from '@/components/auth/user-avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { OrgBadge } from './_components/org-badge';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantContext();
  const org = await getCurrentOrg(ctx.orgId);

  return (
    <SidebarProvider>
      <AppSidebar
        orgName={org?.name ?? ctx.orgName}
        orgSlug={ctx.orgSlug}
        primaryColor={org?.primaryColor ?? '#3F51B5'}
        isSuperAdmin={ctx.isSuperAdmin}
      />
      <SidebarInset className="bg-background min-h-screen">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
          <SidebarTrigger variant="outline" size="icon" />
          <OrgBadge name={org?.name ?? ctx.orgName} plan={org?.plan ?? 'trial'} />
          <div className="flex-1" />
          <ThemeToggle />
          <UserAvatar />
        </header>
        <main id="main-content" className="flex-1 p-4 sm:px-6 sm:py-2">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
