"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProviderToggle({ providerId, authorized }: { providerId: string; authorized: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(authorized);
  const [busy, setBusy] = useState(false);

  async function flip() {
    const next = !on;
    setOn(next);
    setBusy(true);
    await fetch("/api/connections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ providerId, status: next ? "authorized" : "disconnected" }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={flip}
      disabled={busy}
      className={`w-24 rounded-md px-2 py-1 text-[11px] font-medium ring-1 transition ${
        on
          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
          : "bg-zinc-800/40 text-zinc-500 ring-zinc-700/50 hover:text-zinc-300"
      }`}
    >
      {on ? "authorized" : "off"}
    </button>
  );
}
