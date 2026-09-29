# KKCharm — Load Testing Plan

## What this is, and isn't

This document describes how to verify KKCharm's capacity **before** claiming
it can handle high traffic — it is a plan and a script
(`load-testing/staged-load-test.js`), not a completed test run. Nobody has
executed this against a real deployment yet; that requires a staging
environment and a k6 (or equivalent) runner, neither of which exist in the
environment this codebase was audited in. Running it and recording the
actual numbers is a manual step for you (or your deployment engineer) to
do — see "How to run it" below.

**Never run this against production.** Point `BASE_URL` at a staging
deployment on its own Supabase project (or at minimum, a project you don't
mind filling with test rows).

## Terminology (kept distinct throughout — the brief specifically
warned against conflating these)

- **Virtual users (VUs)**: simulated concurrent browsers. This is what the
  1,000 → 100,000 staged targets refer to.
- **Requests/sec**: the actual throughput the server handles — usually much
  higher than the VU count, since each VU fires multiple requests with think
  time in between.
- **Concurrent connections**: simultaneous open TCP/TLS connections — mostly
  a CDN/edge concern (Cloudflare), not something this app-layer test
  measures directly.
- **Active sessions**: for KKCharm specifically, "session" usually means a
  browsing visitor (no login), not an authenticated session — only the
  admin has real sessions, and the admin is a single user, not part of this
  test.

100,000 requests sent slowly over an hour proves nothing about capacity;
100,000 *concurrent virtual users* sustained for several minutes, with
latency and error rate staying within threshold, is the actual target.

## Stages

| Stage | VUs | Ramp | Hold |
|---|---|---|---|
| 1 | 1,000 | 2 min | 3 min |
| 2 | 5,000 | 2 min | 3 min |
| 3 | 10,000 | 2 min | 3 min |
| 4 | 25,000 | 2 min | 3 min |
| 5 | 50,000 | 2 min | 3 min |
| 6 | 100,000 | 2 min | 3 min |

Each stage must be evaluated before moving to the next — if p95 latency or
error rate breaches threshold at 10,000 VUs, stop there and fix the
bottleneck rather than continuing to 25,000 "to see what happens" against
a system already in a degraded state (the results become meaningless once
the origin or its database is saturated).

## What's measured

- p50 / p95 / p99 latency (k6 reports this automatically per the
  `http_req_duration` metric)
- Requests/sec (`http_reqs` metric)
- Error rate (custom `errors` metric — non-200 responses)
- Database load: watch Supabase's dashboard (Database → Reports) during the
  run for connection count, query latency, and CPU — this codebase cannot
  self-report that from inside the k6 script
- Cache hit ratio: if Cloudflare caching is configured per
  `CLOUDFLARE_PRODUCTION_SETUP.md`, check the Cloudflare Analytics dashboard
  for cache hit % on static/product routes during the run

## What generating real 100,000-VU load actually requires

k6 running from a single machine cannot itself generate 100,000 concurrent
virtual users credibly — that needs either k6 Cloud (SaaS, paid, distributes
load across regions) or a self-hosted distributed k6 setup across several
load-generator machines. This is infrastructure you'll need to provision
separately; the script here is the same regardless of where it's run from.

## Known bottlenecks already addressed in this codebase (verified in code)

- `getAllOrders` now uses real DB-level pagination (`.range()`) instead of
  fetching the entire table (see `lib/store/db.ts`)
- Indexes added for every WHERE/JOIN/ORDER BY the app actually issues (see
  `supabase/migrations/002_indexes.sql`)
- `reserve_stock_for_order` locks rows with `FOR UPDATE` in a stable order,
  so concurrent checkouts on the same product serialize correctly instead
  of racing or deadlocking
- Public API rate limiting on order creation, review submission,
  order tracking, and the contact form

## Known bottlenecks NOT yet addressed (be honest about these before a real
high-traffic event)

- No caching layer in front of `/api/products` or product pages beyond
  whatever Cloudflare/Vercel's default CDN caching provides — see
  `CLOUDFLARE_PRODUCTION_SETUP.md` for cache-rule recommendations
- The in-memory rate limiter (`lib/admin/rate-limit.ts`) is per-serverless-
  instance, not globally consistent — under genuinely high, distributed
  traffic, Cloudflare's rate limiting is the layer that actually holds;
  document this limitation to whoever operates Cloudflare
- Supabase's connection pooling behavior under thousands of concurrent
  serverless function invocations has not been verified — Supabase
  recommends using their connection pooler (PgBouncer, usually the default
  "Transaction" pooling mode) for serverless deployments; confirm this is
  enabled in Project Settings → Database before a high-traffic event
