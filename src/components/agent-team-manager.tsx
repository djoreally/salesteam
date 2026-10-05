"use client";

import { FormEvent, useState } from "react";

export interface CustomAgent {
  id: string;
  name: string;
  role: string;
  instructions: string;
  modelPreference: string;
  enabled: boolean;
}

export function AgentTeamManager({ initial }: { initial: CustomAgent[] }) {
  const [agents, setAgents] = useState<CustomAgent[]>(initial);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function persist(next: CustomAgent[]) {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings: { "agents.custom": next } }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    setMessage(response.ok ? "Agent team saved." : data.error ?? "Unable to save agent team.");
    if (response.ok) setAgents(next);
  }

  async function addAgent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const role = String(form.get("role") ?? "").trim();
    const instructions = String(form.get("instructions") ?? "").trim();
    const modelPreference = String(form.get("modelPreference") ?? "auto").trim();
    if (!name || !role) return;
    const next = [...agents, { id: crypto.randomUUID(), name, role, instructions, modelPreference, enabled: true }];
    await persist(next);
    event.currentTarget.reset();
  }

  async function toggle(id: string) {
    await persist(agents.map((agent) => agent.id === id ? { ...agent, enabled: !agent.enabled } : agent));
  }

  async function remove(id: string) {
    await persist(agents.filter((agent) => agent.id !== id));
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="st-label text-violet-600">Your custom agents</div>
        <h2 className="st-heading mt-2">Add your own team members.</h2>
        <p className="st-body mt-3 text-slate-600">Custom agents are saved to this workspace. Their runtime tools and execution permissions will still pass through the same ZeroAI controls as the built-in team.</p>
        <div className="mt-6 space-y-3">
          {agents.length === 0 ? <div className="rounded-2xl bg-slate-50 p-5 text-slate-500">No custom agents yet.</div> : agents.map((agent) => (
            <div key={agent.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="font-semibold text-slate-900">{agent.name}</div><div className="text-sm text-violet-600">{agent.role}</div></div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => toggle(agent.id)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${agent.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{agent.enabled ? "Enabled" : "Disabled"}</button>
                  <button type="button" onClick={() => remove(agent.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600">Remove</button>
                </div>
              </div>
              {agent.instructions ? <p className="mt-3 text-sm leading-6 text-slate-600">{agent.instructions}</p> : null}
              <div className="mt-3 text-sm text-slate-400">Model preference: {agent.modelPreference}</div>
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={addAgent} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="st-label text-sky-600">Create agent</div>
        <h2 className="st-heading mt-2">Define a specialist.</h2>
        <div className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Agent name<input name="name" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500" placeholder="Launch Copywriter" /></label>
          <label className="block text-sm font-semibold text-slate-700">Role<input name="role" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500" placeholder="Sales copy agent" /></label>
          <label className="block text-sm font-semibold text-slate-700">Instructions<textarea name="instructions" rows={5} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500" placeholder="What this agent owns, how it should work, and what it must never do." /></label>
          <label className="block text-sm font-semibold text-slate-700">Model preference<select name="modelPreference" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500"><option value="auto">Auto-route best model</option><option value="reasoning">Reasoning model</option><option value="image">Image / design model</option><option value="fast">Fast execution model</option><option value="byok">Bring my own model</option></select></label>
          <button disabled={saving} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Add agent"}</button>
          {message ? <p className="text-sm text-slate-500">{message}</p> : null}
        </div>
      </form>
    </div>
  );
}
