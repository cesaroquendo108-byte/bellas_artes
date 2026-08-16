import type { Metadata } from "next";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StatusPill } from "@/components/ui/motion-effects";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Administración · Bellas Artes",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <div className="workspace-theme min-h-screen">
      <SidebarProvider>
        <AdminSidebar email={profile.email} displayName={profile.displayName} />
        <SidebarInset className="min-h-screen min-w-0 bg-background">
          <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="hidden items-center gap-2 sm:flex"><span className="size-1.5 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(139,92,246,.55)]" /><span className="text-xs text-muted-foreground">Centro de operaciones</span></div>
            <div className="flex-1" />
            <StatusPill state="Cuenta administrativa" tone="info" />
          </header>
          <main className="mx-auto min-w-0 w-full max-w-[1600px] flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
