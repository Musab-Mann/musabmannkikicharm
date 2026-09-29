import { NextRequest, NextResponse } from "next/server";
import {
  getAdminBySecurityEmail,
  createPasswordResetFlow,
  invalidateOtherPasswordResetFlows,
  logAdminEvent,
} from "@/lib/admin/db";
import { generateNumericCode, sha256Hex } from "@/lib/admin/crypto";
import { checkRateLimit, getClientIp } from "@/lib/admin/rate-limit";
import { sendAdminPasswordResetCodeEmail } from "@/lib/email";
import { createPasswordResetFlowCookie } from "@/lib/admin/session";

// Whole flow (and the email code within it) is valid for 15 minutes.
const FLOW_TTL_MS = 15 * 60_000;

// Always the same response, whether or not the email matches an account —
// this is the entire point of the generic-response requirement: the caller
// can never learn from this endpoint whether a given email has an admin
// account attached to it. The step is always "verify_email": a flow cookie
// is issued either way (see rationale in the migration for
// admin_password_reset_flows).
const GENERIC_RESPONSE = {
  message: "If an account matches that email, a verification code has been sent to it.",
  step: "verify_email" as const,
};

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    // Still generic — an invalid-looking email is not proof an account
    // doesn't exist, and there's no reason to distinguish this case either.
    return NextResponse.json(GENERIC_RESPONSE);
  }

  // Rate limit by IP AND by the submitted email, independently — an
  // attacker enumerating many emails from one IP is stopped by the IP
  // bucket; an attacker (or a mistaken script) hammering one real admin's
  // email from many IPs is stopped by the email bucket. Both windows are
  // deliberately generous enough not to lock out a real forgetful owner.
  const ipLimit = checkRateLimit(`forgot-password:ip:${ip}`, 5, 15 * 60_000);
  const emailLimit = checkRateLimit(`forgot-password:email:${email}`, 3, 15 * 60_000);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    await logAdminEvent({
      event: "password_reset_requested",
      success: false,
      ip,
      userAgent,
      metadata: { reason: "rate_limited" },
    });
    // Same generic message even when rate-limited — a distinct "too many
    // requests" response here would itself leak information over repeated
    // probing (confirms the email is being tracked / is real).
    return NextResponse.json(GENERIC_RESPONSE);
  }

  try {
    const admin = await getAdminBySecurityEmail(email);

    // A code (and a flow row) is generated EVERY time, whether or not the
    // email matched — see the migration comment for why this matters for
    // enumeration resistance. Only the email send is conditional.
    const rawCode = generateNumericCode(6);
    const codeHash = sha256Hex(rawCode);
    const expiresAt = new Date(Date.now() + FLOW_TTL_MS);

    if (admin) {
      // Older outstanding flows for this admin are invalidated first, so a
      // stale, previously-emailed code can't be used alongside a new one.
      await invalidateOtherPasswordResetFlows(admin.id);
    }

    const flowId = await createPasswordResetFlow({
      adminId: admin?.id ?? null,
      emailCodeHash: codeHash,
      expiresAt,
      requestedIp: ip,
    });
    await createPasswordResetFlowCookie(flowId, FLOW_TTL_MS);

    if (admin) {
      await sendAdminPasswordResetCodeEmail(admin.securityEmail, { code: rawCode, ip });
      await logAdminEvent({
        adminId: admin.id,
        event: "password_reset_requested",
        success: true,
        ip,
        userAgent,
      });
    } else {
      // No matching account — log the attempt without an adminId so this is
      // still visible in the audit trail (e.g. to spot enumeration probing)
      // without ever telling the caller whether the email was valid.
      await logAdminEvent({
        event: "password_reset_requested",
        success: false,
        ip,
        userAgent,
        metadata: { reason: "no_matching_account" },
      });
    }
  } catch (err) {
    // Never surface DB/email failures to the caller — same generic response
    // either way, but log server-side so a real delivery problem is visible
    // to the admin reviewing logs.
    console.error("forgot-password error:", err);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
