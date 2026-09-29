import { NextRequest, NextResponse } from "next/server";
import { getPendingLoginOtp, createLoginOtpPendingCookie } from "@/lib/admin/session";
import { issueLoginOtp, getAdminForResend, LOGIN_OTP_TTL_MS } from "@/lib/admin/login-otp";
import { logAdminEvent } from "@/lib/admin/db";
import { checkRateLimit, getClientIp } from "@/lib/admin/rate-limit";

// Deliberately generous enough not to block a real admin who mistyped or
// didn't receive the first email, but bounded so resend can't be used to
// spam the security inbox or hammer the rate limiter on /api/admin/login.
const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 10 * 60_000;

/**
 * Re-sends a fresh code for the CURRENT pending login attempt. Never
 * accepts an email address from the request — the recipient is always
 * whatever admin_users.security_email currently holds for this admin,
 * read fresh from the database inside issueLoginOtp() itself (not from
 * any value cached earlier in this request, and not from any env var or
 * fallback address).
 */
export async function POST(req: NextRequest) {
  const pending = await getPendingLoginOtp();
  if (!pending) {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  const limit = checkRateLimit(`login-otp-resend:${pending.adminId}`, RESEND_LIMIT, RESEND_WINDOW_MS);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before requesting another code." },
      { status: 429 }
    );
  }

  // Quick existence guard only (gives a clean "log in again" response if the
  // account was somehow removed mid-flow). The actual OTP-recipient lookup
  // happens independently and freshly inside issueLoginOtp below.
  const adminExists = await getAdminForResend(pending.adminId);
  if (!adminExists) {
    return NextResponse.json({ error: "Session expired. Please log in again." }, { status: 401 });
  }

  const otpResult = await issueLoginOtp(pending.adminId, ip, userAgent);
  if (!otpResult.ok) {
    return NextResponse.json(
      {
        error:
          "Email-based verification is not configured for this admin account. " +
          "Contact the site owner to configure a security email before logging in.",
      },
      { status: 400 }
    );
  }

  // Refresh the pending cookie so it points at the new OTP row (the old
  // one was just invalidated inside issueLoginOtp) and gives a full fresh
  // window to enter the new code.
  await createLoginOtpPendingCookie(pending.adminId, otpResult.otpId, LOGIN_OTP_TTL_MS);

  // Logged in addition to the "login_otp_sent" event issueLoginOtp already
  // records, so the audit trail can distinguish an initial send from a
  // resend at a glance.
  await logAdminEvent({ adminId: pending.adminId, event: "login_otp_resent", success: otpResult.emailSent, ip, userAgent });

  return NextResponse.json({
    ok: true,
    // Comes straight from issueLoginOtp's own fresh read of the current
    // security email — guaranteed to match whatever inbox the code was
    // actually sent to.
    maskedEmail: otpResult.maskedEmail,
    expiresInSeconds: LOGIN_OTP_TTL_MS / 1000,
    emailSent: otpResult.emailSent,
  });
}
