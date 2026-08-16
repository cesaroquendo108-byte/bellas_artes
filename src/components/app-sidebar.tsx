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
  { title: "Inicio", href: "/dashboard", icon: Gauge },
  { title: "Imagen", href: "/image", icon: ImageIcon },
  { title: "Video", href: "/video", icon: Video },
  { title: "Audio", href: "/audio/my", icon: Volume2 },
  { title: "Director", href: "/director", icon: Clapperboard },
  { title: "Personajes", href: "/characters", icon: UsersRound },
  { title: "Mundos", href: "/world", icon: Globe2 },
];

const organizeItems = [
  { title: "Biblioteca", href: "/assets", icon: FolderOpen },
  { title: "Centro de medios", href: "/media", icon: FolderOpen },
  { title: "Proyectos", href: "/director/projects", icon: Clapperboard },
  { title: "Historias", href: "/story", icon: BookOpen },
  { title: "Personajes y mundos", href: "/characters-and-worlds", icon: Boxes },
  { title: "Kits de marca", href: "/brand-kits", icon: Palette },
];

const discoverItems = [
  { title: "Inspiración", href: "/inspire", icon: Compass },
  { title: "Tutoriales", href: "/tutorials", icon: GraduationCap },
  { title: "Blog", href: "/blog", icon: Newspaper },
  { title: "MCP", href: "/mcp", icon: PlugZap },
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
        { title: "Administración", href: "/admin", icon: ShieldCheck },
      ]
    : [];
  const initials = (displayName || email || "BA")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-[#e6ded1] bg-[#fcfaf5] text-[#4c4455]">
      <SidebarHeader className="p-3">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-2xl px-1 py-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-200/70">
            <Sparkles className="size-4" />
          </span>
          <span className="group-data-[collapsible=icon]:hidden">
            <span className="block text-base font-semibold tracking-tight text-[#241f2e]">Bellas Artes</span>
            <span className="block text-[11px] text-[#827986]">Estudio creativo IA</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        <SidebarSection label="Crear" items={studioItems} pathname={pathname} />
        <SidebarSeparator className="my-3 bg-[#e6ded1]" />
        <SidebarSection label="Organizar" items={organizeItems} pathname={pathname} />
        <SidebarSeparator className="my-3 bg-[#e6ded1]" />
        <SidebarSection label="Descubrir" items={discoverItems} pathname={pathname} />
        <SidebarSeparator className="my-3 bg-[#e6ded1]" />
        <SidebarSection label="Cuenta" items={accountItems} pathname={pathname} />
        {adminItems.length > 0 && (
          <>
            <SidebarSeparator className="my-3 bg-[#e6ded1]" />
            <SidebarSection label="Administración" items={adminItems} pathname={pathname} />
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="rounded-2xl border border-[#e6ded1] bg-white/80 p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Avatar className="size-8 rounded-md">
              <AvatarFallback className="rounded-md bg-violet-100 text-xs font-semibold text-violet-700">
                {initials || "BA"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#241f2e]">{displayName || "Mi cuenta"}</p>
              <p className="truncate text-xs text-[#827986]">{email}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-xl p-2 text-[#827986] transition hover:bg-red-50 hover:text-red-600"
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
      <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#a097a4] group-data-[collapsible=icon]:hidden">
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
                className="h-10 rounded-xl text-[#6f6878] hover:bg-white hover:text-[#4c1d95] data-[active=true]:bg-violet-100 data-[active=true]:font-semibold data-[active=true]:text-violet-700 disabled:cursor-not-allowed disabled:opacity-45"
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
