"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) { setError("Passwords do not match."); setLoading(false); return; }
    const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Unable to reset password.");
    else setDone(true);
    setLoading(false);
  }

  return <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-12"><div className="w-full rounded-2xl border border-zinc-800 bg-[#0b0e14] p-6 shadow-2xl"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">SalesTeam</div><h1 className="mt-2 text-2xl font-semibold">Choose a new password</h1>{done ? <div className="mt-6"><p className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3 text-sm text-emerald-300">Your password was changed and existing sessions were signed out.</p><Link href="/login" className="mt-4 block w-full rounded-lg bg-emerald-400 px-4 py-2.5 text-center font-semibold text-black">Sign in</Link></div> : <form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm text-zinc-300">New password<input name="password" type="password" required minLength={10} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 outline-none focus:border-emerald-500/60" /></label><label className="block text-sm text-zinc-300">Confirm password<input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 outline-none focus:border-emerald-500/60" /></label>{error && <p className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}<button disabled={loading || !token} className="w-full rounded-lg bg-emerald-400 px-4 py-2.5 font-semibold text-black disabled:opacity-60">{loading ? "Updating…" : "Update password"}</button>{!token && <p className="text-sm text-red-300">This reset link is missing its token.</p>}</form>}</div></div>;
}
