import { NextRequest, NextResponse } from "next/server";
import { getPasswordResetFlowId } from "@/lib/admin/session";
import {
  getOpenPasswordResetFlow,
  incrementFlowRecoveryAttempts,
  markFlowRecoveryVerified,
  findUnusedRecoveryCode,
  consumeRecoveryCode,
  logAdminEvent,
} from "@/lib/admin/db";
import { sha256Hex } from "@/lib/admin/crypto";
import { checkRateLimit, getClientIp } from "@/lib/admin/rate-limit";

const MAX_ATTEMPTS = 5;
const GENERIC_INVALID = { error: "Invalid recovery code." };

/**
 * Step 3 of the forgot-password flow: verify one of the admin's saved
 * recovery codes. Requires step 2 (email code) to already be complete.
 * On success the code is consumed immediately (single-use, same as the
 * MFA-login recovery-code path in lib/admin/auth-service.ts) — if the
 * caller abandons the flow before setting a new password, that recovery
 * code is still gone, which is the correct, conservative behavior for a
 * credential that's meant to be used at most once.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  const ipLimit = checkRateLimit(`pwreset-verify-recovery:ip:${ip}`, 15, 15 * 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const flowId = await getPasswordResetFlowId();
  if (!flowId) {
    return NextResponse.json({ error: "Your reset session has expired. Please start over." }, { status: 400 });
  }

  let body: { recoveryCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const recoveryCode = String(body.recoveryCode ?? "").trim();

  const flow = await getOpenPasswordResetFlow(flowId);
  if (!flow || !flow.emailVerified) {
    return NextResponse.json({ error: "Please verify your email code first." }, { status: 400 });
  }

  if (flow.recoveryAttempts >= MAX_ATTEMPTS) {
    await logAdminEvent({
      adminId: flow.adminId,
      event: "password_reset_failed",
      success: false,
      ip,
      userAgent,
      metadata: { step: "verify_recovery", reason: "attempts_exceeded" },
    });
    return NextResponse.json({ error: "Too many incorrect attempts. Please start over." }, { status: 429 });
  }

  // A flow whose email never matched a real account (admin_id null) can
  // never have a valid recovery code — fails the same generic way as a
  // wrong code, so this is indistinguishable to the caller.
  const recoveryId = flow.adminId && recoveryCode
    ? await findUnusedRecoveryCode(flow.adminId, sha256Hex(recoveryCode.toUpperCase()))
    : null;

  if (!recoveryId) {
    await incrementFlowRecoveryAttempts(flow.id);
    await logAdminEvent({
      adminId: flow.adminId,
      event: "password_reset_failed",
      success: false,
      ip,
      userAgent,
      metadata: { step: "verify_recovery" },
    });
    return NextResponse.json(GENERIC_INVALID, { status: 401 });
  }

  await consumeRecoveryCode(recoveryId);
  await markFlowRecoveryVerified(flow.id, recoveryId);
  await logAdminEvent({
    adminId: flow.adminId,
    event: "password_reset_recovery_verified",
    success: true,
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true, step: "new_password" });
}
