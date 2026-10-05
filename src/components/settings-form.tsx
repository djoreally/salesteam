"use client";

import { FormEvent, useState } from "react";

interface Props {
  organizationName: string;
  plan: string;
  status: string;
  initialSettings: Record<string, unknown>;
}

export function SettingsForm({ organizationName, plan, status, initialSettings }: Props) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      organizationName: form.get("organizationName"),
      settings: {
        "commerce.currency": form.get("currency"),
        "commerce.marginFloor": Number(form.get("marginFloor") || 30),
        "commerce.defaultMode": form.get("defaultMode"),
        "agent.autoPublish": form.get("autoPublish") === "on",
      },
    };
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setSaving(false);
    setMessage(response.ok ? "Settings saved." : data.error ?? "Unable to save settings.");
  }

  return (
    <form onSubmit={save} className="grid gap-4 p-6 xl:grid-cols-2">
      <section className="rounded-xl border border-zinc-800 bg-[#0b0e14] p-4">
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">Workspace</h2>
        <label className="block text-sm text-zinc-400">Organization name<input name="organizationName" defaultValue={organizationName} className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-zinc-100 outline-none focus:border-emerald-500/60" /></label>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-lg border border-zinc-800 p-3"><div className="text-xs text-zinc-600">Plan</div><div className="mt-1 text-zinc-200">{plan}</div></div><div className="rounded-lg border border-zinc-800 p-3"><div className="text-xs text-zinc-600">Status</div><div className="mt-1 text-amber-300">{status}</div></div></div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#0b0e14] p-4">
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">Commerce defaults</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-zinc-400">Currency<input name="currency" defaultValue={String(initialSettings["commerce.currency"] ?? "USD")} className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-zinc-100" /></label>
          <label className="block text-sm text-zinc-400">Margin floor %<input name="marginFloor" type="number" min="0" max="95" defaultValue={Number(initialSettings["commerce.marginFloor"] ?? 30)} className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-zinc-100" /></label>
          <label className="block text-sm text-zinc-400">Default provider mode<select name="defaultMode" defaultValue={String(initialSettings["commerce.defaultMode"] ?? "sandbox")} className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-zinc-100"><option value="sandbox">Sandbox</option><option value="production">Production</option></select></label>
          <label className="mt-6 flex items-center gap-2 text-sm text-zinc-400"><input name="autoPublish" type="checkbox" defaultChecked={Boolean(initialSettings["agent.autoPublish"] ?? false)} /> Allow automatic publishing after certification</label>
        </div>
      </section>

      <div className="xl:col-span-2 flex items-center gap-3">
        <button disabled={saving} className="rounded-lg bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button>
        {message && <span className="text-sm text-zinc-400">{message}</span>}
      </div>
    </form>
  );
}
