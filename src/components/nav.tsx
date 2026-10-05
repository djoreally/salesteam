"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Mission Control", hint: "goal → launch" },
  { href: "/providers", label: "Providers", hint: "capability matrix" },
  { href: "/catalog", label: "Catalog", hint: "products & listings" },
  { href: "/operations", label: "Operations", hint: "orders · fulfill · optimize" },
  { href: "/api-surface", label: "API Surface", hint: "commerce.* primitives" },
  { href: "/settings", label: "Settings", hint: "workspace & controls" },
];

export function Nav() {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-0.5 lg:pb-5">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm transition ${
              active
                ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100"
            }`}
          >
            <span className="block font-medium">{l.label}</span>
            <span className="hidden text-[11px] text-zinc-500 lg:block">{l.hint}</span>
          </Link>
        );
      })}
      <button onClick={logout} className="shrink-0 rounded-lg px-3 py-2 text-left text-sm text-zinc-500 transition hover:bg-zinc-800/60 hover:text-zinc-200">
        <span className="block font-medium">Sign out</span>
        <span className="hidden text-[11px] text-zinc-600 lg:block">end this session</span>
      </button>
    </nav>
  );
}
