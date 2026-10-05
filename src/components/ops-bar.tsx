"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ACTIONS: { action: string; label: string; hint: string }[] = [
  { action: "simulate", label: "Run market tick", hint: "traffic → conversions → paid orders on every live listing" },
  { action: "fulfill", label: "Route fulfillment", hint: "paid orders → POD manufacturer → tracking back to channel" },
  { action: "optimize", label: "Optimize portfolio", hint: "reprice, scale winners, kill dead SKUs" },
];

export function OpsBar() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function run(action: string) {
    setBusy(action);
    setResult(null);
    const res = await fetch("/api/ops", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = (await res.json()) as Record<string, unknown>;
    setResult(summarize(action, data));
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        {ACTIONS.map((a) => (
          <button
            key={a.action}
            type="button"
            onClick={() => run(a.action)}
            disabled={busy !== null}
            className="rounded-xl border border-zinc-800 bg-[#0b0e14] px-3 py-2 text-left transition hover:border-emerald-500/40 disabled:opacity-50"
          >
            <span className="block text-sm font-medium text-zinc-100">
              {busy === a.action ? "working…" : a.label}
            </span>
            <span className="block text-[11px] text-zinc-500">{a.hint}</span>
          </button>
        ))}
      </div>
      {result ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">{result}</div>
      ) : null}
    </div>
  );
}

function summarize(action: string, data: Record<string, unknown>): string {
  if (action === "simulate") return `Market tick complete — ${data.created ?? 0} new paid orders across live listings.`;
  if (action === "fulfill") return `Routed ${data.fulfilled ?? 0} orders to manufacturers and pushed tracking back to each channel.`;
  const decisions = (data.decisions as { action: string; title: string }[] | undefined) ?? [];
  const counts = decisions.reduce<Record<string, number>>((acc, d) => {
    acc[d.action] = (acc[d.action] ?? 0) + 1;
    return acc;
  }, {});
  return `Optimizer ran on ${decisions.length} products — ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ") || "no changes"}.`;
}
