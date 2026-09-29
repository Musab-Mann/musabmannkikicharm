"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = "credentials" | "otp" | "recovery_codes";

export default function AdminLoginPage() {
  const [step, setStep] = useState<Step>("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  const router = useRouter();

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Login failed.");
      return;
    }
    setMaskedEmail(data.maskedEmail ?? null);
    setExpiresInSeconds(data.expiresInSeconds ?? null);
    if (data.emailSent === false) {
      setNotice("We had trouble sending the email just now — use \"Resend code\" below if it doesn't arrive shortly.");
    }
    setCode("");
    setStep("otp");
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Verification failed.");
      if (data.step === "expired") {
        // The pending login state is gone (too many attempts, or the code
        // expired) — the admin must start over from username/password.
        setStep("credentials");
        setPassword("");
        setCode("");
      }
      return;
    }
    if (data.firstTimeSetup && Array.isArray(data.recoveryCodes)) {
      setRecoveryCodes(data.recoveryCodes);
      setStep("recovery_codes");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  function finishFirstTimeSetup() {
    router.push("/admin");
    router.refresh();
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    setNotice(null);
    const res = await fetch("/api/admin/login/otp/resend", { method: "POST" });
    const data = await res.json();
    setResending(false);
    if (!res.ok) {
      setError(data.error || "Could not resend code.");
      return;
    }
    setMaskedEmail(data.maskedEmail ?? maskedEmail);
    setExpiresInSeconds(data.expiresInSeconds ?? null);
    setCode("");
    setNotice(
      data.emailSent === false
        ? "We had trouble sending the email just now — please try again shortly."
        : "A new code has been sent."
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-obsidian text-ivory px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-obsidian2 p-8">
        {step === "credentials" && (
          <form onSubmit={handleCredentials}>
            <h1 className="font-display text-2xl mb-1">Admin Login</h1>
            <p className="text-xs text-ivory/50 mb-6">Store owner access only. Username, password, and an emailed verification code are all required.</p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoFocus
              autoComplete="username"
              className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-gold mb-3"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-gold"
            />
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="mt-5 w-full rounded-full bg-gold py-3 text-sm font-semibold text-obsidian disabled:opacity-50"
            >
              {loading ? "CHECKING…" : "CONTINUE"}
            </button>
            <Link
              href="/admin/forgot-password"
              className="mt-4 block text-center text-xs text-ivory/50 hover:text-ivory"
            >
              Forgot Password?
            </Link>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpVerify}>
            <h1 className="font-display text-2xl mb-1">Check your email</h1>
            <p className="text-xs text-ivory/50 mb-1">
              Verification code sent to your security email{maskedEmail ? ` (${maskedEmail})` : ""}.
            </p>
            {expiresInSeconds != null && (
              <p className="text-[11px] text-ivory/40 mb-4">
                This code expires in {Math.round(expiresInSeconds / 60)} minutes.
              </p>
            )}
            {expiresInSeconds == null && <div className="mb-4" />}
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-gold tracking-widest text-center"
            />
            {notice && !error && <p className="mt-3 text-sm text-ivory/60">{notice}</p>}
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="mt-5 w-full rounded-full bg-gold py-3 text-sm font-semibold text-obsidian disabled:opacity-50"
            >
              {loading ? "VERIFYING…" : "VERIFY"}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mt-3 w-full text-xs text-ivory/50 hover:text-ivory disabled:opacity-50"
            >
              {resending ? "SENDING…" : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setPassword("");
                setCode("");
                setError(null);
                setNotice(null);
              }}
              className="mt-2 w-full text-xs text-ivory/30 hover:text-ivory/60"
            >
              Use a different account
            </button>
          </form>
        )}

        {step === "recovery_codes" && recoveryCodes && (
          <div>
            <h1 className="font-display text-2xl mb-1">Save your recovery codes</h1>
            <p className="text-xs text-ivory/50 mb-5">
              These 8 codes are the only way back into your account if you ever lose access to your
              security email. Each code works once. Save them somewhere safe — they are shown only this
              one time.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/5 border border-white/10 p-3 font-mono text-xs mb-5">
              {recoveryCodes.map((c) => (
                <div key={c}>{c}</div>
              ))}
            </div>
            <button
              type="button"
              onClick={finishFirstTimeSetup}
              className="w-full rounded-full bg-gold py-3 text-sm font-semibold text-obsidian"
            >
              I&apos;VE SAVED MY CODES — CONTINUE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
