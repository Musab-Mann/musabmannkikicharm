-- ============================================================================
-- KKCHARM — Admin forgot-password support (Phase 8)
-- Run after 001_phase1_phase2_phase3.sql and 002_indexes.sql. Idempotent.
--
-- Stores only a SHA-256 hash of the one-time reset token, never the raw
-- token — identical pattern to admin_sessions.token_hash. The raw token is
-- emailed to the admin's security_email and is never persisted anywhere.
-- ============================================================================

create table if not exists admin_password_reset_tokens (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  token_hash text not null unique,     -- SHA-256 of the raw reset token
  expires_at timestamptz not null,     -- short-lived (30 min)
  used boolean not null default false,
  used_at timestamptz,
  requested_ip text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_pwreset_admin on admin_password_reset_tokens(admin_id);
create index if not exists idx_admin_pwreset_expires on admin_password_reset_tokens(expires_at);

alter table admin_password_reset_tokens enable row level security;

-- No public policies: this table is only ever touched via the service-role
-- Supabase client on the server (supabaseAdmin), same as every other
-- admin_* table in this schema — RLS is enabled defensively, not because
-- any anon/authenticated-role policy is expected to exist.
