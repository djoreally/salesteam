"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";

const PUBLIC_PATHS = new Set(["/", "/login", "/signup", "/forgot-password", "/reset-password"]);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const publicPage = PUBLIC_PATHS.has(pathname);

  if (publicPage) return <main className="min-h-screen">{children}</main>;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-zinc-800/80 bg-[#0a0d13] lg:w-64 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-black text-black">ST</div>
          <div className="leading-tight">
            <Link href="/dashboard" className="block text-sm font-semibold text-zinc-100">SalesTeam</Link>
            <span className="text-[11px] text-zinc-500">commerce operating system</span>
          </div>
        </div>
        <Nav />
        <div className="hidden px-5 pb-6 text-[11px] leading-relaxed text-zinc-600 lg:block">One workspace controls authorized storefront, marketplace, fulfillment and commerce APIs.</div>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
