import { NextRequest, NextResponse } from "next/server";
import { getPendingLoginOtp, createAdminSession, clearLoginOtpPendingCookie } from "@/lib/admin/session";
import { verifyLoginOtp } from "@/lib/admin/login-otp";
import { checkRateLimit, getClientIp } from "@/lib/admin/rate-limit";
import { countUnusedRecoveryCodes, storeRecoveryCodes, logAdminEvent } from "@/lib/admin/db";
import { generateRecoveryCode, sha256Hex } from "@/lib/admin/crypto";
import { RECOVERY_CODE_COUNT } from "@/lib/admin/recovery-codes";

/**
 * Step 2 of admin login: verify the 6-digit code emailed to the admin's
 * security address, then mint the real admin session. Requires a valid
 * pending-login cookie (set only after username+password already passed —
 * see /api/admin/login) bound to one specific emailed code.
 */
export async function POST(req: NextRequest) {
  const pending = await getPendingLoginOtp();
  if (!pending) {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  // IP-scoped rate limit on top of the per-code attempt cap in
  // verifyLoginOtp — stops brute-forcing across resends from one IP.
  const ipLimit = checkRateLimit(`login-otp-verify:ip:${ip}`, 15, 10 * 60_000);
  if (!ipLimit.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const code = String(body.code ?? "").trim();

  const result = await verifyLoginOtp(pending.adminId, pending.otpId, code, ip, userAgent);

  if (!result.ok) {
    switch (result.reason) {
      case "attempts_exceeded":
        await clearLoginOtpPendingCookie();
        return NextResponse.json(
          { error: "Too many attempts. Please request a new code.", step: "expired" },
          { status: 429 }
        );
      case "expired":
      case "not_found":
        await clearLoginOtpPendingCookie();
        return NextResponse.json(
          { error: "Verification code has expired.", step: "expired" },
          { status: 401 }
        );
      case "incorrect_code":
      default:
        return NextResponse.json({ error: "Verification code is incorrect." }, { status: 401 });
    }
  }

  await createAdminSession(pending.adminId, ip, userAgent);
  await clearLoginOtpPendingCookie();

  // First-time security setup (replaces the old mandatory TOTP-enrollment
  // step): a brand-new admin account has no recovery codes yet. Generate
  // exactly 8, shown to the admin once, right here — never re-shown after
  // this response, since only their hashes are persisted from this point on.
  const existingCodes = await countUnusedRecoveryCodes(pending.adminId);
  if (existingCodes === 0) {
    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () => generateRecoveryCode());
    await storeRecoveryCodes(pending.adminId, recoveryCodes.map((c) => sha256Hex(c)));
    await logAdminEvent({
      adminId: pending.adminId,
      event: "recovery_codes_regenerated",
      success: true,
      ip,
      userAgent,
      metadata: { reason: "first_time_setup" },
    });
    return NextResponse.json({ ok: true, firstTimeSetup: true, recoveryCodes });
  }

  return NextResponse.json({ ok: true });
}
