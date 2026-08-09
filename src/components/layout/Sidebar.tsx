'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Clapperboard, Video, Globe, Music, Image as ImageIcon,
  User, FolderOpen, Palette, Film, Layout, Wrench,
  BookOpen, GraduationCap, FileText, ChevronRight, ChevronLeft,
  Sparkles, Layers, type LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type SidebarItem = {
  icon: LucideIcon;
  label: string;
  href?: string;
  active?: boolean;
};

type SidebarSection = {
  label: string | null;
  items: SidebarItem[];
};

const sidebarSections: SidebarSection[] = [
  {
    label: null, // No label for Home
    items: [
      { icon: Home, label: 'Inicio', href: '/dashboard' },
    ]
  },
  {
    label: 'CREAR',
    items: [
      { icon: Clapperboard, label: 'Director', href: '/director' },
      { icon: Video, label: 'Video', href: '/video' },
      { icon: Globe, label: 'Mundo', href: '/world' },
      { icon: Music, label: 'Audio' },
      { icon: ImageIcon, label: 'Imagen', href: '/image' },
      { icon: User, label: 'Personaje', href: '/characters' },
      { icon: Layers, label: 'MCP', href: '/mcp' },
    ]
  },
  {
    label: 'ACTIVOS',
    items: [
      { icon: FolderOpen, label: 'Proyectos Director', href: '/director/projects' },
      { icon: Film, label: 'Personajes y Mundos', href: '/characters-and-worlds' },
      { icon: Palette, label: 'Kit de Marca', href: '/brand-kits' },
      { icon: Layout, label: 'Media', href: '/media' },
    ]
  },
  {
    label: 'INSPIRACIÓN',
    items: [
      { icon: BookOpen, label: 'Inspire', href: '/inspire' },
      { icon: GraduationCap, label: 'Tutoriales', href: '/tutorials' },
      { icon: FileText, label: 'Blog', href: '/blog' },
    ]
  },
  {
    label: 'HERRAMIENTAS',
    items: [
      { icon: Wrench, label: 'Todas las herramientas' },
    ]
  },
];

export function Sidebar({ collapsed, setCollapsed }: { collapsed: boolean, setCollapsed: (c: boolean) => void }) {
  const pathname = usePathname();
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col fixed left-0 top-16 bottom-0 z-40 bg-black border-r border-normal-border transition-all duration-300 overflow-y-auto overflow-x-hidden",
        collapsed ? "w-[60px]" : "w-[200px]"
      )}>
        {/* Collapse toggle */}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-2 right-2 p-1 text-text-icon-neutral-secondary hover:text-white hover:bg-white/5 rounded-md transition z-10"
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <nav className="flex flex-col gap-1 py-4 px-2 flex-1">
          {sidebarSections.map((section, si) => (
            <div key={si} className={cn(si > 0 && "mt-4")}>
              {section.label && !collapsed && (
                <span className="text-[11px] font-bold text-text-icon-neutral-secondary tracking-wider uppercase px-3 mb-2 block">
                  {section.label}
                </span>
              )}
              {section.label && collapsed && (
                <div className="border-t border-normal-border mx-2 mb-2" />
              )}
              {section.items.map((item, ii) => {
                const active = Boolean(item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
                const className = cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[14px] font-medium transition-colors group",
                  active
                    ? "bg-primary/15 text-white"
                    : "text-text-icon-neutral-secondary hover:text-white hover:bg-white/5",
                  !item.href && "cursor-not-allowed opacity-45",
                  collapsed && "justify-center px-0"
                );
                const content = <><item.icon className={cn("w-[18px] h-[18px] flex-shrink-0", active && "text-primary")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && !item.href && <span className="ml-auto text-[9px]">Próximamente</span>}
                  {!collapsed && active && (
                    <ChevronRight className="w-3 h-3 ml-auto opacity-50" />
                  )}</>;
                return item.href ? <Link
                  key={ii}
                  href={item.href}
                  className={cn(
                    className
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {content}
                </Link> : <span key={ii} className={className} aria-disabled="true" title={`${item.label} · Próximamente`}>{content}</span>;
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Upgrade CTA */}
        {!collapsed && (
          <div className="p-3 border-t border-normal-border">
            <button className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl text-[13px] font-bold transition shadow-oa">
              <Sparkles className="w-4 h-4" />
              Comenzar Gratis
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
