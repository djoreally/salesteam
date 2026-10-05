import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commerce Control Plane · Autonomous Merchant Agent",
  description:
    "One Commerce Agent, a normalized control plane, and provider adapters for Shopify, WooCommerce, Etsy, eBay, Printify, Printful, Square, Amazon, Walmart and TikTok Shop.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07090d] text-zinc-200 antialiased">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="shrink-0 border-b border-zinc-800/80 bg-[#0a0d13] lg:w-64 lg:border-r lg:border-b-0">
            <div className="flex items-center gap-3 px-5 py-5">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-black text-black">
                CP
              </div>
              <div className="leading-tight">
                <Link href="/" className="block text-sm font-semibold text-zinc-100">
                  Commerce Agent
                </Link>
                <span className="text-[11px] text-zinc-500">normalized control plane</span>
              </div>
            </div>
            <Nav />
            <div className="hidden px-5 pb-6 text-[11px] leading-relaxed text-zinc-600 lg:block">
              Adapters translate one agent intent into Shopify GraphQL, Woo REST, eBay Inventory,
              Etsy v3, Printify v1, SP-API and more.
            </div>
          </aside>
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
