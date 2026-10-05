import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "SalesTeam · Commerce Control Plane",
  description: "Connect commerce platforms once, then let authorized agents operate through one normalized control plane.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07090d] text-zinc-200 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
