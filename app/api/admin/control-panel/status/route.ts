import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getRecentAuditLog } from "@/lib/admin/db";

/**
 * Real metrics only — no fabricated numbers. Where a metric genuinely isn't
 * available on this hosting platform (host-level CPU/RAM on Vercel's
 * serverless runtime), the field is explicitly null with `available: false`
 * rather than omitted or faked, so the Control Panel UI can say so plainly.
 */
export async function GET() {
  const session = await verifyAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- Database health: a real round-trip query, timed. ---
  const dbStart = Date.now();
  let dbOk = true;
  let dbError: string | null = null;
  try {
    const { error } = await supabaseAdmin.from("products").select("id", { count: "exact", head: true });
    if (error) {
      dbOk = false;
      dbError = error.message;
    }
  } catch (e) {
    dbOk = false;
    dbError = e instanceof Error ? e.message : "Unknown error";
  }
  const dbLatencyMs = Date.now() - dbStart;

  // --- Storage health: a real bucket listing call, timed. ---
  const storageStart = Date.now();
  let storageOk = true;
  let storageError: string | null = null;
  try {
    const { error } = await supabaseAdmin.storage.from("product-images").list("", { limit: 1 });
    if (error) {
      storageOk = false;
      storageError = error.message;
    }
  } catch (e) {
    storageOk = false;
    storageError = e instanceof Error ? e.message : "Unknown error";
  }
  const storageLatencyMs = Date.now() - storageStart;

  // --- Security events from the real audit log (last 24h). ---
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recentLog = await getRecentAuditLog(500);
  const recent24h = recentLog.filter((e: any) => new Date(e.created_at).getTime() >= since);

  const count = (event: string, success?: boolean) =>
    recent24h.filter((e: any) => e.event === event && (success === undefined || e.success === success)).length;

  const security = {
    loginSuccess24h: count("login_success", true),
    loginFailed24h: count("login_failed", false),
    loginOtpFailed24h: count("login_otp_failed", false),
    recoveryCodeUses24h: count("password_reset_recovery_verified", true),
    accountLockouts24h: recent24h.filter((e: any) => e.metadata?.reason === "locked").length,
    rateLimitEvents24h: recent24h.filter(
      (e: any) => e.metadata?.reason === "rate_limited" || e.metadata?.reason === "ip_rate_limited"
    ).length,
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    database: { ok: dbOk, latencyMs: dbLatencyMs, error: dbError },
    storage: { ok: storageOk, latencyMs: storageLatencyMs, error: storageError },
    security,
    system: {
      nextVersion: "14.2.35",
      nodeVersion: process.version,
      // process.uptime() reflects only THIS serverless function instance,
      // not the whole application — labeled as such in the UI, not implied
      // to be a global server uptime figure.
      instanceUptimeSeconds: Math.round(process.uptime()),
      cpuUsageAvailable: false,
      memoryUsageAvailable: false,
      note:
        "Host-level CPU/RAM are not exposed by Vercel's serverless Node runtime. If this app is later deployed on infrastructure that exposes them, wire real values in here instead of fabricating any.",
    },
  });
}
