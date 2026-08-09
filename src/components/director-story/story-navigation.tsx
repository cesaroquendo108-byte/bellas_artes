"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/story", label: "Create Story" },
  { href: "/story/my", label: "My Stories" },
  { href: "/story/community", label: "Historias de la comunidad" },
];

export function StoryNavigation() {
  const pathname = usePathname();
  return (
    <nav className="flex max-w-full gap-1 overflow-x-auto border-b border-white/[0.08] bg-[#0b0b0d] px-4 sm:px-7 lg:px-10">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "min-w-fit border-b-2 px-3 py-4 text-xs transition",
            pathname === item.href
              ? "border-violet-500 text-white"
              : "border-transparent text-slate-500 hover:text-slate-200",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
