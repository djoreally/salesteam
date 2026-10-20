"use client";

import { FormEvent, useState } from "react";

export interface ApiKeyRow {
  id: number;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "never";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ApiKeyManager({ initial }: { initial: ApiKeyRow[] }) {
  const [keys, setKeys] = useState(initial);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [freshKey, setFreshKey] = useState("");
  const [copied, setCopied] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setMessage("");
    setFreshKey("");
    const response = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "Muse" }),
    });
    const data = await response.json();
    setCreating(false);
    if (!response.ok) {
      setMessage(data.error ?? "Unable to create API key.");
      return;
    }
    setFreshKey(data.key.key);
    setKeys((current) => [
      {
        id: data.key.id,
        name: data.key.name,
        keyPrefix: data.key.keyPrefix,
        createdAt: data.key.createdAt,
        lastUsedAt: null,
        revokedAt: null,
      },
      ...current,
    ]);
    setName("");
  }

  async function copyFreshKey() {
    try {
      await navigator.clipboard.writeText(freshKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function revoke(id: number, keyName: string) {
    if (!window.confirm(`Revoke the API key "${keyName}"? Muse connections using it will stop working immediately.`)) return;
    setMessage("");
    const response = await fetch("/api/api-keys", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Unable to revoke API key.");
      return;
    }
    setKeys((current) => current.map((key) => (key.id === id ? { ...key, revokedAt: new Date().toISOString() } : key)));
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-[#0b0e14] p-4">
      <h3 className="text-sm font-semibold text-zinc-200">API keys for Muse (MCP)</h3>
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        A key lets your own Muse operate this workspace through the SalesTeam MCP server. Keys act only for this
        workspace. The full key is shown once, at creation — only a hash is stored.
      </p>

      <form onSubmit={create} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-56 flex-1 text-sm text-zinc-400">
          Key name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. My Muse"
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-zinc-100 outline-none focus:border-emerald-500/60"
          />
        </label>
        <button disabled={creating} className="rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60">
          {creating ? "Creating…" : "Create API key"}
        </button>
      </form>

      {freshKey && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="text-sm font-semibold text-amber-200">Copy your new API key now — it will not be shown again.</div>
          <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-black/40 px-3 py-2.5">
            <code className="min-w-0 flex-1 font-mono text-sm break-all text-amber-100">{freshKey}</code>
            <button type="button" onClick={copyFreshKey} className="shrink-0 rounded-md bg-amber-300 px-3 py-1.5 text-xs font-semibold text-black">
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-200/70">Paste it into Muse when you add the SalesTeam connector. If you lose it, revoke this key and create a new one.</p>
        </div>
      )}

      {message && <p className="mt-3 text-sm text-rose-300">{message}</p>}

      <div className="mt-5 overflow-hidden rounded-lg border border-zinc-800">
        {keys.length === 0 ? (
          <p className="px-3 py-4 text-sm text-zinc-500">No API keys yet. Create one to connect Muse.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium">Last used</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-zinc-800/60 last:border-0">
                  <td className="px-3 py-2.5 font-mono text-xs text-zinc-300">{key.keyPrefix}…</td>
                  <td className="px-3 py-2.5 text-zinc-200">{key.name}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{formatDate(key.createdAt)}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{formatDate(key.lastUsedAt)}</td>
                  <td className="px-3 py-2.5">
                    {key.revokedAt ? <span className="text-rose-300">Revoked</span> : <span className="text-emerald-300">Active</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {!key.revokedAt && (
                      <button type="button" onClick={() => revoke(key.id, key.name)} className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-rose-300">
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
