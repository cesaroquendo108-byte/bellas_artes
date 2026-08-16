"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, Cpu, CreditCard, FlaskConical, Gauge, LogOut, Sparkles, UsersRound, Workflow } from "lucide-react";

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
import { BellasArtesMark, BellasArtesWordmark } from "@/components/brand/bellas-artes-mark";

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
        { title: "Templates", href: "/admin/templates", icon: Workflow },
        { title: "Testing", href: "/admin/testing", icon: FlaskConical },
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
    <Sidebar variant="inset" className="ba-app-sidebar border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="p-4">
        <Link href="/admin" className="flex items-center gap-3" onClick={() => setOpenMobile(false)}>
          <BellasArtesMark className="size-9 rounded-xl" />
          <span>
            <span className="flex items-center gap-2 text-base font-semibold text-foreground"><BellasArtesWordmark /> <span className="rounded bg-[#ffd34d] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#172740]">Admin</span></span>
            <span className="block text-[11px] text-muted-foreground">Centro de operaciones</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Administración</p>
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
                  className="h-9 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-violet-500/15 data-[active=true]:text-violet-300"
                >
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
        <SidebarSeparator className="my-3 bg-sidebar-border" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link href="/dashboard" onClick={() => setOpenMobile(false)} />} className="h-9 text-muted-foreground hover:bg-violet-500/10 hover:text-violet-300">
              <Sparkles className="size-4" />
              <span>Volver al estudio</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="rounded-xl border border-border bg-card p-2">
          <div className="flex items-center gap-2">
            <Avatar className="size-8 rounded-md">
              <AvatarFallback className="rounded-md bg-violet-500/15 text-xs font-semibold text-violet-300">{initials || "BA"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{displayName || "Administración"}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <form action={logout}>
              <button type="submit" className="rounded-md p-2 text-muted-foreground transition hover:bg-red-500/10 hover:text-red-300" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
