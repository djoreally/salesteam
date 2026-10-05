"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Unable to sign in.");
        setLoading(false);
        return;
      }
      window.location.href = "/dashboard";
    } catch {
      setError("We could not reach the sign-in service. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] px-6 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[75vh] max-w-md items-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
          <Link href="/" className="st-label text-violet-600">SalesTeam</Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-base text-slate-500">Sign in to your workspace and agent team.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Email<input name="email" type="email" required autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500" /></label>
            <label className="block text-sm font-semibold text-slate-700">Password<input name="password" type="password" required autoComplete="current-password" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-normal outline-none focus:border-violet-500" /></label>
            <div className="text-right"><Link href="/forgot-password" className="text-sm font-semibold text-violet-600">Forgot password?</Link></div>
            {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? "Signing in…" : "Sign in"}</button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">New here? <Link href="/signup" className="font-semibold text-violet-600">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}
