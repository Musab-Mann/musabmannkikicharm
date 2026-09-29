"use client";

import { useEffect, useState } from "react";
import { Database, HardDrive, ShieldAlert, Activity, RefreshCw } from "lucide-react";

interface StatusResponse {
  timestamp: string;
  database: { ok: boolean; latencyMs: number; error: string | null };
  storage: { ok: boolean; latencyMs: number; error: string | null };
  security: {
    loginSuccess24h: number;
    loginFailed24h: number;
    loginOtpFailed24h: number;
    recoveryCodeUses24h: number;
    accountLockouts24h: number;
    rateLimitEvents24h: number;
  };
  system: {
    nextVersion: string;
    nodeVersion: string;
    instanceUptimeSeconds: number;
    cpuUsageAvailable: boolean;
    memoryUsageAvailable: boolean;
    note: string;
  };
}

interface AuditEntry {
  id: string;
  event: string;
  success: boolean;
  ip: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

function StatusPill({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
      {ok ? "Healthy" : "Issue detected"}
    </span>
  );
}

export default function ControlPanelPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [statusRes, logRes] = await Promise.all([
      fetch("/api/admin/control-panel/status").then((r) => r.json()),
      fetch("/api/admin/control-panel/audit-log?limit=40").then((r) => r.json()),
    ]);
    setStatus(statusRes);
    setLog(logRes.entries ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000); // auto-refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) return <p className="text-sm text-bronze py-8">Loading…</p>;
  if (!status) return <p className="text-sm text-red-600 py-8">Could not load status.</p>;

  return (
    <div className="max-w-4xl pb-16">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Control Panel</h1>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-gold-dark hover:underline">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
      <p className="text-sm text-bronze mb-6">Real system, security and traffic status. Last updated {new Date(status.timestamp).toLocaleTimeString()}.</p>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium flex items-center gap-2"><Database size={16} /> Database</p>
            <StatusPill ok={status.database.ok} />
          </div>
          <p className="text-xs text-bronze">Round-trip latency: {status.database.latencyMs}ms</p>
          {status.database.error && <p className="text-xs text-red-600 mt-1">{status.database.error}</p>}
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium flex items-center gap-2"><HardDrive size={16} /> Storage</p>
            <StatusPill ok={status.storage.ok} />
          </div>
          <p className="text-xs text-bronze">Round-trip latency: {status.storage.latencyMs}ms</p>
          {status.storage.error && <p className="text-xs text-red-600 mt-1">{status.storage.error}</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 mb-6">
        <p className="font-medium mb-4 flex items-center gap-2"><ShieldAlert size={16} /> Security — last 24 hours</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-2xl font-display">{status.security.loginSuccess24h}</p><p className="text-xs text-bronze">Successful logins</p></div>
          <div><p className="text-2xl font-display">{status.security.loginFailed24h}</p><p className="text-xs text-bronze">Failed logins</p></div>
          <div><p className="text-2xl font-display">{status.security.loginOtpFailed24h}</p><p className="text-xs text-bronze">Login code failures</p></div>
          <div><p className="text-2xl font-display">{status.security.accountLockouts24h}</p><p className="text-xs text-bronze">Account lockouts</p></div>
          <div><p className="text-2xl font-display">{status.security.rateLimitEvents24h}</p><p className="text-xs text-bronze">Rate-limit events</p></div>
          <div><p className="text-2xl font-display">{status.security.recoveryCodeUses24h}</p><p className="text-xs text-bronze">Recovery codes used</p></div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5 mb-6">
        <p className="font-medium mb-2 flex items-center gap-2"><Activity size={16} /> Application</p>
        <p className="text-xs text-bronze">Next.js {status.system.nextVersion} · Node {status.system.nodeVersion} · This instance up {status.system.instanceUptimeSeconds}s</p>
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
          CPU and memory usage: <b>not available</b> — {status.system.note}
        </p>
        <p className="text-xs text-bronze mt-2">
          Request-level metrics (requests/sec, p50/p95/p99 latency, error rate) require an APM/analytics integration
          (e.g. Vercel Analytics or Cloudflare Analytics) that is not wired into this codebase yet — see
          PRODUCTION_DEPLOYMENT.md for how to add one rather than this panel fabricating numbers.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-white p-5">
        <p className="font-medium mb-3">Recent security events</p>
        <div className="space-y-1.5 max-h-96 overflow-y-auto">
          {log.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-xs rounded-lg bg-blush px-3 py-2">
              <span className={e.success ? "text-ink" : "text-red-600"}>{e.event}{e.ip ? ` · ${e.ip}` : ""}</span>
              <span className="text-bronze">{new Date(e.created_at).toLocaleString()}</span>
            </div>
          ))}
          {log.length === 0 && <p className="text-xs text-bronze">No events recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
