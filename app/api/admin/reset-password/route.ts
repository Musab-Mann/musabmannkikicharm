import { NextRequest, NextResponse } from "next/server";
import { getPasswordResetFlowId, clearPasswordResetFlowCookie } from "@/lib/admin/session";
import {
  getOpenPasswordResetFlow,
  markFlowCompleted,
  invalidateOtherPasswordResetFlows,
  getAdminById,
  updateAdminCredentials,
  revokeAllSessions,
  logAdminEvent,
} from "@/lib/admin/db";
import { hashPassword } from "@/lib/admin/crypto";
import { checkRateLimit, getClientIp } from "@/lib/admin/rate-limit";
import { sendAdminSecurityAlertEmail } from "@/lib/email";

/**
 * Step 4 (final) of the forgot-password flow. Requires that this exact
 * flow already completed BOTH the email-code step and the recovery-code
 * step — see verify-email/route.ts and verify-recovery/route.ts. On
 * success: hashes the new password with the existing Argon2id
 * implementation, revokes EVERY existing admin session (there is no
 * "current session" to preserve — the caller isn't logged in), invalidates
 * this and any other outstanding reset flow for the admin, notifies the
 * security email, and clears the flow cookie. The admin's recovery codes
 * are left untouched (only the recovery code actually used in this flow
 * was consumed) — the admin logs back in with the new password and goes
 * through the normal emailed-OTP second factor, same as any other login.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  let body: { newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const newPassword = String(body.newPassword ?? "");

  if (newPassword.length < 12) {
    return NextResponse.json({ error: "New password must be at least 12 characters." }, { status: 400 });
  }

  const ipLimit = checkRateLimit(`reset-password:ip:${ip}`, 10, 15 * 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const flowId = await getPasswordResetFlowId();
  if (!flowId) {
    return NextResponse.json({ error: "Your reset session has expired. Please start over." }, { status: 400 });
  }

  const flow = await getOpenPasswordResetFlow(flowId);
  // Both prior steps must be complete, and a real admin must be attached —
  // a flow that never matched a real account (admin_id null) can reach
  // this point only if both earlier steps were somehow bypassed, which
  // they can't be (verify-recovery requires a real, consumed recovery
  // code against a real admin_id). Belt-and-suspenders check regardless.
  if (!flow || !flow.emailVerified || !flow.recoveryVerified || !flow.adminId) {
    return NextResponse.json({ error: "Invalid or incomplete reset session. Please start over." }, { status: 400 });
  }

  const admin = await getAdminById(flow.adminId);
  if (!admin) {
    return NextResponse.json({ error: "Invalid or incomplete reset session. Please start over." }, { status: 400 });
  }

  await updateAdminCredentials(admin.id, { passwordHash: await hashPassword(newPassword) });

  await markFlowCompleted(flow.id);
  await invalidateOtherPasswordResetFlows(admin.id, flow.id);

  // No "current session" to preserve — revoke everything. The admin logs
  // back in fresh with the new password, then completes normal MFA (or
  // recovery-code) login, unchanged.
  await revokeAllSessions(admin.id);

  await logAdminEvent({ adminId: admin.id, event: "password_reset_completed", success: true, ip, userAgent });

  if (admin.securityEmail) {
    await sendAdminSecurityAlertEmail(admin.securityEmail, {
      title: "Admin password was reset",
      description:
        "Your admin password was just reset using the forgot-password flow (email code + recovery code). All active sessions were signed out.",
      ip,
    });
  }

  await clearPasswordResetFlowCookie();

  return NextResponse.json({ ok: true });
}
