"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/story", label: "Crear historia" },
  { href: "/story/my", label: "Mis historias" },
  { href: "/story/community", label: "Historias de la comunidad" },
];

export function StoryNavigation() {
  const pathname = usePathname();
  return (
    <nav className="flex max-w-full gap-1 overflow-x-auto border-b border-[#e6ded1] bg-white px-4 sm:px-7 lg:px-10">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "min-w-fit border-b-2 px-3 py-4 text-xs transition",
            pathname === item.href
              ? "border-violet-600 font-medium text-[#6d28d9]"
              : "border-transparent text-[#817887] hover:bg-[#f8f4ff] hover:text-[#3a3342]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
