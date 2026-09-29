import {
  getAdminById,
  createLoginOtp,
  getLoginOtpById,
  incrementLoginOtpAttempts,
  consumeLoginOtp,
  invalidateOpenLoginOtps,
  resetFailedLogins,
  logAdminEvent,
} from "@/lib/admin/db";
import { generateNumericCode, sha256Hex, safeEqual } from "@/lib/admin/crypto";
import { sendAdminLoginOtpEmail } from "@/lib/email";

// Second factor for admin login (replaces TOTP). Kept short, per the
// security brief's "10 minutes or less" requirement.
export const LOGIN_OTP_TTL_MS = 10 * 60_000;
export const LOGIN_OTP_MAX_ATTEMPTS = 5;

/**
 * Masks a security email for display on the login screen, e.g.
 * "owner@example.com" -> "o***r@e***e.com". Never exposes the full
 * address — only enough for the admin to recognize which inbox to check.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  const maskedLocal =
    local.length <= 2
      ? local[0] + "*".repeat(Math.max(1, local.length - 1))
      : local[0] + "*".repeat(local.length - 2) + local[local.length - 1];

  const dot = domain.lastIndexOf(".");
  let maskedDomain = domain;
  if (dot > 0) {
    const domainLabel = domain.slice(0, dot);
    const tld = domain.slice(dot); // includes the leading "."
    maskedDomain =
      (domainLabel.length <= 2
        ? domainLabel[0] + "*".repeat(Math.max(1, domainLabel.length - 1))
        : domainLabel[0] + "*".repeat(domainLabel.length - 2) + domainLabel[domainLabel.length - 1]) + tld;
  }

  return `${maskedLocal}@${maskedDomain}`;
}

export type IssueLoginOtpResult =
  | { ok: true; otpId: string; emailSent: boolean; maskedEmail: string }
  | { ok: false; reason: "no_security_email" | "admin_not_found" };

/**
 * Generates a fresh code, invalidates any previously outstanding code for
 * this admin (so an old, still-emailed code can never be used alongside a
 * new one — required both on initial login and on every resend), stores
 * only its hash, and emails the raw code. The raw code is never returned
 * to the caller, logged, or persisted anywhere in plaintext.
 *
 * IMPORTANT: takes only an adminId, never an admin object. The admin
 * record — and specifically admin.securityEmail, the ONLY source of truth
 * for where the code goes — is read fresh from the database right here,
 * every single call. This deliberately makes it impossible for a caller to
 * pass in a stale/cached admin object (e.g. one read slightly earlier in
 * the same request, or before a security-email change) and have that
 * stale email used as the OTP recipient: whatever admin_users.security_email
 * currently holds in the database at the moment the code is issued is what
 * receives it, with no other fallback of any kind (no env var, no
 * BUSINESS_EMAIL/ADMIN_EMAIL, no hardcoded address).
 */
export async function issueLoginOtp(
  adminId: string,
  ip: string,
  userAgent: string | null
): Promise<IssueLoginOtpResult> {
  const admin = await getAdminById(adminId);
  if (!admin) {
    return { ok: false, reason: "admin_not_found" };
  }

  if (!admin.securityEmail) {
    await logAdminEvent({
      adminId: admin.id,
      event: "login_otp_send_failed",
      success: false,
      ip,
      userAgent,
      metadata: { reason: "no_security_email" },
    });
    return { ok: false, reason: "no_security_email" };
  }

  await invalidateOpenLoginOtps(admin.id);

  const rawCode = generateNumericCode(6);
  const codeHash = sha256Hex(rawCode);
  const expiresAt = new Date(Date.now() + LOGIN_OTP_TTL_MS);

  const otpId = await createLoginOtp({
    adminId: admin.id,
    codeHash,
    expiresAt,
    requestedIp: ip,
  });

  // admin.securityEmail here is the exact value just read from
  // admin_users.security_email above — nothing else can reach this call.
  const { sent } = await sendAdminLoginOtpEmail(admin.securityEmail, { code: rawCode, ip });

  await logAdminEvent({
    adminId: admin.id,
    event: sent ? "login_otp_sent" : "login_otp_send_failed",
    success: sent,
    ip,
    userAgent,
  });

  return { ok: true, otpId, emailSent: sent, maskedEmail: maskEmail(admin.securityEmail) };
}

export type VerifyLoginOtpResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "incorrect_code" | "attempts_exceeded" };

/**
 * Verifies a submitted code against the specific pending OTP row (bound by
 * both otpId and adminId — see getLoginOtpById, which is what prevents a
 * code generated for one account ever being usable to complete a pending
 * login for a different account). On success, resets the failed-login
 * counter and logs login_success; the caller is still responsible for
 * actually minting the session.
 */
export async function verifyLoginOtp(
  adminId: string,
  otpId: string,
  code: string,
  ip: string,
  userAgent: string | null
): Promise<VerifyLoginOtpResult> {
  const otp = await getLoginOtpById(otpId, adminId);

  const logFail = (reason: string) =>
    logAdminEvent({ adminId, event: "login_otp_failed", success: false, ip, userAgent, metadata: { reason } });

  if (!otp) {
    await logFail("not_found");
    return { ok: false, reason: "not_found" };
  }

  if (otp.consumed) {
    // Already used, superseded by a resend, or already attempts-exhausted —
    // all of these mean "this specific code is no longer valid", which the
    // login screen presents the same way a genuinely expired code would.
    await logFail("already_consumed");
    return { ok: false, reason: "expired" };
  }

  if (new Date(otp.expiresAt).getTime() <= Date.now()) {
    await consumeLoginOtp(otp.id);
    await logFail("time_expired");
    return { ok: false, reason: "expired" };
  }

  if (otp.attempts >= LOGIN_OTP_MAX_ATTEMPTS) {
    await consumeLoginOtp(otp.id);
    await logFail("attempts_exceeded");
    return { ok: false, reason: "attempts_exceeded" };
  }

  const providedHash = code ? sha256Hex(code) : "";
  const matches = /^\d{6}$/.test(code) && safeEqual(providedHash, otp.codeHash);

  if (!matches) {
    await incrementLoginOtpAttempts(otp.id);
    const attemptsNow = otp.attempts + 1;
    if (attemptsNow >= LOGIN_OTP_MAX_ATTEMPTS) {
      // This was the last allowed try — invalidate immediately rather than
      // waiting for a future request to notice, so the window between "5th
      // wrong guess" and "code rejected" is zero.
      await consumeLoginOtp(otp.id);
      await logFail("attempts_exceeded");
      return { ok: false, reason: "attempts_exceeded" };
    }
    await logFail("incorrect_code");
    return { ok: false, reason: "incorrect_code" };
  }

  await consumeLoginOtp(otp.id);
  await resetFailedLogins(adminId);
  await logAdminEvent({ adminId, event: "login_otp_verified", success: true, ip, userAgent });
  await logAdminEvent({ adminId, event: "login_success", success: true, ip, userAgent, metadata: { method: "email_otp" } });

  return { ok: true };
}

/** Looks up an admin purely for the "no account matches this pending
 * login" guard in the resend route — the actual OTP-recipient lookup
 * happens independently and freshly inside issueLoginOtp() itself. */
export async function getAdminForResend(adminId: string) {
  return getAdminById(adminId);
}
