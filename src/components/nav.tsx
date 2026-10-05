"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Mission Control", hint: "goal → launch" },
  { href: "/agents", label: "Agent Team", hint: "specialists · orchestration" },
  { href: "/product-studio", label: "Product Studio", hint: "design → mockup → publish" },
  { href: "/providers", label: "Stores & Fulfillment", hint: "connected accounts" },
  { href: "/catalog", label: "Catalog", hint: "products & listings" },
  { href: "/operations", label: "Operations", hint: "orders · fulfill · optimize" },
  { href: "/settings", label: "Settings", hint: "account · workspace · integrations" },
];

export function Nav() {
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:gap-1 lg:pb-5">
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={`shrink-0 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}>
            <span className="block font-semibold">{l.label}</span>
            <span className="hidden text-sm text-slate-400 lg:block">{l.hint}</span>
          </Link>
        );
      })}
      <button onClick={logout} className="shrink-0 rounded-xl px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-rose-50 hover:text-rose-700">
        <span className="block font-semibold">Sign out</span>
        <span className="hidden text-sm text-slate-400 lg:block">return to homepage</span>
      </button>
    </nav>
  );
}
