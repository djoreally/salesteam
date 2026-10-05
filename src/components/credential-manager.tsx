"use client";

import { FormEvent, useState } from "react";

type ProviderCredential = {
  id: string;
  name: string;
  priority: string;
  required: string[];
  configured: string[];
  missing: string[];
  complete: boolean;
};

export function CredentialManager({ initial }: { initial: ProviderCredential[] }) {
  const [providers, setProviders] = useState(initial);
  const [active, setActive] = useState(initial.find((provider) => provider.priority === "P0")?.id ?? initial[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = providers.find((provider) => provider.id === active);

  function updateStatus(providerId: string, status: Omit<ProviderCredential, "id" | "name" | "priority">) {
    setProviders((current) => current.map((provider) => provider.id === providerId ? { ...provider, ...status } : provider));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const secrets = Object.fromEntries(selected.required.flatMap((key) => {
      const value = String(form.get(key) ?? "").trim();
      return value ? [[key, value]] : [];
    }));

    if (!Object.keys(secrets).length) {
      setMessage("Enter at least one credential to update.");
      setSaving(false);
      return;
    }

    const response = await fetch("/api/credentials", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ providerId: selected.id, secrets }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error ?? "Unable to save credentials.");
      return;
    }
    updateStatus(selected.id, data.credential);
    event.currentTarget.reset();
    setMessage(data.credential.complete ? `${selected.name} credentials are complete.` : `Saved. Still missing: ${data.credential.missing.join(", ")}`);
  }

  async function clear() {
    if (!selected || !window.confirm(`Remove all saved ${selected.name} credentials from this workspace?`)) return;
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/credentials", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ providerId: selected.id }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(data.error ?? "Unable to clear credentials.");
      return;
    }
    updateStatus(selected.id, data.credential);
    setMessage(`${selected.name} credentials removed.`);
  }

  if (!selected) return null;

  return (
    <section className="mx-6 mb-6 rounded-xl border border-zinc-800 bg-[#0b0e14]">
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-200">Provider credentials</h2>
        <p className="mt-1 text-xs text-zinc-500">Secrets are encrypted server-side per workspace. Stored values are never returned to the browser.</p>
      </div>
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="max-h-[560px] overflow-auto border-b border-zinc-800 p-2 lg:border-b-0 lg:border-r">
          {providers.map((provider) => (
            <button key={provider.id} type="button" onClick={() => { setActive(provider.id); setMessage(""); }} className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${provider.id === selected.id ? "bg-emerald-500/10 text-emerald-200" : "text-zinc-400 hover:bg-zinc-900"}`}>
              <span><span className="block font-medium">{provider.name}</span><span className="text-[10px] text-zinc-600">{provider.priority} · {provider.configured.length}/{provider.required.length} fields</span></span>
              <span className={`h-2.5 w-2.5 rounded-full ${provider.complete ? "bg-emerald-400" : provider.configured.length ? "bg-amber-400" : "bg-zinc-700"}`} />
            </button>
          ))}
        </div>

        <form key={selected.id} onSubmit={save} className="p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="font-medium text-zinc-100">{selected.name}</h3><p className="text-xs text-zinc-500">Blank fields keep the currently stored value.</p></div>
            <span className={`rounded-full px-2 py-1 text-[11px] ${selected.complete ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800 text-zinc-400"}`}>{selected.complete ? "Credentials complete" : `${selected.missing.length} missing`}</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {selected.required.map((key) => {
              const configured = selected.configured.includes(key);
              const visible = key.endsWith("_URL") || key.endsWith("_ID") || key.endsWith("_SHOP") || key.endsWith("_SHOP_ID") || key.endsWith("_LOCATION_ID") || key.endsWith("_STORE_ID");
              return (
                <label key={key} className="block text-xs text-zinc-400">
                  <span className="flex items-center justify-between"><span>{key}</span>{configured ? <span className="text-emerald-400">saved</span> : <span className="text-zinc-600">required</span>}</span>
                  <input name={key} type={visible ? "text" : "password"} autoComplete="off" placeholder={configured ? "•••••••• (leave blank to keep)" : "Enter value"} className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-emerald-500/60" />
                </label>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button disabled={saving} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">{saving ? "Saving…" : "Save encrypted credentials"}</button>
            <button type="button" disabled={saving || selected.configured.length === 0} onClick={clear} className="rounded-lg border border-rose-900/60 px-4 py-2 text-sm text-rose-300 disabled:opacity-40">Remove credentials</button>
            {message ? <span className="text-sm text-zinc-400">{message}</span> : null}
          </div>
        </form>
      </div>
    </section>
  );
}
