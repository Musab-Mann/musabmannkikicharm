import { cookies } from "next/headers";
import {
  ADMIN_MFA_PENDING_COOKIE,
  ADMIN_LOGIN_OTP_PENDING_COOKIE,
  ADMIN_SESSION_COOKIE,
  ADMIN_PWRESET_FLOW_COOKIE,
  createSessionEnvelope,
  verifySessionEnvelope,
  verifyMfaPendingEnvelope,
  createLoginOtpPendingEnvelope,
  verifyLoginOtpPendingEnvelope,
  createPasswordResetFlowEnvelope,
  verifyPasswordResetFlowEnvelope,
} from "./session-token";
import {
  createSessionRow,
  getSession,
  touchSession,
  revokeSession,
} from "./db";
import { randomToken, sha256Hex } from "./crypto";

const ABSOLUTE_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const IDLE_SESSION_TIMEOUT_MS = 45 * 60 * 1000;

export interface AdminSession {
  adminId: string;
  sessionId: string;
}

export async function createAdminSession(
  adminId: string,
  ip: string | null,
  userAgent: string | null
): Promise<void> {
  const rawToken = randomToken(32);
  const tokenHash = sha256Hex(rawToken);

  const expiresAt = new Date(Date.now() + ABSOLUTE_SESSION_TTL_MS);

  const sessionId = await createSessionRow(
    adminId,
    tokenHash,
    expiresAt,
    ip,
    userAgent
  );

  const envelope = await createSessionEnvelope(
    sessionId,
    adminId,
    rawToken,
    ABSOLUTE_SESSION_TTL_MS
  );

  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, envelope, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ABSOLUTE_SESSION_TTL_MS / 1000,
  });
}

export async function verifyAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  const envelope = await verifySessionEnvelope(token);

  if (!envelope) {
    return null;
  }

  const tokenHash = sha256Hex(envelope.nonce);

  const session = await getSession(envelope.sid, tokenHash);

  if (!session) {
    return null;
  }

  if (session.revoked) {
    return null;
  }

  if (session.adminId !== envelope.adminId) {
    return null;
  }

  const now = Date.now();

  if (new Date(session.expiresAt).getTime() <= now) {
    return null;
  }

  const lastSeenAt = new Date(session.lastSeenAt).getTime();

  if (now - lastSeenAt > IDLE_SESSION_TIMEOUT_MS) {
    await revokeSession(session.id);
    return null;
  }

  await touchSession(session.id);

  return {
    adminId: session.adminId,
    sessionId: session.id,
  };
}

export async function destroyCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (token) {
    const envelope = await verifySessionEnvelope(token);

    if (envelope) {
      const tokenHash = sha256Hex(envelope.nonce);
      const session = await getSession(envelope.sid, tokenHash);

      if (session) {
        await revokeSession(session.id);
      }
    }
  }

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * @deprecated Legacy TOTP-login-pending cookie helper. Nothing in the
 * active login flow sets ADMIN_MFA_PENDING_COOKIE anymore (see
 * getPendingLoginOtp / createLoginOtpPendingCookie below for its
 * replacement), so this will always return null in practice now. Left in
 * place, unused, rather than deleted — see the note in
 * supabase/migrations/005_admin_login_email_otp.sql.
 */
export async function getPendingMfaAdminId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_MFA_PENDING_COOKIE)?.value;

  const envelope = await verifyMfaPendingEnvelope(token);

  return envelope?.adminId ?? null;
}

/** @deprecated See getPendingMfaAdminId. */
export async function clearMfaPendingCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_MFA_PENDING_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Cookie orchestration for the post-password, pre-session step of admin
 * login: the admin has proven username+password, but the real session is
 * only minted once the emailed 6-digit code is verified. Mirrors the MFA
 * cookie pattern above and the password-reset flow cookie below: the
 * cookie itself only ever carries an opaque adminId + otpId pair, HMAC
 * signed, never the code.
 */
export async function createLoginOtpPendingCookie(
  adminId: string,
  otpId: string,
  ttlMs: number
): Promise<void> {
  const envelope = await createLoginOtpPendingEnvelope(adminId, otpId, ttlMs);
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_LOGIN_OTP_PENDING_COOKIE, envelope, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlMs / 1000,
  });
}

export async function getPendingLoginOtp(): Promise<{ adminId: string; otpId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_LOGIN_OTP_PENDING_COOKIE)?.value;
  const envelope = await verifyLoginOtpPendingEnvelope(token);
  if (!envelope) return null;
  return { adminId: envelope.adminId, otpId: envelope.otpId };
}

export async function clearLoginOtpPendingCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_LOGIN_OTP_PENDING_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Cookie orchestration for the forgot-password flow (email code → recovery
 * code → new password). Mirrors the MFA-pending cookie above: the cookie
 * itself only ever carries an opaque flow id, signed with the same
 * HMAC-based envelope used everywhere else in admin auth.
 */
export async function createPasswordResetFlowCookie(
  flowId: string,
  ttlMs: number
): Promise<void> {
  const envelope = await createPasswordResetFlowEnvelope(flowId, ttlMs);
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_PWRESET_FLOW_COOKIE, envelope, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlMs / 1000,
  });
}

export async function getPasswordResetFlowId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_PWRESET_FLOW_COOKIE)?.value;
  const envelope = await verifyPasswordResetFlowEnvelope(token);
  return envelope?.flowId ?? null;
}

export async function clearPasswordResetFlowCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_PWRESET_FLOW_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}