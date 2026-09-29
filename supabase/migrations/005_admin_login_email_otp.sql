-- ============================================================================
-- KKCHARM — Admin login email-OTP verification (replaces TOTP/Google
-- Authenticator as the required second factor on admin login).
-- Run after 001, 002, 003, 004. Idempotent.
--
-- This migration is purely additive: it does not touch admin_users,
-- admin_recovery_codes, or the mfa_secret_encrypted / mfa_enabled columns.
-- Those columns and admin_recovery_codes are left in place (unused by the
-- login flow going forward) rather than dropped, so that:
--   * the account-settings "reset / disable MFA" panel (still present,
--     out of scope for this change) keeps working unaffected, and
--   * no historical data is destroyed.
--
-- Design notes (mirrors admin_password_reset_flows in
-- 004_admin_password_reset_flow.sql, the closest existing pattern):
--   * Only a SHA-256 hash of the emailed 6-digit code is stored, never the
--     raw code.
--   * admin_id is NOT NULL here (unlike the password-reset flow): a login
--     OTP is only ever created after username+password have already been
--     verified against a real account, so there is no enumeration concern
--     to defend against at this stage the way there is for forgot-password.
--   * `consumed` covers three terminal states — successfully verified,
--     explicitly superseded by a resend/new login attempt, and
--     attempts-exhausted — so a single boolean is enough to make the row
--     permanently unusable; `expires_at` independently bounds its validity.
--   * `attempts` is a per-code counter, reset implicitly by resend (which
--     invalidates the old row and creates a fresh one with attempts = 0).
-- ============================================================================

create table if not exists admin_login_otp (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  code_hash text not null,             -- SHA-256 of the one-time numeric code emailed to the admin
  attempts integer not null default 0,
  consumed boolean not null default false,
  expires_at timestamptz not null,     -- short-lived (10 minutes)
  requested_ip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_login_otp_admin on admin_login_otp(admin_id);
create index if not exists idx_admin_login_otp_expires on admin_login_otp(expires_at);

alter table admin_login_otp enable row level security;
-- No public policies: service-role key only (supabaseAdmin), same as every
-- other admin_* table in this schema.

-- ----------------------------------------------------------------------------
-- Housekeeping: prune old, already-inert OTP rows. Not required for
-- correctness (the app never treats a consumed/expired row as valid), but
-- keeps the table small. Safe to call any time; safe to ignore if you don't
-- wire up a scheduler.
-- ----------------------------------------------------------------------------
create or replace function cleanup_expired_login_otps()
returns void
language sql
as $$
  delete from admin_login_otp
  where expires_at < now() - interval '24 hours';
$$;
