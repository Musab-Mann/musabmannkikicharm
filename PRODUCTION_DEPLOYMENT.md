# PRODUCTION_DEPLOYMENT.md

## 1. Environment variables

Copy `.env.example` to `.env.local` (local dev) and set the same values in
Vercel → Project Settings → Environment Variables (production).

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From Supabase Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Same page. **Never** prefix with `NEXT_PUBLIC_` |
| `ADMIN_SESSION_SECRET` | Yes | `openssl rand -hex 32`. App refuses to start admin auth in production without it |
| `ADMIN_MFA_ENCRYPTION_KEY` | Yes | `openssl rand -hex 32`. Different value from the above |
| `EMAIL_API_KEY` | Recommended | Resend (or swap provider in `lib/email.ts`). Without it, emails log to console instead of sending — not fake, just not delivered |
| `ADMIN_EMAIL` | Recommended | Where new-order notifications go |
| `BUSINESS_EMAIL` | Recommended | "From" address for outgoing email |

`ADMIN_PASSWORD` (the old single shared password) is **no longer read
anywhere in the codebase** — remove it from your environment variables,
it's dead configuration now.

## 2. Database setup (run once, in order, in the Supabase SQL editor)

1. `supabase/schema.sql` (if not already applied to this project)
2. `supabase/migrations/001_phase1_phase2_phase3.sql`
3. `supabase/migrations/002_indexes.sql`

All three are idempotent — safe to re-run if you're unsure whether a step
already happened.

## 3. Create the first admin account

Locally, with `.env.local` fully populated:

```
npm install
npm run setup:admin
```

Follow the prompts (username, security email, password ≥12 characters).
This script refuses to run if an admin already exists, and refuses to run
if the required secrets aren't set — it will tell you exactly what's
missing rather than proceeding insecurely.

## 4. First login

Visit `/admin/login`, sign in with the account just created. You'll be
required to scan a QR code with an authenticator app (Google Authenticator,
Authy, 1Password, etc.) and confirm a code before the dashboard is
reachable — this is mandatory, not skippable. Save the 10 recovery codes
shown immediately after — they're shown exactly once.

## 5. Configure business settings

`/admin/settings` — WhatsApp, phone, business email, bank transfer details,
Easypaisa details, delivery charge, free-delivery threshold. These take
effect immediately on the live site (checkout page, delivery pricing) with
no deployment needed.

## 6. Deploy to Vercel

Standard Next.js deployment — connect the repo, set the environment
variables from step 1, deploy. The `npm run build` step Vercel runs is the
same one verified in TESTING_REPORT.md.

## 7. Put it behind Cloudflare

See `CLOUDFLARE_PRODUCTION_SETUP.md` for the full walkthrough (DNS, SSL,
WAF, rate limiting, cache rules that never cache `/admin/*`).

## 8. Verify production storage end-to-end

1. Log in, go to `/admin/products`, upload a new product image
2. Confirm it appears in the admin list
3. Open the public product page, confirm the image loads there too
4. Trigger a redeploy (push any commit, or Vercel → Redeploy)
5. Confirm the image still loads after redeploy — this confirms it's
   actually in Supabase Storage, not the ephemeral Vercel filesystem

## 9. Recurring maintenance

- **Dependency updates**: `npm audit` periodically; see
  SECURITY_AUDIT_REPORT.md finding #16 for the Next.js 15/16 decision this
  project is deliberately deferring
- **Recovery codes**: regenerate from `/admin/security` if you're running
  low (shows remaining count) — old codes are invalidated the moment new
  ones are generated
- **Sessions**: `/admin/security` → "Log out all other sessions" if you
  ever suspect a device/browser you no longer control still has a valid
  session
- **Audit log**: reviewable at `/admin/control-panel` — recent failed
  logins, MFA failures, and rate-limit events are the first place to look
  if something seems off

## 10. What this deployment guide does NOT cover

- Setting up Resend/SendGrid itself (their own docs)
- Domain registration/DNS management outside of the Cloudflare-specific
  steps in `CLOUDFLARE_PRODUCTION_SETUP.md`
- Load testing execution — see `load-testing/LOAD_TESTING_PLAN.md` for why
  that's a separate manual step requiring its own infrastructure
