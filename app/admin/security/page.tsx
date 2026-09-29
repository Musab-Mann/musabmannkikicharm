"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, KeyRound, Mail, User, Smartphone, LogOut } from "lucide-react";

interface SessionInfo {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  ip: string | null;
  userAgent: string | null;
}

function ReauthField({
  password, setPassword,
}: {
  password: string; setPassword: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <input
        type="password" placeholder="Current password" value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full sm:w-1/2 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-gold-dark"
      />
    </div>
  );
}

export default function AdminSecurityPage() {
  const [account, setAccount] = useState<{ username: string; securityEmail: string } | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [password, setPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  function load() {
    fetch("/api/admin/account").then((r) => r.json()).then(setAccount);
    fetch("/api/admin/sessions").then((r) => r.json()).then((d) => setSessions(d.sessions ?? []));
  }
  useEffect(load, []);

  async function submitChange(type: "username" | "password" | "email") {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        currentPassword: password,
        newUsername,
        newPassword,
        newEmail,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: "error", text: data.error || "Change failed." });
      return;
    }
    setMsg({ type: "ok", text: "Updated. Every other session has been logged out for safety." });
    setPassword(""); setNewUsername(""); setNewPassword(""); setNewEmail("");
    load();
  }

  async function regenerateRecoveryCodes() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/security/recovery-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: recoveryPassword }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg({ type: "error", text: data.error || "Could not regenerate codes." });
      return;
    }
    setRecoveryCodes(data.recoveryCodes);
    setRecoveryPassword("");
  }

  async function revokeAllOthers() {
    setBusy(true);
    await fetch("/api/admin/sessions", { method: "DELETE" });
    setBusy(false);
    setMsg({ type: "ok", text: "All other sessions have been logged out." });
    load();
  }

  if (!account) return <p className="text-sm text-bronze py-8">Loading…</p>;

  return (
    <div className="max-w-3xl pb-16">
      <h1 className="font-display text-2xl mb-1">Security</h1>
      <p className="text-sm text-bronze mb-6">
        Account credentials, login verification, and active sessions.
      </p>

      {msg && (
        <div className={`mb-6 rounded-lg px-4 py-3 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {recoveryCodes && (
        <div className="mb-6 rounded-2xl border border-line bg-white p-5">
          <p className="font-medium mb-2 flex items-center gap-2"><ShieldCheck size={16} className="text-gold-dark" /> New recovery codes — save these now</p>
          <p className="text-xs text-bronze mb-3">These replace your old codes, which no longer work. Shown only once.</p>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-blush p-3 font-mono text-xs mb-3">
            {recoveryCodes.map((c) => <div key={c}>{c}</div>)}
          </div>
          <button onClick={() => setRecoveryCodes(null)} className="text-sm text-gold-dark hover:underline">Done</button>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-line bg-white p-5">
        <p className="font-medium mb-1 flex items-center gap-2"><User size={16} /> Account</p>
        <p className="text-xs text-bronze mb-4">Username: <b>{account.username}</b> · Security email: <b>{account.securityEmail}</b></p>
        <p className="text-xs text-bronze mb-2">Enter your current password to make any change below.</p>
        <ReauthField password={password} setPassword={setPassword} />

        <div className="grid gap-3 sm:grid-cols-3 mt-4">
          <div>
            <label className="text-xs text-bronze flex items-center gap-1 mb-1"><User size={12} /> New username</label>
            <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-gold-dark" />
            <button disabled={busy || !password || !newUsername} onClick={() => submitChange("username")} className="mt-2 w-full rounded-full border border-obsidian py-1.5 text-xs font-medium disabled:opacity-40">Update username</button>
          </div>
          <div>
            <label className="text-xs text-bronze flex items-center gap-1 mb-1"><KeyRound size={12} /> New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-gold-dark" />
            <button disabled={busy || !password || newPassword.length < 12} onClick={() => submitChange("password")} className="mt-2 w-full rounded-full border border-obsidian py-1.5 text-xs font-medium disabled:opacity-40">Update password</button>
          </div>
          <div>
            <label className="text-xs text-bronze flex items-center gap-1 mb-1"><Mail size={12} /> New security email</label>
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-gold-dark" />
            <button disabled={busy || !password || !newEmail} onClick={() => submitChange("email")} className="mt-2 w-full rounded-full border border-obsidian py-1.5 text-xs font-medium disabled:opacity-40">Update email</button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-bronze">
          A new security email becomes active immediately — the next login code and any future password-reset
          code will be sent there right away.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-line bg-white p-5">
        <p className="font-medium mb-1 flex items-center gap-2"><ShieldCheck size={16} /> Recovery codes</p>
        <p className="text-xs text-bronze mb-4">
          You have 8 recovery codes on file. Each one lets you complete the forgot-password flow if you
          can&apos;t access your security email. A code stops working once it&apos;s used; the rest stay valid until
          you generate a fresh set.
        </p>
        <ReauthField password={recoveryPassword} setPassword={setRecoveryPassword} />
        <button
          disabled={busy || !recoveryPassword}
          onClick={regenerateRecoveryCodes}
          className="rounded-full border border-obsidian px-4 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          Generate new recovery codes
        </button>
        <p className="mt-2 text-[11px] text-bronze">
          Generating a new set immediately invalidates all 8 of your current codes.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-medium flex items-center gap-2"><Smartphone size={16} /> Active sessions</p>
          <button disabled={busy} onClick={revokeAllOthers} className="flex items-center gap-1 text-xs text-red-600 hover:underline">
            <LogOut size={12} /> Log out all other sessions
          </button>
        </div>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-blush px-3 py-2 text-xs">
              <div>
                <p className="font-medium">{s.current ? "This device" : "Other device"} {s.ip ? `· ${s.ip}` : ""}</p>
                <p className="text-bronze">Last active {new Date(s.lastSeenAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <p className="text-xs text-bronze">No active sessions.</p>}
        </div>
      </div>
    </div>
  );
}
