# SECURITY_AUDIT_REPORT.md

Audit and remediation performed on the KKCharm production codebase.
Everything below reflects what was actually read, changed, and verified by
running `tsc --noEmit`, `next lint`, and `next build` — not assumptions.
Items requiring a live Supabase project or a real browser are marked
**NOT VERIFIED (needs manual check)** with the exact step to do it.

## Findings and fixes

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `adminDeleteProduct` wrote to a local JSON file nothing ever read — admin product deletion silently did nothing | High (functional) | **Fixed** — real Supabase delete |
| 2 | `reserve_stock_for_order` RPC was called by checkout code but did not exist anywhere in the SQL shipped with the project | High (functional, blocks checkout) | **Fixed** — written with row-level locking (`FOR UPDATE`), atomic all-or-nothing. **NOT VERIFIED**: confirm it doesn't already exist under a different definition in your live DB before running the migration (it uses `CREATE OR REPLACE`, so re-running is safe either way) |
| 3 | Admin session HMAC secret defaulted to a hardcoded string (`"CHANGE_ME_DEV_ONLY..."`) if `ADMIN_PASSWORD` was unset — a known secret an attacker could forge session cookies with | **Critical** | **Fixed** — separate `ADMIN_SESSION_SECRET`, production refuses to start without it |
| 4 | Single shared admin password, no username, no MFA, no hashing | Critical (matches your original brief) | **Fixed** — DB-backed admin accounts, Argon2id hashing, mandatory TOTP MFA |
| 5 | Next.js 14.2.5 vulnerable to CVE-2025-29927 (middleware authorization bypass via `x-middleware-subrequest` header) | Critical | **Fixed** — upgraded to 14.2.35. Vercel-hosted deployments were also automatically protected at the platform level per Next.js's advisory, independent of this fix |
| 6 | `customers` and `wishlist` tables had RLS disabled entirely (PII reachable by the anon key, though nothing in this codebase currently exposes that key client-side) | Medium | **Fixed** — RLS enabled, no public policies (service-role only, matching every other table) |
| 7 | No rate limiting anywhere (login, MFA, checkout, reviews, tracking, contact form) | High | **Fixed** at the application layer (see limitation below); Cloudflare rate limiting documented as the authoritative layer in `CLOUDFLARE_PRODUCTION_SETUP.md` |
| 8 | No security headers (CSP, X-Frame-Options, HSTS, etc.) | Medium | **Fixed** in `next.config.js`. CSP retains `'unsafe-inline'` for `script-src`/`style-src` — see the comment in `next.config.js` for why (Next.js App Router's inline hydration payload), documented as a deliberate, known exception rather than silently shipping something untested. **NOT VERIFIED**: no real browser was available to confirm the CSP doesn't break any client-side behavior — test this manually before relying on it |
| 9 | `next/image` `remotePatterns` allowed any HTTPS host (`**`) | Low | **Fixed** — restricted to the one host actually used (`*.supabase.co`), verified by grep that no other image host appears anywhere in the codebase |
| 10 | Public debug endpoint `/api/test-supabase` returned raw Supabase error messages and a live product row to anyone, unauthenticated | Low | **Removed** — superseded by `/api/health`, which returns only `{status}` |
| 11 | `getAllOrders` fetched the entire orders table on every admin page load, with no pagination | Medium (scalability) | **Fixed** — real DB-level `.range()` pagination |
| 12 | No indexes on any table beyond primary keys — every product/order/review query was a sequential scan | Medium (scalability) | **Fixed** — see `supabase/migrations/002_indexes.sql`, each index tied to an actual query in the code |
| 13 | Business contact/payment details (WhatsApp, phone, bank, Easypaisa) were hardcoded in source, requiring a code deployment to change | Medium (operational) | **Fixed** — DB-backed via `business_settings`, editable at `/admin/settings`, read live by checkout and order pricing |
| 14 | Admin panel tables were table-only with horizontal scroll on mobile | Medium (usability) | **Fixed** for Dashboard, Products, Orders, and Payments — mobile card layout below `md`, full table at `md` and above. **NOT VERIFIED**: no real device/browser available to confirm at the exact breakpoints (320/375/414/768/1024px etc.) requested — see Testing Report |
| 15 | No admin audit trail | High | **Fixed** — `admin_audit_log`, covers every event listed in the original brief (logins, MFA, credential changes, session revocation) |
| 16 | Newer Next.js CVEs (RCE in image optimization under AVIF, SSRF in Server Actions, RCE on Windows-hosted servers) are only patched in Next 15/16, not backported to 14.x | Varies | **Not fixed** — deliberately not done. A major-version upgrade is a real, separate undertaking (breaking changes to `cookies()`/`headers()` becoming async, fetch caching defaults, etc.) that needs its own regression pass across the whole site, not something to bundle silently into a security patch. Flagged for your decision, not hidden |
| 17 | No CSRF token system; relies on `SameSite=Lax` cookies + no permissive CORS headers anywhere in the codebase | Low-Medium | **Not fixed as a separate token system** — `SameSite=Lax` blocks the common cross-site POST-form CSRF pattern, and no route sets `Access-Control-Allow-Origin`, so a cross-origin `fetch` with credentials is blocked by the browser regardless. A dedicated double-submit CSRF token would be defense-in-depth on top of this, not a fix for an currently-exploitable gap — noted as a good next iteration |

## Architecture summary (what's true after this work)

- **Auth**: username + Argon2id-hashed password (WASM via `hash-wasm`, not
  a native binary — won't fail to install on Vercel) + mandatory TOTP MFA.
  Recovery codes, single-use, SHA-256 hashed. Account lockout after 3 failed
  attempts, capped exponential backoff (max 15 min) — cannot be weaponized
  to lock the real owner out permanently.
- **Sessions**: two-layer. Fast Edge-Runtime signature+expiry check in
  `middleware.ts` (no DB call), and an authoritative DB-backed check
  (`verifyAdminSession()`) in every admin API route/page that also enforces
  revocation and a 45-minute idle timeout on top of the 8-hour absolute
  expiry. Two layers deliberately, not one — see the comment in
  `middleware.ts` referencing CVE-2025-29927 for why relying on middleware
  alone is a known bug class.
- **MFA secrets**: encrypted at rest with AES-256-GCM, using a key
  (`ADMIN_MFA_ENCRYPTION_KEY`) separate from the session-signing secret —
  a leak of one does not compromise the other.
- **Database**: Supabase/Postgres is the sole source of truth for products,
  orders, reviews, stock, admin accounts, sessions, MFA, audit log, and
  business settings. No local-filesystem fallback exists anywhere in the
  codebase (verified by removing the dead local-JSON layer entirely, not
  just leaving it unused).
- **Secrets**: `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SESSION_SECRET`,
  `ADMIN_MFA_ENCRYPTION_KEY` are read only in server-side modules (`lib/`
  files with no `"use client"`, or Node scripts) — verified by grep, none
  appear in any file bundled to the browser, and no `NEXT_PUBLIC_*`
  variable carries a secret.

## Known limitation: in-memory rate limiting

`lib/admin/rate-limit.ts` is per-serverless-instance memory, not a shared
store like Redis. On Vercel, each warm function instance has its own
counters — a distributed attacker hitting many cold-started instances could
exceed the intended global limit. This is documented in the file itself and
in `CLOUDFLARE_PRODUCTION_SETUP.md`, where Cloudflare Rate Limiting Rules
are specified as the actual globally-consistent layer. The one exception is
admin account lockout (`recordFailedLogin`/`locked_until` in `admin_users`),
which lives in Postgres and IS globally consistent regardless of which
serverless instance handles the request.

## What was NOT reviewed (out of scope for what's been done so far)

- Third-party npm dependency audit beyond Next.js itself — `npm audit`
  was run (see Testing Report) but individual packages were not each
  manually reviewed for whether their flagged CVEs are actually reachable
  from this app's usage
- Penetration testing / actual exploit attempts against a live deployment
  — this was a code-level audit, not a live security assessment
