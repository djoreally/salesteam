"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProviderToggle({ providerId, state, credentialsPresent }: { providerId: string; state: string; credentialsPresent: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const connected = state !== "registered";

  async function setConnection() {
    setBusy(true);
    setError("");
    let response: Response;

    if (connected && state === "certified") {
      response = await fetch("/api/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId, state: "connected" }),
      });
      if (response.ok) {
        response = await fetch("/api/connections", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ providerId, state: "registered" }),
        });
      }
    } else {
      response = await fetch("/api/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId, state: connected ? "registered" : "connected" }),
      });
    }

    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setError(data.error ?? "Connection update failed.");
      return;
    }
    router.refresh();
  }

  const label = state === "production_enabled" ? "production" : state === "certified" ? "certified" : state === "connected" ? "connected" : credentialsPresent ? "connect" : "add keys";

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={setConnection}
        disabled={busy || (!connected && !credentialsPresent)}
        title={!credentialsPresent && !connected ? "Add credentials in Settings first" : undefined}
        className={`w-24 rounded-md px-2 py-1 text-[11px] font-medium ring-1 transition ${
          connected
            ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
            : credentialsPresent
              ? "bg-sky-500/10 text-sky-300 ring-sky-500/30"
              : "bg-zinc-800/40 text-zinc-500 ring-zinc-700/50"
        }`}
      >
        {busy ? "working…" : label}
      </button>
      {error ? <span className="max-w-48 text-right text-[10px] text-rose-300">{error}</span> : null}
    </div>
  );
}
