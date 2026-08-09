"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Boxes,
  Clapperboard,
  Compass,
  CreditCard,
  FolderOpen,
  Gauge,
  Globe2,
  GraduationCap,
  Image as ImageIcon,
  LogOut,
  Newspaper,
  Palette,
  PlugZap,
  ReceiptText,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Video,
  Volume2,
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

const studioItems = [
  { title: "Centro de mando", href: "/dashboard", icon: Gauge },
  { title: "Image Studio", href: "/image", icon: ImageIcon },
  { title: "Video Suite", href: "/video", icon: Video },
  { title: "Audio Suite", icon: Volume2, disabled: true },
  { title: "Director", href: "/director", icon: Clapperboard },
  { title: "Story", href: "/story", icon: BookOpen },
  { title: "Personajes", href: "/characters", icon: UsersRound },
  { title: "Mundos", href: "/world", icon: Globe2 },
  { title: "Characters & Worlds", href: "/characters-and-worlds", icon: Boxes },
  { title: "Brand Kits", href: "/brand-kits", icon: Palette },
  { title: "Media", href: "/media", icon: FolderOpen },
  { title: "Biblioteca", href: "/assets", icon: FolderOpen },
];

const discoverItems = [
  { title: "Inspire", href: "/inspire", icon: Compass },
  { title: "Tutorials", href: "/tutorials", icon: GraduationCap },
  { title: "Blog", href: "/blog", icon: Newspaper },
  { title: "MCP", href: "/mcp", icon: PlugZap },
  { title: "Publicar en Inspire", href: "/community/publish", icon: Send },
];

const accountItems = [
  { title: "Créditos", href: "/credits", icon: ReceiptText },
  { title: "Planes y créditos", href: "/billing", icon: CreditCard },
  { title: "Ajustes", href: "/settings", icon: Settings },
];

export function AppSidebar({ email, displayName, role }: AppSidebarProps) {
  const pathname = usePathname();
  const adminItems = role === "admin"
    ? [
        { title: "Revisar pagos", href: "/admin/payments", icon: ShieldCheck },
        { title: "Moderar comunidad", href: "/admin/community", icon: ShieldCheck },
      ]
    : [];
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
        <SidebarSection label="Studio" items={studioItems} pathname={pathname} />
        <SidebarSeparator className="my-3 bg-white/[0.06]" />
        <SidebarSection label="Discover" items={discoverItems} pathname={pathname} />
        <SidebarSeparator className="my-3 bg-white/[0.06]" />
        <SidebarSection label="Cuenta" items={accountItems} pathname={pathname} />
        {adminItems.length > 0 && (
          <>
            <SidebarSeparator className="my-3 bg-white/[0.06]" />
            <SidebarSection label="Admin" items={adminItems} pathname={pathname} />
          </>
        )}
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

type SidebarItem = {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
};

function SidebarSection({
  label,
  items,
  pathname,
}: {
  label: string;
  items: SidebarItem[];
  pathname: string;
}) {
  return (
    <div>
      <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-600">
        {label}
      </p>
      <SidebarMenu>
        {items.map((item) => {
          const active = Boolean(
            item.href &&
              (pathname === item.href || pathname.startsWith(`${item.href}/`)),
          );
          return (
            <SidebarMenuItem key={item.href ?? item.title}>
              <SidebarMenuButton
                render={item.href ? <Link href={item.href} /> : undefined}
                isActive={active}
                tooltip={item.disabled ? `${item.title} · Próximamente` : item.title}
                disabled={item.disabled}
                className="h-9 text-slate-400 hover:bg-white/[0.06] hover:text-white data-[active=true]:bg-primary/15 data-[active=true]:text-violet-300 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <item.icon className="size-4" />
                <span>{item.title}</span>
                {item.disabled && <span className="ml-auto text-[9px]">Próximamente</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );
}
