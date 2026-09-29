import { NextRequest, NextResponse } from "next/server";
import { getPasswordResetFlowId } from "@/lib/admin/session";
import { getOpenPasswordResetFlow, incrementFlowEmailAttempts, markFlowEmailVerified, logAdminEvent } from "@/lib/admin/db";
import { sha256Hex, safeEqual } from "@/lib/admin/crypto";
import { checkRateLimit, getClientIp } from "@/lib/admin/rate-limit";

const MAX_ATTEMPTS = 5;
const GENERIC_INVALID = { error: "Incorrect or expired code. Please check your email and try again." };

/**
 * Step 2 of the forgot-password flow: verify the one-time numeric code that
 * was emailed to the security address. Deliberately generic on every
 * failure path (bad code, expired flow, missing flow, attempt limit hit,
 * or a flow whose admin_id is null because the original email never
 * matched an account) — none of these are distinguishable to the caller.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  const ipLimit = checkRateLimit(`pwreset-verify-email:ip:${ip}`, 15, 15 * 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const flowId = await getPasswordResetFlowId();
  if (!flowId) {
    return NextResponse.json({ error: "Your reset session has expired. Please start over." }, { status: 400 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const code = String(body.code ?? "").trim();

  const flow = await getOpenPasswordResetFlow(flowId);
  if (!flow) {
    return NextResponse.json({ error: "Your reset session has expired. Please start over." }, { status: 400 });
  }

  if (flow.emailAttempts >= MAX_ATTEMPTS) {
    await logAdminEvent({
      adminId: flow.adminId,
      event: "password_reset_failed",
      success: false,
      ip,
      userAgent,
      metadata: { step: "verify_email", reason: "attempts_exceeded" },
    });
    return NextResponse.json({ error: "Too many incorrect attempts. Please start over." }, { status: 429 });
  }

  const providedHash = code ? sha256Hex(code) : "";
  const matches = /^\d{6}$/.test(code) && safeEqual(providedHash, flow.emailCodeHash);

  if (!matches) {
    await incrementFlowEmailAttempts(flow.id);
    await logAdminEvent({
      adminId: flow.adminId,
      event: "password_reset_failed",
      success: false,
      ip,
      userAgent,
      metadata: { step: "verify_email" },
    });
    return NextResponse.json(GENERIC_INVALID, { status: 401 });
  }

  await markFlowEmailVerified(flow.id);
  await logAdminEvent({
    adminId: flow.adminId,
    event: "password_reset_email_verified",
    success: true,
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true, step: "recovery_code" });
}
