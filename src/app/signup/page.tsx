"use client";

import { FormEvent, useState } from "react";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        organizationName: form.get("organizationName"),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Unable to create account.");
      setLoading(false);
      return;
    }
    window.location.href = "/onboarding";
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12">
      <div className="w-full rounded-2xl border border-zinc-800 bg-[#0b0e14] p-6 shadow-2xl">
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">SalesTeam</div>
          <h1 className="mt-2 text-2xl font-semibold text-white">Create your workspace</h1>
          <p className="mt-1 text-sm text-zinc-500">One account, one isolated commerce workspace, then connect the platforms you want the agent to control.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm text-zinc-300">Your name<input name="name" required minLength={2} autoComplete="name" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 outline-none focus:border-emerald-500/60" /></label>
          <label className="block text-sm text-zinc-300">Business / workspace name<input name="organizationName" required minLength={2} className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 outline-none focus:border-emerald-500/60" /></label>
          <label className="block text-sm text-zinc-300">Email<input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 outline-none focus:border-emerald-500/60" /></label>
          <label className="block text-sm text-zinc-300">Password<input name="password" type="password" required minLength={10} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 outline-none focus:border-emerald-500/60" /><span className="mt-1 block text-xs text-zinc-600">At least 10 characters.</span></label>
          {error && <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
          <button disabled={loading} className="w-full rounded-lg bg-emerald-400 px-4 py-2.5 font-semibold text-black disabled:opacity-60">{loading ? "Creating workspace…" : "Create account"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-zinc-500">Already have an account? <a href="/login" className="text-emerald-300 hover:text-emerald-200">Sign in</a></p>
      </div>
    </div>
  );
}
