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
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Unable to sign in.");
      setLoading(false);
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12">
      <div className="w-full rounded-2xl border border-zinc-800 bg-[#0b0e14] p-6 shadow-2xl">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">SalesTeam</Link>
        <h1 className="mt-2 text-2xl font-semibold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in to your commerce workspace.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm text-zinc-300">Email<input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 outline-none focus:border-emerald-500/60" /></label>
          <label className="block text-sm text-zinc-300">Password<input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 outline-none focus:border-emerald-500/60" /></label>
          <div className="text-right"><Link href="/forgot-password" className="text-sm text-emerald-300 hover:text-emerald-200">Forgot password?</Link></div>
          {error && <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
          <button disabled={loading} className="w-full rounded-lg bg-emerald-400 px-4 py-2.5 font-semibold text-black disabled:opacity-60">{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-zinc-500">New here? <Link href="/signup" className="text-emerald-300 hover:text-emerald-200">Create an account</Link></p>
      </div>
    </div>
  );
}
