"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  CreditCard,
  FolderOpen,
  Gauge,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { logout } from "@/app/login/actions";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type AppSidebarProps = {
  email: string;
  displayName: string | null;
  role: "user" | "admin";
};

const primaryItems = [
  { title: "Centro de mando", href: "/dashboard", icon: Gauge },
  { title: "Biblioteca", href: "/assets", icon: FolderOpen },
  { title: "Texto a voz", href: "/audio/tts", icon: AudioLines },
  { title: "Suite de audio", href: "/audio/my", icon: SlidersHorizontal },
  { title: "Créditos", href: "/credits", icon: ReceiptText },
  { title: "Planes y créditos", href: "/billing", icon: CreditCard },
  { title: "Ajustes", href: "/settings", icon: Settings },
];

export function AppSidebar({ email, displayName, role }: AppSidebarProps) {
  const pathname = usePathname();
  const items = role === "admin"
    ? [...primaryItems, { title: "Revisar pagos", href: "/admin/payments", icon: ShieldCheck }]
    : primaryItems;
  const initials = (displayName || email || "BA")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <Sidebar variant="inset" className="border-r border-white/5 bg-[#0a0a0a] text-slate-300">
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20">
            <Sparkles className="size-4" />
          </span>
          <span>
            <span className="block text-base font-semibold text-white">Bellas Artes</span>
            <span className="block text-[11px] text-slate-500">Estudio creativo IA</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarMenu>
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={active}
                  tooltip={item.title}
                  className="h-10 text-slate-400 hover:bg-white/[0.06] hover:text-white data-[active=true]:bg-primary/15 data-[active=true]:text-violet-300"
                >
                  <item.icon className="size-4" />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
        <SidebarSeparator className="my-4 bg-white/[0.06]" />
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.035] p-2">
          <div className="flex items-center gap-2">
            <Avatar className="size-8 rounded-md">
              <AvatarFallback className="rounded-md bg-primary/15 text-xs font-semibold text-violet-300">
                {initials || "BA"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName || "Mi cuenta"}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md p-2 text-slate-500 transition hover:bg-red-500/10 hover:text-red-300"
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
