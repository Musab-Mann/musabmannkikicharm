import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Minimal PUBLIC health check. Deliberately returns almost nothing — no
 * error messages, no internal paths, no config, no version strings that
 * could help an attacker fingerprint the stack. For a detailed, real
 * breakdown (DB/storage latency, security event counts), see
 * /api/admin/control-panel/status, which requires an authenticated admin
 * session.
 */
export async function GET() {
  try {
    const { error } = await supabaseAdmin.from("products").select("id", { head: true, count: "exact" }).limit(1);
    return NextResponse.json({ status: error ? "degraded" : "ok" }, { status: error ? 503 : 200 });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
