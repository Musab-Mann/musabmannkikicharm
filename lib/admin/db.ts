import { supabaseAdmin } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  securityEmail: string;
  mfaSecretEncrypted: string | null;
  mfaEnabled: boolean;
  failedLoginCount: number;
  lockedUntil: string | null;
}

function mapAdminUser(row: any): AdminUser {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    securityEmail: row.security_email,
    mfaSecretEncrypted: row.mfa_secret_encrypted,
    mfaEnabled: row.mfa_enabled,
    failedLoginCount: row.failed_login_count,
    lockedUntil: row.locked_until,
  };
}

export async function getAdminByUsername(username: string): Promise<AdminUser | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("*")
    .eq("username", username)
    .maybeSingle();
  if (error) {
    console.error("getAdminByUsername error:", error);
    return null;
  }
  return data ? mapAdminUser(data) : null;
}

/** Case-insensitive lookup by security email, used only by the
 * forgot-password flow. Never expose whether this returns a row or not to
 * the caller of the API route — see /api/admin/forgot-password. */
export async function getAdminBySecurityEmail(email: string): Promise<AdminUser | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("*")
    .ilike("security_email", email)
    .maybeSingle();
  if (error) {
    console.error("getAdminBySecurityEmail error:", error);
    return null;
  }
  return data ? mapAdminUser(data) : null;
}

export async function getAdminById(id: string): Promise<AdminUser | null> {
  const { data, error } = await supabaseAdmin.from("admin_users").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("getAdminById error:", error);
    return null;
  }
  return data ? mapAdminUser(data) : null;
}

export async function countAdmins(): Promise<number> {
  const { count, error } = await supabaseAdmin.from("admin_users").select("*", { count: "exact", head: true });
  if (error) {
    console.error("countAdmins error:", error);
    return 0;
  }
  return count ?? 0;
}

export async function recordFailedLogin(adminId: string, currentCount: number): Promise<void> {
  const newCount = currentCount + 1;
  // Exponential backoff, capped at 15 minutes — deliberately NOT a permanent
  // lockout, so an attacker cannot lock the real owner out indefinitely.
  const lockMinutes = Math.min(15, Math.pow(2, Math.max(0, newCount - 3)));
  const lockedUntil = newCount >= 3 ? new Date(Date.now() + lockMinutes * 60_000).toISOString() : null;
  await supabaseAdmin
    .from("admin_users")
    .update({ failed_login_count: newCount, locked_until: lockedUntil, updated_at: new Date().toISOString() })
    .eq("id", adminId);
}

export async function resetFailedLogins(adminId: string): Promise<void> {
  await supabaseAdmin
    .from("admin_users")
    .update({ failed_login_count: 0, locked_until: null, updated_at: new Date().toISOString() })
    .eq("id", adminId);
}

export async function updateAdminCredentials(
  adminId: string,
  patch: Partial<{
    username: string;
    passwordHash: string;
    securityEmail: string;
    mfaSecretEncrypted: string | null;
    mfaEnabled: boolean;
  }>
): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.username !== undefined) update.username = patch.username;
  if (patch.passwordHash !== undefined) update.password_hash = patch.passwordHash;
  if (patch.securityEmail !== undefined) update.security_email = patch.securityEmail;
  if (patch.mfaSecretEncrypted !== undefined) update.mfa_secret_encrypted = patch.mfaSecretEncrypted;
  if (patch.mfaEnabled !== undefined) update.mfa_enabled = patch.mfaEnabled;

  const { error } = await supabaseAdmin.from("admin_users").update(update).eq("id", adminId);
  if (error) {
    console.error("updateAdminCredentials error:", error);
    throw new Error("Failed to update admin account");
  }
}

// ---------- Recovery codes ----------

export async function storeRecoveryCodes(adminId: string, hashedCodes: string[]): Promise<void> {
  await supabaseAdmin.from("admin_recovery_codes").delete().eq("admin_id", adminId);
  const rows = hashedCodes.map((code_hash) => ({ admin_id: adminId, code_hash }));
  const { error } = await supabaseAdmin.from("admin_recovery_codes").insert(rows);
  if (error) {
    console.error("storeRecoveryCodes error:", error);
    throw new Error("Failed to store recovery codes");
  }
}

export async function findUnusedRecoveryCode(adminId: string, codeHash: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_recovery_codes")
    .select("id")
    .eq("admin_id", adminId)
    .eq("code_hash", codeHash)
    .eq("used", false)
    .maybeSingle();
  if (error || !data) return null;
  return data.id;
}

export async function consumeRecoveryCode(codeId: string): Promise<void> {
  await supabaseAdmin
    .from("admin_recovery_codes")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("id", codeId);
}

export async function countUnusedRecoveryCodes(adminId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("admin_recovery_codes")
    .select("*", { count: "exact", head: true })
    .eq("admin_id", adminId)
    .eq("used", false);
  return count ?? 0;
}

// ---------- Admin login email OTP (replaces TOTP as the login second factor) ----------
//
// See supabase/migrations/005_admin_login_email_otp.sql for the schema and
// design rationale. Unlike the password-reset flow below, a row here is
// only ever created after username+password have already been verified —
// there is no admin-enumeration concern to defend against at this stage.

export interface LoginOtpRow {
  id: string;
  adminId: string;
  codeHash: string;
  attempts: number;
  consumed: boolean;
  expiresAt: string;
}

function mapLoginOtp(row: any): LoginOtpRow {
  return {
    id: row.id,
    adminId: row.admin_id,
    codeHash: row.code_hash,
    attempts: row.attempts,
    consumed: row.consumed,
    expiresAt: row.expires_at,
  };
}

export async function createLoginOtp(params: {
  adminId: string;
  codeHash: string;
  expiresAt: Date;
  requestedIp: string | null;
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("admin_login_otp")
    .insert({
      admin_id: params.adminId,
      code_hash: params.codeHash,
      expires_at: params.expiresAt.toISOString(),
      requested_ip: params.requestedIp,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createLoginOtp error:", error);
    throw new Error("Failed to create login verification code");
  }
  return data.id;
}

/**
 * Returns the OTP row (open, expired, or already consumed) as long as it
 * belongs to the given admin — the adminId check is what prevents a code
 * generated for one account ever being usable to complete a pending login
 * for a different account, even if an otpId were somehow guessed. Callers
 * decide from the row's own `consumed`/`expires_at` fields whether it is
 * still usable; unlike getOpenLoginOtp below, this lets the caller tell
 * "expired" apart from "wrong code" for a friendlier error message.
 */
export async function getLoginOtpById(otpId: string, adminId: string): Promise<LoginOtpRow | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_login_otp")
    .select("*")
    .eq("id", otpId)
    .eq("admin_id", adminId)
    .maybeSingle();
  if (error || !data) return null;
  return mapLoginOtp(data);
}

export async function incrementLoginOtpAttempts(otpId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("admin_login_otp")
    .select("attempts")
    .eq("id", otpId)
    .maybeSingle();
  await supabaseAdmin
    .from("admin_login_otp")
    .update({ attempts: (data?.attempts ?? 0) + 1 })
    .eq("id", otpId);
}

export async function consumeLoginOtp(otpId: string): Promise<void> {
  await supabaseAdmin.from("admin_login_otp").update({ consumed: true }).eq("id", otpId);
}

/** Invalidates every other still-open OTP for this admin — called before
 * issuing a new one (initial send or resend) so a stale, previously-emailed
 * code can never be used alongside the newest one. */
export async function invalidateOpenLoginOtps(adminId: string): Promise<void> {
  await supabaseAdmin
    .from("admin_login_otp")
    .update({ consumed: true })
    .eq("admin_id", adminId)
    .eq("consumed", false);
}

// ---------- Password reset flow (email code → recovery code → new password) ----------
//
// NOTE: this replaces the earlier single "emailed magic-link" token design
// (the admin_password_reset_tokens table from migration 003, still present
// in the schema but unused as of this flow) with the multi-step flow the
// security brief calls for: a short-lived numeric code emailed to the
// security address, followed by a recovery-code check, before a new
// password can be set. See supabase/migrations/004_admin_password_reset_flow.sql.

export interface PasswordResetFlowRow {
  id: string;
  adminId: string | null;
  emailCodeHash: string;
  emailAttempts: number;
  emailVerified: boolean;
  recoveryAttempts: number;
  recoveryVerified: boolean;
  completed: boolean;
  expiresAt: string;
}

function mapFlow(row: any): PasswordResetFlowRow {
  return {
    id: row.id,
    adminId: row.admin_id,
    emailCodeHash: row.email_code_hash,
    emailAttempts: row.email_attempts,
    emailVerified: row.email_verified,
    recoveryAttempts: row.recovery_attempts,
    recoveryVerified: row.recovery_verified,
    completed: row.completed,
    expiresAt: row.expires_at,
  };
}

/**
 * Creates a new flow row regardless of whether `adminId` is a real match —
 * callers must always take this path (never short-circuit when the email
 * didn't match an account), so that timing and cookie behavior are
 * identical either way. See /api/admin/forgot-password.
 */
export async function createPasswordResetFlow(params: {
  adminId: string | null;
  emailCodeHash: string;
  expiresAt: Date;
  requestedIp: string | null;
}): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("admin_password_reset_flows")
    .insert({
      admin_id: params.adminId,
      email_code_hash: params.emailCodeHash,
      expires_at: params.expiresAt.toISOString(),
      requested_ip: params.requestedIp,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createPasswordResetFlow error:", error);
    throw new Error("Failed to start password reset");
  }
  return data.id;
}

/** Returns the flow only if it is still open (not completed, not expired). */
export async function getOpenPasswordResetFlow(flowId: string): Promise<PasswordResetFlowRow | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_password_reset_flows")
    .select("*")
    .eq("id", flowId)
    .eq("completed", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  return mapFlow(data);
}

/**
 * Per-flow attempt counters guarding a single browser's short-lived reset
 * session (on top of the IP/email rate limiting already applied at the
 * route level). Read-then-write rather than an atomic SQL increment — an
 * acceptable tradeoff here since a flow is scoped to one signed cookie in
 * one browser, so there is no realistic concurrent-writer race to defend
 * against, unlike the globally-shared counters elsewhere in this schema.
 */
export async function incrementFlowEmailAttempts(flowId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("admin_password_reset_flows")
    .select("email_attempts")
    .eq("id", flowId)
    .maybeSingle();
  await supabaseAdmin
    .from("admin_password_reset_flows")
    .update({ email_attempts: (data?.email_attempts ?? 0) + 1 })
    .eq("id", flowId);
}

export async function incrementFlowRecoveryAttempts(flowId: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("admin_password_reset_flows")
    .select("recovery_attempts")
    .eq("id", flowId)
    .maybeSingle();
  await supabaseAdmin
    .from("admin_password_reset_flows")
    .update({ recovery_attempts: (data?.recovery_attempts ?? 0) + 1 })
    .eq("id", flowId);
}

export async function markFlowEmailVerified(flowId: string): Promise<void> {
  await supabaseAdmin.from("admin_password_reset_flows").update({ email_verified: true }).eq("id", flowId);
}

export async function markFlowRecoveryVerified(flowId: string, consumedRecoveryCodeId: string): Promise<void> {
  await supabaseAdmin
    .from("admin_password_reset_flows")
    .update({ recovery_verified: true, consumed_recovery_code_id: consumedRecoveryCodeId })
    .eq("id", flowId);
}

export async function markFlowCompleted(flowId: string): Promise<void> {
  await supabaseAdmin.from("admin_password_reset_flows").update({ completed: true }).eq("id", flowId);
}

/** Closes out every other still-open flow for this admin — a completed or
 * abandoned reset must not leave a sibling flow (from a repeated request)
 * still redeemable afterwards. */
export async function invalidateOtherPasswordResetFlows(adminId: string, exceptFlowId?: string): Promise<void> {
  let query = supabaseAdmin
    .from("admin_password_reset_flows")
    .update({ completed: true })
    .eq("admin_id", adminId)
    .eq("completed", false);
  if (exceptFlowId) query = query.neq("id", exceptFlowId);
  await query;
}

// ---------- Sessions ----------

export interface SessionRow {
  id: string;
  adminId: string;
  expiresAt: string;
  lastSeenAt: string;
  revoked: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export async function createSessionRow(
  adminId: string,
  tokenHash: string,
  expiresAt: Date,
  ip: string | null,
  userAgent: string | null
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .insert({
      admin_id: adminId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createSessionRow error:", error);
    throw new Error("Failed to create session");
  }
  return data.id;
}

export async function getSession(sessionId: string, tokenHash: string): Promise<SessionRow | null> {
  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    adminId: data.admin_id,
    expiresAt: data.expires_at,
    lastSeenAt: data.last_seen_at,
    revoked: data.revoked,
    ip: data.ip,
    userAgent: data.user_agent,
    createdAt: data.created_at,
  };
}

export async function touchSession(sessionId: string): Promise<void> {
  await supabaseAdmin
    .from("admin_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionId);
}

export async function revokeSession(sessionId: string): Promise<void> {
  await supabaseAdmin.from("admin_sessions").update({ revoked: true }).eq("id", sessionId);
}

export async function revokeAllSessions(adminId: string, exceptSessionId?: string): Promise<void> {
  let query = supabaseAdmin.from("admin_sessions").update({ revoked: true }).eq("admin_id", adminId);
  if (exceptSessionId) query = query.neq("id", exceptSessionId);
  await query;
}

export async function listActiveSessions(adminId: string): Promise<SessionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("*")
    .eq("admin_id", adminId)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .order("last_seen_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    adminId: row.admin_id,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at,
    revoked: row.revoked,
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}

// ---------- Audit log ----------

export type AdminAuditEvent =
  | "login_success"
  | "login_failed"
  | "login_otp_sent"
  | "login_otp_send_failed"
  | "login_otp_verified"
  | "login_otp_failed"
  | "login_otp_resent"
  | "mfa_success"
  | "mfa_failed"
  | "mfa_recovery_code_used"
  | "logout"
  | "session_revoked"
  | "all_sessions_revoked"
  | "password_changed"
  | "username_changed"
  | "email_changed"
  | "password_reset_requested"
  | "password_reset_email_verified"
  | "password_reset_recovery_verified"
  | "password_reset_completed"
  | "password_reset_failed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "mfa_setup_started"
  | "mfa_reset_started"
  | "mfa_reset_completed"
  | "mfa_reset_failed"
  | "recovery_codes_regenerated"
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "order_status_changed"
  | "business_settings_changed"
  | "account_locked";

export async function logAdminEvent(params: {
  adminId?: string | null;
  event: AdminAuditEvent;
  success: boolean;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: params.adminId ?? null,
    event: params.event,
    success: params.success,
    ip: params.ip ?? null,
    user_agent: params.userAgent ?? null,
    metadata: params.metadata ?? {},
  });
  if (error) {
    // Audit logging must never crash the request it's observing.
    console.error("logAdminEvent error:", error);
  }
}

export async function getRecentAuditLog(limit = 100) {
  const { data, error } = await supabaseAdmin
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("getRecentAuditLog error:", error);
    return [];
  }
  return data;
}
