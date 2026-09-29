import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials } from "@/lib/admin/auth-service";
import { issueLoginOtp, LOGIN_OTP_TTL_MS } from "@/lib/admin/login-otp";
import { getClientIp } from "@/lib/admin/rate-limit";
import { destroyCurrentSession, createLoginOtpPendingCookie } from "@/lib/admin/session";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent");

  const result = await verifyCredentials(username, password, ip, userAgent);

  if (!result.ok) {
    // Deliberately generic - never reveals which part was wrong or whether
    // the account exists, and the same message covers rate-limit/lockout so
    // an attacker cannot distinguish "wrong password" from "account locked".
    const message =
      result.reason === "rate_limited"
        ? "Too many attempts. Please wait a few minutes and try again."
        : "Invalid username or password.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  // Password correct. Never open the dashboard yet — always require the
  // emailed one-time code (this replaces the old TOTP/authenticator step).
  //
  // Deliberately pass only the admin's id, never the `result.admin` object
  // itself. issueLoginOtp() re-reads admin_users fresh from the database
  // by this id and sends the code to whatever admin_users.security_email
  // holds AT THAT MOMENT — the only source of truth for the OTP recipient.
  // There is no fallback to any environment variable, to BUSINESS_EMAIL /
  // ADMIN_EMAIL, or to any previously-cached/older email value.
  const otpResult = await issueLoginOtp(result.admin.id, ip, userAgent);

  if (!otpResult.ok) {
    // Fails safely and explicitly rather than silently granting access:
    // this account has no security email on file to send a code to (or,
    // in the practically-impossible case the account vanished between the
    // password check above and this line, it's simply not found).
    return NextResponse.json(
      {
        error:
          "Email-based verification is not configured for this admin account. " +
          "Contact the site owner to configure a security email before logging in.",
      },
      { status: 400 }
    );
  }

  await createLoginOtpPendingCookie(result.admin.id, otpResult.otpId, LOGIN_OTP_TTL_MS);

  return NextResponse.json({
    step: "otp",
    // Comes straight from issueLoginOtp's own fresh read — never
    // re-derived from `result.admin`, so the masked address shown to the
    // admin can never drift from the address that actually received the
    // code.
    maskedEmail: otpResult.maskedEmail,
    expiresInSeconds: LOGIN_OTP_TTL_MS / 1000,
    // Surfaced only so the UI can show a gentle "having trouble? try resend"
    // hint — never reveals anything about the code or the account itself.
    emailSent: otpResult.emailSent,
  });
}

export async function DELETE() {
  await destroyCurrentSession();
  return NextResponse.json({ ok: true });
}
