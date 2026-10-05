"use client";

import { FormEvent, useState } from "react";

export function AccountSettings({ name, email }: { name: string; email: string }) {
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/account/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: form.get("name") }) });
    const data = await response.json();
    setProfileMessage(response.ok ? "Profile saved." : data.error ?? "Unable to save profile.");
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    const form = new FormData(event.currentTarget);
    const next = String(form.get("newPassword") ?? "");
    const confirm = String(form.get("confirmPassword") ?? "");
    if (next !== confirm) { setPasswordMessage("New passwords do not match."); return; }
    const response = await fetch("/api/account/password", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: next }) });
    const data = await response.json();
    if (!response.ok) { setPasswordMessage(data.error ?? "Unable to change password."); return; }
    window.location.href = "/login";
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  async function signOutEverywhere() {
    await fetch("/api/account/sessions", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <div className="grid gap-4 px-6 pt-6 xl:grid-cols-2">
      <section className="rounded-xl border border-zinc-800 bg-[#0b0e14] p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Account</h2>
        <p className="mt-1 text-xs text-zinc-500">Your personal SalesTeam identity.</p>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <label className="block text-sm text-zinc-400">Name<input name="name" defaultValue={name} minLength={2} required className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-zinc-100 outline-none focus:border-emerald-500/60" /></label>
          <label className="block text-sm text-zinc-400">Email<input value={email} disabled className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-zinc-500" /><span className="mt-1 block text-[11px] text-zinc-600">Email changes will require verification before they are enabled.</span></label>
          <button className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-black">Save profile</button>
          {profileMessage && <span className="ml-3 text-sm text-zinc-400">{profileMessage}</span>}
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-[#0b0e14] p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Security</h2>
        <p className="mt-1 text-xs text-zinc-500">Change your password or invalidate active sessions.</p>
        <form onSubmit={changePassword} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-zinc-400 sm:col-span-2">Current password<input name="currentPassword" type="password" required autoComplete="current-password" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-zinc-100" /></label>
          <label className="block text-sm text-zinc-400">New password<input name="newPassword" type="password" required minLength={10} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-zinc-100" /></label>
          <label className="block text-sm text-zinc-400">Confirm password<input name="confirmPassword" type="password" required minLength={10} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#06080c] px-3 py-2.5 text-zinc-100" /></label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><button className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-black">Change password</button><a href="/forgot-password" className="text-sm text-emerald-300">Use password reset email instead</a></div>
          {passwordMessage && <p className="sm:col-span-2 text-sm text-zinc-400">{passwordMessage}</p>}
        </form>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-800 pt-4"><button onClick={signOut} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800">Sign out this device</button><button onClick={signOutEverywhere} className="rounded-lg border border-rose-900/70 px-4 py-2 text-sm text-rose-300 hover:bg-rose-950/30">Sign out everywhere</button></div>
      </section>
    </div>
  );
}
