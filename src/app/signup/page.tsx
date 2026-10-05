"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function SignupPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password,
          organizationName: form.get("organizationName"),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? `Unable to create account (${response.status}).`);
        setLoading(false);
        return;
      }
      window.location.href = "/onboarding";
    } catch {
      setError("We could not reach the signup service. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] px-6 py-12 text-slate-900">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_.9fr] lg:items-center">
        <section>
          <Link href="/" className="st-label text-violet-600">SalesTeam</Link>
          <h1 className="st-heading mt-3 max-w-xl">Create your workspace and start building your agent team.</h1>
          <p className="st-body mt-4 max-w-xl text-slate-600">Pick the stores and fulfillment services you use, then choose specialized SalesTeam agents, a generalist, or your own agents.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm text-slate-600"><span className="rounded-full bg-violet-100 px-3 py-1.5">Research</span><span className="rounded-full bg-fuchsia-100 px-3 py-1.5">Art</span><span className="rounded-full bg-sky-100 px-3 py-1.5">Copy</span><span className="rounded-full bg-emerald-100 px-3 py-1.5">Sales</span><span className="rounded-full bg-amber-100 px-3 py-1.5">Marketing</span></div>
        </section>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          <h2 className="text-2xl font-bold tracking-tight">Create account</h2>
          <p className="mt-2 text-base text-slate-500">No provider connections are added until you choose them.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Your name<input name="name" required minLength={2} autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500" /></label>
            <label className="block text-sm font-semibold text-slate-700">Business / workspace name<input name="organizationName" required minLength={2} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500" /></label>
            <label className="block text-sm font-semibold text-slate-700">Email<input name="email" type="email" required autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500" /></label>
            <label className="block text-sm font-semibold text-slate-700">Password<input name="password" type="password" required minLength={10} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500" /><span className="mt-2 block text-sm font-normal text-slate-500">Use at least 10 characters.</span></label>
            <label className="block text-sm font-semibold text-slate-700">Confirm password<input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500" /></label>
            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? "Creating workspace…" : "Create account"}</button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-violet-600">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
