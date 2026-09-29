export const ADMIN_SESSION_COOKIE = "kkcharm_admin_session";
// Legacy: was used to gate the old mandatory TOTP setup/verify step during
// login. Nothing sets this cookie anymore (see ADMIN_LOGIN_OTP_PENDING_COOKIE
// below), but the constant/type are kept, unused, rather than deleted —
// see the note above admin_login_otp in supabase/migrations/005_*.sql.
export const ADMIN_MFA_PENDING_COOKIE = "kkcharm_admin_mfa_pending";
// Deliberately a DIFFERENT cookie name/purpose than the legacy TOTP one
// above, rather than a reused/repurposed one: keeping them fully separate
// means there is no envelope shape that could ever be valid for both the
// (now-dead) TOTP-verify routes and the new email-OTP-verify routes.
export const ADMIN_LOGIN_OTP_PENDING_COOKIE = "kkcharm_admin_login_otp_pending";
export const ADMIN_PWRESET_FLOW_COOKIE = "kkcharm_admin_pwreset_flow";

export interface SessionEnvelope {
  sid: string;
  adminId: string;
  nonce: string;
  exp: number;
}

export interface MfaPendingEnvelope {
  adminId: string;
  purpose: "mfa_pending";
  exp: number;
}

/**
 * Scopes the post-password, pre-session "enter the emailed code" step of
 * admin login to one specific pending login attempt. Carrying `otpId` (not
 * just `adminId`) means this envelope is bound to exactly one
 * admin_login_otp row — a code emailed for one login attempt can never be
 * satisfied by a different pending attempt for the same account, even if
 * both happen to be in flight at once (e.g. two browsers, or a resend that
 * raced with an old tab).
 */
export interface LoginOtpPendingEnvelope {
  adminId: string;
  otpId: string;
  purpose: "login_otp_pending";
  exp: number;
}

/**
 * Scopes the multi-step "forgot password" flow (email code → recovery code
 * → new password) to a single browser, without ever revealing — via the
 * cookie's mere presence/shape — whether the submitted email matched a real
 * admin account. The cookie only ever carries an opaque flow id; the flow
 * row it points at (see admin_password_reset_flows) is created and signed
 * the same way whether or not a matching admin was found.
 */
export interface PasswordResetFlowEnvelope {
  flowId: string;
  purpose: "pwreset_flow";
  exp: number;
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "ADMIN_SESSION_SECRET is not set (or is shorter than 32 characters)."
      );
    }

    return (
      "dev-only-ephemeral-secret-do-not-use-in-production-" +
      "x".repeat(32)
    );
  }

  return secret;
}

async function hmacSign(value: string): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(value)
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time string comparison for the HMAC signature check below.
 * Implemented with plain Web APIs (no Node `crypto.timingSafeEqual`)
 * because this module runs in the Edge middleware runtime, not just the
 * Node runtime. Unequal lengths are compared against a dummy value first
 * so the function still takes the same code path either way, rather than
 * short-circuiting on length.
 */
function timingSafeStringEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b.length === a.length ? b : a);
  let diff = a.length === b.length ? 0 : 1;
  for (let i = 0; i < bufA.length; i++) {
    diff |= bufA[i] ^ bufB[i];
  }
  return diff === 0;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf-8");
}

async function signEnvelope(payload: object): Promise<string> {
  const json = JSON.stringify(payload);
  const b64 = base64UrlEncode(json);
  const sig = await hmacSign(b64);

  return `${b64}.${sig}`;
}

async function verifyEnvelope<T extends { exp: number }>(
  token: string | undefined | null
): Promise<T | null> {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const b64 = token.slice(0, separator);
  const sig = token.slice(separator + 1);

  if (!b64 || !sig) return null;

  const expectedSig = await hmacSign(b64);

  if (!timingSafeStringEqual(expectedSig, sig)) return null;

  let payload: T;

  try {
    payload = JSON.parse(base64UrlDecode(b64));
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number") return null;
  if (Date.now() > payload.exp) return null;

  return payload;
}

export async function createSessionEnvelope(
  sid: string,
  adminId: string,
  nonce: string,
  ttlMs: number
): Promise<string> {
  return signEnvelope({
    sid,
    adminId,
    nonce,
    exp: Date.now() + ttlMs,
  } satisfies SessionEnvelope);
}

export async function verifySessionEnvelope(
  token: string | undefined | null
): Promise<SessionEnvelope | null> {
  const result = await verifyEnvelope<SessionEnvelope>(token);

  if (
    !result ||
    typeof result.sid !== "string" ||
    typeof result.adminId !== "string" ||
    typeof result.nonce !== "string"
  ) {
    return null;
  }

  return result;
}

export async function createMfaPendingEnvelope(
  adminId: string,
  ttlMs: number
): Promise<string> {
  return signEnvelope({
    adminId,
    purpose: "mfa_pending",
    exp: Date.now() + ttlMs,
  } satisfies MfaPendingEnvelope);
}

export async function verifyMfaPendingEnvelope(
  token: string | undefined | null
): Promise<MfaPendingEnvelope | null> {
  const result = await verifyEnvelope<MfaPendingEnvelope>(token);

  if (!result || result.purpose !== "mfa_pending") {
    return null;
  }

  return result;
}

export async function createLoginOtpPendingEnvelope(
  adminId: string,
  otpId: string,
  ttlMs: number
): Promise<string> {
  return signEnvelope({
    adminId,
    otpId,
    purpose: "login_otp_pending",
    exp: Date.now() + ttlMs,
  } satisfies LoginOtpPendingEnvelope);
}

export async function verifyLoginOtpPendingEnvelope(
  token: string | undefined | null
): Promise<LoginOtpPendingEnvelope | null> {
  const result = await verifyEnvelope<LoginOtpPendingEnvelope>(token);

  if (
    !result ||
    result.purpose !== "login_otp_pending" ||
    typeof result.otpId !== "string"
  ) {
    return null;
  }

  return result;
}

export async function createPasswordResetFlowEnvelope(
  flowId: string,
  ttlMs: number
): Promise<string> {
  return signEnvelope({
    flowId,
    purpose: "pwreset_flow",
    exp: Date.now() + ttlMs,
  } satisfies PasswordResetFlowEnvelope);
}

export async function verifyPasswordResetFlowEnvelope(
  token: string | undefined | null
): Promise<PasswordResetFlowEnvelope | null> {
  const result = await verifyEnvelope<PasswordResetFlowEnvelope>(token);

  if (!result || result.purpose !== "pwreset_flow") {
    return null;
  }

  return result;
}