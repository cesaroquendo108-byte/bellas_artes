import type { Metadata } from "next";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AnimatedMetric, StatusPill } from "@/components/ui/motion-effects";
import { requireUser } from "@/lib/auth";
import { getWalletSummary } from "@/lib/credits/queries";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, wallet] = await Promise.all([requireUser(), getWalletSummary()]);

  return (
    <SidebarProvider>
      <AppSidebar
        email={profile.email}
        displayName={profile.displayName}
        role={profile.role}
      />
      <SidebarInset className="min-h-screen bg-[#0a0a0a]">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-[#0a0a0a]/90 px-4 backdrop-blur-xl sm:px-6">
          <SidebarTrigger className="text-slate-400 hover:text-white" />
          <div className="hidden items-center gap-2 sm:flex"><span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.8)]" /><span className="text-xs text-slate-500">Estudio creativo</span></div>
          <div className="flex-1" />
          <StatusPill state={wallet.unlimited ? "Cuenta administrativa" : "Créditos activos"} tone="neutral" className="hidden sm:inline-flex" />
          <div className="rounded-full border border-violet-300/15 bg-violet-500/[0.08] px-3 py-1.5 text-xs text-slate-400">
            {wallet.unlimited ? (
              <span className="font-semibold text-violet-300">Créditos ilimitados</span>
            ) : (
              <><span className="font-semibold text-violet-300"><AnimatedMetric value={wallet.balance} /></span> créditos</>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
