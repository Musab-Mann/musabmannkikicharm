-- ============================================================================
-- KKCHARM — Admin forgot-password flow v2 (email code → recovery code →
-- new password), plus admin MFA reset/re-enrollment audit event support.
-- Run after 001, 002, 003. Idempotent.
--
-- This supersedes the emailed-magic-link design from
-- 003_admin_password_reset.sql. The admin_password_reset_tokens table from
-- that migration is left in place (unused) rather than dropped, so this
-- migration never destroys data — see README/SECURITY notes for details.
--
-- Design notes:
--   * Only a SHA-256 hash of the emailed verification code is stored, never
--     the raw code — identical pattern to admin_sessions.token_hash and
--     admin_recovery_codes.code_hash.
--   * admin_id is NULLABLE and a row is inserted for every reset *attempt*,
--     whether or not the submitted email matched a real admin account. This
--     is required for the account-enumeration protection in
--     /api/admin/forgot-password: the server must behave identically
--     (same timing, same cookie, same response) regardless of whether the
--     email matched, and that means the "flow" it silently starts must
--     exist either way. A flow with admin_id = null can never complete
--     (the recovery-code check below has nothing to check against), so it
--     just expires harmlessly.
--   * Each flow is single-use end to end (completed boolean) and
--     short-lived (expires_at), with independent attempt counters for the
--     email-code step and the recovery-code step so each stage can be
--     rate-limited without one stage's attempts affecting another's.
-- ============================================================================

create table if not exists admin_password_reset_flows (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references admin_users(id) on delete cascade, -- null if the email did not match any account
  email_code_hash text not null,       -- SHA-256 of the one-time numeric code emailed to the admin
  email_attempts integer not null default 0,
  email_verified boolean not null default false,
  recovery_attempts integer not null default 0,
  recovery_verified boolean not null default false,
  consumed_recovery_code_id uuid references admin_recovery_codes(id) on delete set null,
  completed boolean not null default false,
  expires_at timestamptz not null,     -- whole flow is short-lived (15 minutes)
  requested_ip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_pwreset_flow_admin on admin_password_reset_flows(admin_id);
create index if not exists idx_admin_pwreset_flow_expires on admin_password_reset_flows(expires_at);

alter table admin_password_reset_flows enable row level security;
-- No public policies: service-role key only (supabaseAdmin), same as every
-- other admin_* table in this schema.

-- ----------------------------------------------------------------------------
-- Housekeeping: a scheduled job or periodic manual call can prune expired,
-- already-inert flow rows. Not required for correctness (the app never
-- reads a completed/expired row as valid), but keeps the table small.
-- Safe to call any time; safe to ignore if you don't wire up a scheduler.
-- ----------------------------------------------------------------------------
create or replace function cleanup_expired_password_reset_flows()
returns void
language sql
as $$
  delete from admin_password_reset_flows
  where expires_at < now() - interval '24 hours';
$$;
