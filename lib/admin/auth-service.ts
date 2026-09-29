import { getAdminByUsername, recordFailedLogin, logAdminEvent, type AdminUser } from "@/lib/admin/db";
import { verifyPassword } from "@/lib/admin/crypto";
import { checkRateLimit } from "@/lib/admin/rate-limit";

export type LoginResult =
  | { ok: true; admin: AdminUser }
  | { ok: false; reason: "invalid_credentials" | "locked" | "rate_limited" };

/**
 * Step 1: username + password. Never reveals whether the username exists —
 * "invalid_credentials" is returned for both a wrong username and a wrong
 * password, so this endpoint cannot be used to enumerate admin accounts.
 */
export async function verifyCredentials(
  username: string,
  password: string,
  ip: string,
  userAgent: string | null
): Promise<LoginResult> {
  const ipLimit = checkRateLimit(`login:ip:${ip}`, 10, 5 * 60_000);
  if (!ipLimit.allowed) {
    await logAdminEvent({ event: "login_failed", success: false, ip, userAgent, metadata: { reason: "ip_rate_limited" } });
    return { ok: false, reason: "rate_limited" };
  }

  const admin = await getAdminByUsername(username);
  if (!admin) {
    // Burn roughly the same time as a real password verification would, so
    // response timing doesn't leak whether the username exists.
    await verifyPassword(password, "$argon2id$v=19$m=19456,t=3,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    await logAdminEvent({ event: "login_failed", success: false, ip, userAgent, metadata: { reason: "unknown_username" } });
    return { ok: false, reason: "invalid_credentials" };
  }

  if (admin.lockedUntil && new Date(admin.lockedUntil).getTime() > Date.now()) {
    await logAdminEvent({ adminId: admin.id, event: "login_failed", success: false, ip, userAgent, metadata: { reason: "locked" } });
    return { ok: false, reason: "locked" };
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    await recordFailedLogin(admin.id, admin.failedLoginCount);
    await logAdminEvent({ adminId: admin.id, event: "login_failed", success: false, ip, userAgent, metadata: { reason: "bad_password" } });
    return { ok: false, reason: "invalid_credentials" };
  }

  // Password correct — do NOT reset failed_login_count or log success yet;
  // the emailed OTP step is still required. login_success is logged only
  // after that step passes (see lib/admin/login-otp.ts).
  return { ok: true, admin };
}
