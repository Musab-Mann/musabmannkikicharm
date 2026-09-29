# CLOUDFLARE_PRODUCTION_SETUP.md

How to put KKCharm behind Cloudflare as the DDoS/WAF/CDN layer in front of
Vercel. This is documentation for you (or whoever manages DNS) to execute —
none of these steps can be done from inside this codebase.

```
Visitor → Cloudflare (DDoS, WAF, bot mgmt, rate limiting, CDN) → Vercel → KKCharm → Supabase
```

## 1. Add the domain to Cloudflare

1. Cloudflare dashboard → **Add a site** → enter your domain.
2. Choose a plan (Free is sufficient to start; Pro adds more WAF rules and
   image optimization).
3. Cloudflare scans existing DNS records — review them.

## 2. DNS

- Point your domain's `A`/`CNAME` records at Vercel per
  [Vercel's Cloudflare guide](https://vercel.com/docs/concepts/projects/domains/deploying-and-redirecting#cloudflare):
  typically a `CNAME` for `www` → `cname.vercel-dns.com`, and an `A` record
  (or `CNAME` flattening, which Cloudflare supports) for the apex domain.
- Set every KKCharm-related record's proxy status to **Proxied** (orange
  cloud), not "DNS only" — DNS-only bypasses all of Cloudflare's protection.
- At your domain registrar, change nameservers to the two Cloudflare
  nameservers shown in the dashboard. Propagation can take up to 24h.

## 3. SSL/TLS

- SSL/TLS → Overview → set encryption mode to **Full (strict)**. This
  requires Vercel's own TLS certificate to be valid (it is, by default) —
  "Full (strict)" verifies it, unlike "Full" which accepts any cert
  (including self-signed), which is not appropriate for production.
- SSL/TLS → Edge Certificates:
  - Enable **Always Use HTTPS**
  - Enable **Automatic HTTPS Rewrites**
  - Minimum TLS version: **1.2**
  - HSTS: enable, matching the `Strict-Transport-Security` header this app
    already sends (`next.config.js`) — Cloudflare's HSTS setting and the
    app's own header should agree, not conflict.

## 4. WAF

- Security → WAF → enable the **Cloudflare Managed Ruleset** (free tier
  includes a reduced set; Pro includes the full set).
- Add a custom rule blocking direct access to Next.js internals that should
  never be requested by a browser:
  `(http.request.uri.path contains "/_next/") and not (http.user_agent contains "Mozilla")`
  is a starting point — tune based on real traffic, don't ship a rule that
  blocks legitimate prefetches without checking Cloudflare's request logs
  first.
- Security → Bots: enable **Bot Fight Mode** (free) or **Super Bot Fight
  Mode** (Pro) to challenge automated traffic before it reaches Vercel.

## 5. Rate limiting (Cloudflare-side — the authoritative layer)

The application already rate-limits login, MFA, order creation, reviews,
and the contact form at the code level (`lib/admin/rate-limit.ts`), but
that limiter is **per serverless instance**, not globally consistent (see
`load-testing/LOAD_TESTING_PLAN.md`). Cloudflare Rate Limiting Rules are the
layer that actually holds globally. Suggested starting rules (Security →
WAF → Rate limiting rules):

| Path | Threshold | Action |
|---|---|---|
| `/api/admin/login` | 10 requests / 5 min per IP | Block for 10 min |
| `/api/admin/mfa/*` | 15 requests / 5 min per IP | Block for 10 min |
| `/api/orders` (POST) | 10 requests / 10 min per IP | Block for 15 min |
| `/api/products/*/reviews` (POST) | 5 requests / 10 min per IP | Block for 15 min |
| `/api/*` (general) | 300 requests / 1 min per IP | Challenge |

## 6. Caching — never cache admin or private responses

Caching rules (Rules → Cache Rules), or Page Rules on older plans:

- **Bypass cache entirely** for:
  - `/admin/*`
  - `/api/admin/*`
  - `/api/orders*`
  - `/api/business-settings` (PATCH is a write; even the public GET
    reflects live admin-edited values, so a stale cached copy could show
    wrong payment details at checkout — bypass rather than cache)
  - Any path with a `kkcharm_admin_session` or `kkcharm_admin_mfa_pending`
    cookie present, as a safety net beyond the explicit path rules above
- **Cache aggressively** (these are genuinely public, non-personalized):
  - `/`, `/collections/*`, `/product/*`, `/about`, `/contact`,
    `/policies/*` — HTML, but note these do embed live stock/price data
    fetched server-side on each request; a short edge TTL (e.g. 60s) is
    safer than a long one so a price/stock change from the admin panel
    shows up quickly
  - `/_next/static/*` — immutable build assets, cache for a year
    (Vercel already sets far-future cache headers on these; Cloudflare
    should respect and not override them)
  - `GET /api/products`, `GET /api/products/[id]` — short TTL (30-60s) is
    reasonable; these change only when an admin edits a product

This app already sends `Cache-Control: no-store` on every `/admin/*` and
`/api/admin/*` response (see `next.config.js`) as a second layer, so even a
Cloudflare cache-rule misconfiguration would not by itself cause an admin
page to be cached.

## 7. Origin protection

Vercel's edge network already provides the actual origin IPs are not
static/discoverable the way a traditional server's would be, so classic
"origin IP" attacks are less of a concern than on self-hosted
infrastructure. Still:

- Do not expose any Vercel `*.vercel.app` preview URL publicly once the
  Cloudflare-fronted custom domain is live — preview URLs bypass Cloudflare
  entirely.
- Consider Vercel's **Deployment Protection** (password or Vercel
  Authentication) on preview/staging deployments specifically, so they
  aren't indexed or discovered.

## 8. Optional: Cloudflare Access for the admin panel

For an extra layer beyond the app's own MFA (defense in depth, not a
replacement for it): Zero Trust → Access → Applications → add
`yourdomain.com/admin/*` and `yourdomain.com/admin/control-panel/*`,
requiring a Cloudflare Access login (e.g. email OTP or an identity
provider) before Cloudflare even forwards the request to Vercel. This means
an attacker who somehow obtained a valid admin session cookie still
couldn't reach `/admin` without also passing Access.

This is optional because it adds an operational dependency (you must keep
Access allow-lists current), but it's the single highest-value addition if
you want protection beyond what's already in the application layer.

## Verifying it's actually working

After DNS has propagated:

```bash
dig yourdomain.com   # should resolve to Cloudflare IPs, not Vercel's
curl -I https://yourdomain.com/admin   # should show cf-ray header
curl -I https://yourdomain.com/api/admin/control-panel/status   # 401 (no session) — confirms Cache-Control: no-store is present, not a cached 200
```

None of this can be verified from inside this codebase — it requires a
live domain pointed at Cloudflare, which is a manual step for you to
complete and confirm.
