"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError(""); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: form.get("email") }) });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Unable to send reset link.");
    else setMessage(data.message);
    setLoading(false);
  }

  return <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12"><div className="w-full rounded-2xl border border-zinc-800 bg-[#0b0e14] p-6 shadow-2xl"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">SalesTeam</div><h1 className="mt-2 text-2xl font-semibold">Reset your password</h1><p className="mt-1 text-sm text-zinc-500">Enter the email on your account and we’ll send a secure reset link.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm text-zinc-300">Email<input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 outline-none focus:border-emerald-500/60" /></label>{error && <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}{message && <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-sm text-emerald-300">{message}</p>}<button disabled={loading} className="w-full rounded-lg bg-emerald-400 px-4 py-2.5 font-semibold text-black disabled:opacity-60">{loading ? "Sending…" : "Send reset link"}</button></form><p className="mt-5 text-center text-sm text-zinc-500"><Link href="/login" className="text-emerald-300">Back to sign in</Link></p></div></div>;
}
