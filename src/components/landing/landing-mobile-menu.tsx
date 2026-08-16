"use client";

import Link from "next/link";
import { useState } from "react";
import { MorphIcon } from "morphicons/react";
import { Menu, X } from "lucide";

const navigationItems = [
  { href: "/inspire", label: "Inspiración" },
  { href: "/tutorials", label: "Tutoriales" },
  { href: "/blog", label: "Blog" },
  { href: "/mcp", label: "MCP" },
  { href: "/login", label: "Entrar" },
];

/**
 * The public mobile navigation is intentionally a small client boundary. It
 * keeps the landing server-rendered while providing a clear menu-to-close
 * affordance for people navigating on a phone.
 */
export function LandingMobileMenu() {
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <div className="relative ml-auto sm:hidden">
      <button
        type="button"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-controls="landing-mobile-navigation"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex size-10 items-center justify-center rounded-xl border border-white/10 text-zinc-300 transition hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300"
      >
        <MorphIcon
          icon={open ? X : Menu}
          size={20}
          strokeWidth={2}
          spring="snappy"
          reducedMotion="user"
        />
      </button>

      {open ? (
        <div
          id="landing-mobile-navigation"
          className="absolute right-0 top-[calc(100%+8px)] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-white/10 bg-[#111114] p-3 shadow-2xl"
        >
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="block rounded-xl px-4 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login?next=/dashboard"
            onClick={closeMenu}
            className="mt-2 block rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Abrir mi estudio
          </Link>
        </div>
      ) : null}
    </div>
  );
}
