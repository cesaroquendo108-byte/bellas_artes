import type { Metadata } from "next";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { WorkspaceMobileNav } from "@/components/workspace/workspace-mobile-nav";
import { requireUser } from "@/lib/auth";
import { getWalletSummary } from "@/lib/credits/queries";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, wallet] = await Promise.all([requireUser(), getWalletSummary()]);

  return (
    <SidebarProvider className="workspace-theme">
      <AppSidebar
        email={profile.email}
        displayName={profile.displayName}
        role={profile.role}
      />
      <SidebarInset className="min-h-screen min-w-0 bg-transparent">
        <WorkspaceHeader balance={wallet.balance} unlimited={wallet.unlimited} />
        <main className="workspace-page mx-auto w-full max-w-[1440px] flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">
          {children}
        </main>
        <WorkspaceMobileNav role={profile.role} />
      </SidebarInset>
    </SidebarProvider>
  );
}
