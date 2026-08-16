"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Cpu, CreditCard, Gauge, LogOut, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

import { logout } from "@/app/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const baseAdminItems = [
  { title: "Dashboard", href: "/admin", icon: Gauge },
  { title: "Usuarios", href: "/admin/users", icon: UsersRound },
  { title: "Pagos", href: "/admin/payments", icon: CreditCard },
  { title: "Moderación", href: "/admin/community", icon: UsersRound },
];

export function AdminSidebar({ email, displayName }: { email: string; displayName: string | null }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const adminItems = email.toLowerCase() === "cesaroquendo10@gmail.com"
    ? [
        ...baseAdminItems,
        { title: "Modelos", href: "/admin/models", icon: BrainCircuit },
        { title: "GPUs", href: "/admin/gpus", icon: Cpu },
      ]
    : baseAdminItems;
  const initials = (displayName || email || "BA")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <Sidebar variant="inset" className="border-r border-amber-300/10 bg-[#080808] text-slate-300">
      <SidebarHeader className="p-4">
        <Link href="/admin" className="flex items-center gap-3" onClick={() => setOpenMobile(false)}>
          <span className="flex size-9 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300 shadow-lg shadow-amber-950/20">
            <ShieldCheck className="size-4" />
          </span>
          <span>
            <span className="flex items-center gap-2 text-base font-semibold text-white">Bellas Artes <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">Admin</span></span>
            <span className="block text-[11px] text-slate-500">Centro de operaciones</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-600">Administración</p>
        <SidebarMenu>
          {adminItems.map((item) => {
            const active = item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                  isActive={active}
                  tooltip={item.title}
                  className="h-9 text-slate-400 hover:bg-white/[0.06] hover:text-white data-[active=true]:bg-amber-400/10 data-[active=true]:text-amber-300"
                >
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
        <SidebarSeparator className="my-3 bg-white/[0.06]" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/dashboard" onClick={() => setOpenMobile(false)} />} className="h-9 text-slate-500 hover:bg-violet-400/10 hover:text-violet-200">
              <Sparkles className="size-4" />
              <span>Volver al estudio</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-2">
          <div className="flex items-center gap-2">
            <Avatar className="size-8 rounded-md">
              <AvatarFallback className="rounded-md bg-amber-400/10 text-xs font-semibold text-amber-300">{initials || "BA"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName || "Administración"}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
            <form action={logout}>
              <button type="submit" className="rounded-md p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
