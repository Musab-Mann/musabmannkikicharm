-- ============================================================================
-- KKCHARM PRODUCTION MIGRATION — Phase 1 / 2 / 3
-- Run this once in the Supabase SQL editor for your project.
-- Every statement is idempotent (CREATE OR REPLACE / IF NOT EXISTS), so it is
-- safe to re-run. Nothing here touches products/orders/reviews data.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- PHASE 1: Atomic, race-condition-safe stock reservation.
-- Verified missing from the schema shipped with this project — checkout was
-- calling an RPC that did not exist. This version locks every affected
-- product row (in a stable order, to avoid deadlocks between two concurrent
-- checkouts), verifies ALL items have enough stock, and only then commits
-- ALL the decrements together. If any item fails, the whole call rolls back
-- via the exception handler below — no partial/inconsistent stock changes.
-- ----------------------------------------------------------------------------
create or replace function reserve_stock_for_order(items jsonb)
returns jsonb
language plpgsql
as $$
declare
  item jsonb;
  product_id text;
  qty integer;
  current_stock integer;
begin
  for item in
    select value from jsonb_array_elements(items) order by (value->>'productId')
  loop
    product_id := item->>'productId';
    qty := (item->>'quantity')::integer;

    select stock into current_stock
    from products
    where id = product_id
    for update;

    if current_stock is null or current_stock < qty then
      raise exception 'INSUFFICIENT_STOCK:%', product_id;
    end if;
  end loop;

  for item in select value from jsonb_array_elements(items)
  loop
    product_id := item->>'productId';
    qty := (item->>'quantity')::integer;

    update products
    set stock = stock - qty,
        updated_at = now()
    where id = product_id;
  end loop;

  return jsonb_build_object('ok', true);
exception
  when others then
    if SQLERRM like 'INSUFFICIENT_STOCK:%' then
      return jsonb_build_object('ok', false, 'problemProductId', split_part(SQLERRM, ':', 2));
    else
      raise;
    end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- PHASE 3: RLS gap fix. `customers` and `wishlist` had no RLS enabled at all
-- (verified in the audit). Enabling RLS with no public policy = deny-all to
-- the anon/authenticated roles; only the server-side service-role key (used
-- exclusively by API routes, never shipped to the browser) can read/write.
-- `product_views` gets the same treatment for consistency.
-- ----------------------------------------------------------------------------
alter table customers enable row level security;
alter table wishlist enable row level security;
alter table product_views enable row level security;
-- No policies added on purpose: default-deny for anon/authenticated roles.
-- Service role bypasses RLS entirely, which is how every existing API route
-- already reads/writes these tables — no application code changes needed.

-- ============================================================================
-- PHASE 2: Admin authentication, MFA, sessions, audit log, business settings
-- ============================================================================

create table if not exists admin_users (
  id uuid primary key default uuid_generate_v4(),
  username text not null unique,
  password_hash text not null,
  security_email text not null,
  mfa_secret_encrypted text,          -- set only during setup; app never re-reads it after enable
  mfa_enabled boolean not null default false,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists admin_recovery_codes (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  code_hash text not null,
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists admin_sessions (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references admin_users(id) on delete cascade,
  token_hash text not null unique,     -- SHA-256 of the raw session token; raw token never stored
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,     -- absolute expiry (8h)
  last_seen_at timestamptz not null default now(),
  ip text,
  user_agent text,
  revoked boolean not null default false
);
create index if not exists idx_admin_sessions_admin on admin_sessions(admin_id);

create table if not exists admin_audit_log (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references admin_users(id) on delete set null,
  event text not null,
  success boolean not null,
  ip text,
  user_agent text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_audit_created on admin_audit_log(created_at desc);

-- Phase 6 dependency, created now since we're already migrating the schema.
-- Simple key/value table so business settings changes need zero code deploys.
create table if not exists business_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references admin_users(id)
);

alter table admin_users enable row level security;
alter table admin_recovery_codes enable row level security;
alter table admin_sessions enable row level security;
alter table admin_audit_log enable row level security;
alter table business_settings enable row level security;
-- No public policies on any of the above: service-role key only, matching
-- every other admin-facing table in this project.
