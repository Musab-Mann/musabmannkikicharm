# Kikicharms — E-commerce Website

A complete Next.js storefront for handmade jewelry, charms, beads, keychains,
tools and craft kits — real cart, real checkout with server-side validation,
real stock control (no overselling), order tracking, and a security-hardened
admin dashboard (username + password + mandatory MFA) for managing products,
orders, payments, business settings, and a live Control Panel.

**Supabase is required** — there is no local-filesystem fallback for
production data (see `PRODUCTION_DEPLOYMENT.md` for full setup). The steps
below get it running for local development.

## 1. Run it locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase + admin secrets, see .env.example
# run supabase/schema.sql, then supabase/migrations/*.sql in order, in the
# Supabase SQL editor (see PRODUCTION_DEPLOYMENT.md section 2)
npm run setup:admin           # creates your first admin account
npm run dev
```

Open http://localhost:3000. See `PRODUCTION_DEPLOYMENT.md` for the full
first-run walkthrough (migrations, admin bootstrap, MFA setup).

## 2. What's real vs. what needs your credentials

**Real and working today, once Supabase is connected:**
- Product browsing, search, filters, sorting, wishlist (localStorage)
- Cart and checkout with full client + server-side validation
- Order creation with a genuinely unique Order ID, stored in Postgres via
  Supabase — not mocked, not filesystem-dependent
- Stock is decremented atomically (row-level locking) on order creation —
  concurrent checkouts on the same product can't oversell the last item
- Order tracking, order status timeline, admin status updates
- Full admin product CRUD (add/edit/delete, stock, pricing, flags)
- Mobile accordion navigation (only one collection open at a time)

**Needs your credentials before real customers use it:**
- **Email notifications** — currently logged to your terminal instead of sent.
  Set `EMAIL_API_KEY`, `ADMIN_EMAIL`, `BUSINESS_EMAIL` in `.env.local` (see
  `.env.example`). Get a key from https://resend.com. No code changes needed —
  `lib/email.ts` starts sending for real the moment the key is present.
- **Payment screenshot storage** — already uploads to Supabase Storage via
  `/api/admin/product-images` for product photos; if you want customers to
  upload payment screenshots at checkout too, wire that form field to the
  same storage bucket pattern.
- **Supabase** — required, not optional. See `PRODUCTION_DEPLOYMENT.md` for
  the full setup (schema + migrations + admin bootstrap).

## 3. Admin dashboard

Go to `/admin` (you'll be redirected to `/admin/login`).

Create your admin account (one-time, from the command line — never from a
public web form):
```
npm run setup:admin
```
Then log in with that username/password. You'll be required to scan a QR
code with an authenticator app and confirm a code before you can reach the
dashboard — **MFA is mandatory**, not optional, and there is no way to skip
it. Save the recovery codes shown once, immediately after.

From the dashboard: manage products, view/update orders (status + payment
verification), edit business/payment settings, review the security audit
log and Control Panel, and see revenue/stock stats.

### Handing the project to its real owner

Before handing this project over, rotate the admin account so the previous
developer's personal password, authenticator, and recovery codes stop
working:
```
npm run handover:admin
```
This asks for a new username/password/security email, and (if you choose)
resets MFA enrollment: it invalidates the old authenticator + all old
recovery codes + all sessions, shows a QR code directly in the terminal for
the new owner to scan, and prints a fresh set of recovery codes once. Only
hashes are ever stored — nothing sensitive from this script is written to
any file. The same reset can also be done from the dashboard at
`/admin/security` → "Reset / Re-enroll MFA", for an admin who is already
logged in and just needs to swap authenticator devices.

Forgot the password instead? `/admin/login` → "Forgot Password?" walks
through email verification code → recovery code → new password — MFA
itself is never bypassed by this flow.

## 4. Editing business details

Contact and payment details (WhatsApp, phone, business email, bank/Easypaisa
account, delivery charge) are database-backed and editable from
`/admin/settings` — changes apply to the live site immediately, no
deployment needed. Everything else business-specific (site name, shipping
label text, social links) still lives in `lib/config.ts`.

## 5. Editing products & categories

- Categories: `lib/data/categories.ts`
- Products: `lib/data/products.ts` (or use `/admin/products` once the site
  is running — admin edits are stored as overrides and take priority over
  the seed file, so you never lose your original data)

Adding a product requires editing exactly one array entry (or using the
admin "Add Product" button) — no navigation, card, or filter component needs
to change.

## 6. Adding real product photos

Drop files into `public/images/products/` using the filenames already
referenced in `lib/data/products.ts` (e.g. `kitty-charm.jpg`). Until a file
exists, the site shows generated placeholder artwork automatically — nothing
is broken in the meantime, and you don't need to touch any component when
you add real photos.

## 7. Deployment

See `PRODUCTION_DEPLOYMENT.md` for the full guide (env vars, migrations,
admin bootstrap, Vercel deploy, Cloudflare). Short version: standard Next.js
app, deploy to Vercel, Supabase is mandatory (not optional — there is no
local-filesystem fallback for production data).

## 8. Project structure

```
app/                    Pages & API routes (Next.js App Router)
  admin/                Protected admin dashboard (middleware + session guarded)
  admin/control-panel/  Real-time health/security monitoring
  admin/security/       Account, MFA, and session management
  admin/settings/       Database-backed business settings
  api/                  Order, product, review, admin, auth endpoints
  product/, collections/, cart/, checkout/, track-order/ ...
components/             Reusable UI (Navbar, ProductCard, MobileMenu, ...)
context/                Cart & Wishlist React context (client state)
lib/
  config.ts             Static site config (defaults; overridable via business_settings)
  types.ts              Shared TypeScript types
  data/                 Category & product seed data
  store/db.ts           Supabase-backed persistence layer (products/orders/reviews/stock)
  email.ts              Transactional email
  auth.ts                Thin re-export of the session-verification API
  admin/                 Auth system: crypto, TOTP, sessions, rate limiting, audit log,
                          business settings, DB access
supabase/schema.sql     Base database schema
supabase/migrations/    Auth, RLS, and index migrations — run in order
load-testing/           k6 script + load testing plan
```

## 9. Known limitations (by design, not oversights)

- Reviews and starting product data are clearly marked `isDemoData: true` /
  "Sample Review" in the UI — replace with real customer reviews as they
  come in.
- Guest checkout only (no customer accounts) — this matches the brief's
  requirement not to force registration. Wishlist uses localStorage per
  device until customer accounts are added.
- Single-admin-account model (multiple admins are supported by the schema,
  but there's no in-dashboard "invite another admin" UI yet — add rows to
  `admin_users` directly, or ask for that feature to be built).
- See `SECURITY_AUDIT_REPORT.md` and `TESTING_REPORT.md` for a full,
  honest account of what's been verified vs. what still needs a manual
  check against a live deployment.
