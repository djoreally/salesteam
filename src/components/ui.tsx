import type { ReactNode } from "react";

export function PageHeader({ title, sub, right }: { title: string; sub: string; right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800/80 px-6 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-500">{sub}</p>
      </div>
      {right}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-zinc-800/80 bg-[#0b0e14] ${className}`}>{children}</section>
  );
}

export function CardTitle({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-800/70 px-4 py-3">
      <h2 className="text-sm font-semibold text-zinc-200">{children}</h2>
      {note ? <span className="text-[11px] text-zinc-500">{note}</span> : null}
    </div>
  );
}

export function Stat({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "good" | "warn" }) {
  const toneClass =
    tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-amber-300" : "text-zinc-100";
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[#0b0e14] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-zinc-500">{sub}</div> : null}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  red: "bg-rose-500/10 text-rose-300 ring-rose-500/30",
  blue: "bg-sky-500/10 text-sky-300 ring-sky-500/30",
  violet: "bg-violet-500/10 text-violet-300 ring-violet-500/30",
  zinc: "bg-zinc-700/30 text-zinc-300 ring-zinc-600/40",
};

export function Badge({ children, tone = "zinc" }: { children: ReactNode; tone?: keyof typeof TONES | string }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ${TONES[tone] ?? TONES.zinc}`}>
      {children}
    </span>
  );
}

export function Json({ value, max = 420 }: { value: unknown; max?: number }) {
  return (
    <pre
      className="overflow-auto rounded-lg border border-zinc-800/80 bg-[#06080c] p-3 text-[11px] leading-relaxed text-zinc-400"
      style={{ maxHeight: max }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function Bar({ value, tone = "bg-emerald-500" }: { value: number; tone?: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-800">
      <div className={`h-1.5 rounded-full ${tone}`} style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function money(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}
