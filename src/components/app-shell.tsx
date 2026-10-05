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
    <div className="flex min-h-screen flex-col bg-[#f7f8fc] lg:flex-row">
      <aside className="shrink-0 border-b border-slate-200 bg-white lg:w-72 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-sky-400 to-emerald-400 text-sm font-black text-white shadow-sm">ST</div>
          <div className="leading-tight">
            <Link href="/dashboard" className="block text-base font-semibold text-slate-950">SalesTeam</Link>
            <span className="text-sm text-slate-400">your AI commerce team</span>
          </div>
        </div>
        <Nav />
        <div className="hidden px-5 pb-6 text-sm leading-6 text-slate-400 lg:block">Specialized agents work through one workspace, one permission model and certified commerce connections.</div>
      </aside>
      <main className="flex-1 overflow-x-hidden bg-[#f7f8fc]">{children}</main>
    </div>
  );
}
