"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export interface ChannelOption {
  id: string;
  name: string;
  kind: string;
  priority: string;
  mode: string;
  authorized: boolean;
}

const PRESETS = [
  "Find a promising automotive-themed product, check demand and competition, design it, create the product listing, calculate a profitable price, publish it everywhere I authorize, fulfill orders, and monitor performance.",
  "Find five growing Philadelphia-related t-shirt ideas with low competition and at least a 60% projected gross margin. Create the best one and launch it.",
  "Launch a retro coffee mug for remote-work culture with at least 55% margin and publish to every authorized channel.",
  "Build a trail-running poster drop with low competition and strong social velocity, then publish and monitor it.",
];

export function MissionControl({ channels }: { channels: ChannelOption[] }) {
  const router = useRouter();
  const [goal, setGoal] = useState(PRESETS[0]);
  const [selected, setSelected] = useState<string[]>(channels.filter((c) => c.authorized).map((c) => c.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const pod = channels.filter((c) => c.kind === "pod");
  const sales = channels.filter((c) => c.kind !== "pod");

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id]));
  }

  async function launch() {
    setBusy(true);
    setError(null);
    try {
      // Authorization state is the agent's permission boundary: it may only
      // touch providers the operator has explicitly switched on.
      await Promise.all(
        channels.map((c) =>
          fetch("/api/connections", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              providerId: c.id,
              status: selected.includes(c.id) ? "authorized" : "disconnected",
            }),
          }),
        ),
      );

      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal, channels: selected }),
      });
      const data = (await res.json()) as { runId?: number; error?: string };
      if (!res.ok || !data.runId) throw new Error(data.error ?? "Run failed");
      startTransition(() => router.push(`/runs/${data.runId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  const chip = (c: ChannelOption) => {
    const on = selected.includes(c.id);
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => toggle(c.id)}
        className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
          on
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
            : "border-zinc-800 bg-[#0b0e14] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
        }`}
      >
        <span className="block font-medium">{c.name}</span>
        <span className="text-[10px] opacity-70">
          {c.priority} · {c.mode}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-zinc-500">Goal</label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={4}
          className="w-full resize-y rounded-xl border border-zinc-800 bg-[#06080c] p-3 font-mono text-[13px] leading-relaxed text-zinc-200 outline-none focus:border-emerald-500/50"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {PRESETS.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => setGoal(p)}
              className="rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              preset {i + 1}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
          Authorized sales channels ({selected.filter((s) => sales.some((c) => c.id === s)).length})
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">{sales.map(chip)}</div>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
          Authorized manufacturing / fulfillment
        </div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">{pod.map(chip)}</div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>
      ) : null}

      <button
        type="button"
        onClick={launch}
        disabled={busy}
        className="w-full rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-3 text-sm font-semibold text-black transition disabled:opacity-60"
      >
        {busy ? "Agent running — researching, designing, pricing, publishing…" : "Run Commerce Agent"}
      </button>
      <p className="text-[11px] leading-relaxed text-zinc-600">
        The agent calls only normalized primitives (<code className="text-zinc-400">commerce.createProduct</code>,{" "}
        <code className="text-zinc-400">commerce.publish</code>, <code className="text-zinc-400">commerce.fulfillOrder</code>…).
        Providers without credentials execute in sandbox mode and the exact outbound request is recorded for inspection.
      </p>
    </div>
  );
}
