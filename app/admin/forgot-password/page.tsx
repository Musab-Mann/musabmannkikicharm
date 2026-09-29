"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = "email" | "verify_email" | "recovery_code" | "new_password" | "done";

const STEP_LABELS: { key: Step; label: string; index: number }[] = [
  { key: "email", label: "Verify Email", index: 1 },
  { key: "verify_email", label: "Verify Email", index: 1 },
  { key: "recovery_code", label: "Recovery Code", index: 2 },
  { key: "new_password", label: "Set New Password", index: 3 },
];

function StepIndicator({ step }: { step: Step }) {
  if (step === "done") return null;
  const current = STEP_LABELS.find((s) => s.key === step) ?? STEP_LABELS[0];
  return (
    <div className="mb-6 flex items-center gap-2 text-[11px] text-ivory/40">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
              n === current.index
                ? "border-gold text-gold"
                : n < current.index
                ? "border-gold/50 bg-gold/20 text-gold"
                : "border-white/20 text-ivory/30"
            }`}
          >
            {n}
          </span>
          {n < 3 && <span className="h-px w-4 bg-white/10" />}
        </div>
      ))}
      <span className="ml-2">
        Step {current.index} — {current.label}
      </span>
    </div>
  );
}

export default function AdminForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let data: any = {};
    try {
      data = await res.json();
    } catch {
      // ignore — handled by !res.ok below
    }
    return { ok: res.ok, data };
  }

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await postJson("/api/admin/forgot-password", { email });
      // The API always returns the same generic message/step, by design —
      // this page never learns whether the email matched an account.
      if (!ok) {
        setError("Something went wrong. Please try again.");
        return;
      }
      setStep("verify_email");
      void data;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await postJson("/api/admin/forgot-password/verify-email", { code: emailCode });
      if (!ok) {
        setError(data.error || "Incorrect or expired code.");
        return;
      }
      setStep("recovery_code");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyRecoveryCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await postJson("/api/admin/forgot-password/verify-recovery", { recoveryCode });
      if (!ok) {
        setError(data.error || "Invalid recovery code.");
        return;
      }
      setStep("new_password");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { ok, data } = await postJson("/api/admin/reset-password", { newPassword });
      if (!ok) {
        setError(data.error || "Could not reset password.");
        return;
      }
      setStep("done");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-obsidian text-ivory px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-obsidian2 p-8">
        <StepIndicator step={step} />

        {step === "email" && (
          <form onSubmit={handleRequestCode}>
            <h1 className="font-display text-2xl mb-1">Forgot password</h1>
            <p className="text-xs text-ivory/50 mb-6">
              Enter the security email on your admin account. If it matches, we&apos;ll send a one-time
              verification code to it.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Security email"
              autoFocus
              autoComplete="email"
              className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-gold"
            />
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email}
              className="mt-5 w-full rounded-full bg-gold py-3 text-sm font-semibold text-obsidian disabled:opacity-50"
            >
              {loading ? "SENDING…" : "SEND VERIFICATION CODE"}
            </button>
            <Link href="/admin/login" className="mt-4 block text-center text-xs text-ivory/50 hover:text-ivory">
              ← Back to login
            </Link>
          </form>
        )}

        {step === "verify_email" && (
          <form onSubmit={handleVerifyEmailCode}>
            <h1 className="font-display text-2xl mb-1">Check your email</h1>
            <p className="text-xs text-ivory/50 mb-6">
              If that email matches an admin account, a 6-digit verification code was sent to it. Enter it
              below — it expires in 15 minutes and can only be used once.
            </p>
            <input
              type="text"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoFocus
              inputMode="numeric"
              className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-gold tracking-widest text-center"
            />
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || emailCode.length !== 6}
              className="mt-5 w-full rounded-full bg-gold py-3 text-sm font-semibold text-obsidian disabled:opacity-50"
            >
              {loading ? "VERIFYING…" : "VERIFY CODE"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setEmailCode("");
                setError(null);
              }}
              className="mt-4 block w-full text-center text-xs text-ivory/50 hover:text-ivory"
            >
              Didn&apos;t get a code? Start over
            </button>
          </form>
        )}

        {step === "recovery_code" && (
          <form onSubmit={handleVerifyRecoveryCode}>
            <h1 className="font-display text-2xl mb-1">Enter a recovery code</h1>
            <p className="text-xs text-ivory/50 mb-6">
              Enter one of the 8 recovery codes you saved. It will be consumed after this step and
              cannot be reused.
            </p>
            <input
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              autoFocus
              className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-gold tracking-widest text-center"
            />
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !recoveryCode}
              className="mt-5 w-full rounded-full bg-gold py-3 text-sm font-semibold text-obsidian disabled:opacity-50"
            >
              {loading ? "VERIFYING…" : "VERIFY RECOVERY CODE"}
            </button>
          </form>
        )}

        {step === "new_password" && (
          <form onSubmit={handleSetNewPassword}>
            <h1 className="font-display text-2xl mb-1">Set a new password</h1>
            <p className="text-xs text-ivory/50 mb-6">Choose a new password of at least 12 characters.</p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              autoFocus
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-gold mb-3"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full rounded-lg border border-white/15 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-gold"
            />
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="mt-5 w-full rounded-full bg-gold py-3 text-sm font-semibold text-obsidian disabled:opacity-50"
            >
              {loading ? "SAVING…" : "RESET PASSWORD"}
            </button>
          </form>
        )}

        {step === "done" && (
          <div>
            <h1 className="font-display text-2xl mb-3">Password updated</h1>
            <p className="text-sm text-ivory/70 mb-6">
              Your password has been reset and every existing session was signed out. Log in with your new
              password — you&apos;ll be asked for the 6-digit code emailed to your security email, same as always.
            </p>
            <button
              type="button"
              onClick={() => {
                router.push("/admin/login");
                router.refresh();
              }}
              className="w-full rounded-full bg-gold py-3 text-sm font-semibold text-obsidian"
            >
              GO TO LOGIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
