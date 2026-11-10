# Pot Stories — backend setup & operating modes

The storefront, accounts, checkout and admin work **today, locally, without any
external service**. Real services switch on automatically when their
credentials are added.

| Capability | Without credentials (now) | With credentials |
|---|---|---|
| Data store | **Local demo database** — `.data/demo-db.json` (gitignored), seeded from `lib/products.ts` on first write | **Supabase Postgres** with RLS (`supabase/migrations`) |
| Auth | Local accounts (scrypt-hashed passwords, HMAC-signed `httpOnly` cookie) | **Supabase Auth** (email + password, password reset email, session refresh in `proxy.ts`) |
| Password reset | Reset link shown on screen (no email service), labelled demo | Email from Supabase → `/auth/callback` → `/account/reset-password` |
| Image uploads (admin) | Saved to `.data/uploads`, served by `/api/demo-uploads/*` | Supabase Storage bucket `product-images` |
| Payments | **Demo checkout** — order recorded with `payment_status = demo_not_charged`; never counted as revenue | **Razorpay test mode** — server order creation, signature + API verification, webhook |
| Newsletter | Stored in the local demo database | Stored in `newsletter_subscribers` |

The active modes are chosen in `lib/server/env.ts`:

- Supabase is used when `NEXT_PUBLIC_SUPABASE_URL` **and** `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
- Razorpay is used when `RAZORPAY_KEY_ID` **and** `RAZORPAY_KEY_SECRET` are set **and** the key is a
  test key (`rzp_test_…`). Live keys are refused unless `RAZORPAY_ALLOW_LIVE=true`.

## Local development (demo mode)

```bash
cp .env.example .env.local     # fill SESSION_SECRET, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD
npm install
npm run dev                    # http://localhost:3000
```

- Sign in at `/account/login` with `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` to reach `/admin`.
- Reset all demo data by stopping the server and deleting `.data/` (it is re-seeded on next write).
- Demo discount code: `DEMO10` (10% off — sample promotion).

## Online preview on Vercel (no Supabase yet)

The local JSON database cannot persist on Vercel (read-only, per-instance filesystem), so when
`VERCEL=1` and Supabase is not configured the site runs as a **browse-only preview**:

- Works: homepage, shop, product pages, search, filters, journal, bag and wishlist (stored in the browser).
- Switched off with a visible notice: sign-in/registration, checkout, newsletter sign-up and admin.
  Nothing is written to disk and no orders or payments are taken.
- Pages are marked `noindex`.
- No environment variables are required. Do **not** add `DEMO_ADMIN_*` or `SESSION_SECRET` to Vercel.

Force the same mode locally with `DEMO_READ_ONLY=true`.

## Switching to Supabase

1. Create a Supabase project. Apply `supabase/migrations/*.sql` in filename order
   (`supabase db push`, or paste into the SQL editor), then run `supabase/seed.sql`.
   Regenerate the seed after editing `lib/products.ts`:
   `node scripts/generate-supabase-seed.mjs supabase/seed.sql`.
2. Auth settings → Site URL = your site URL; add redirect URL `<site>/auth/callback`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and (server-only)
   `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` / the hosting provider.
4. Make an admin: `update public.profiles set role = 'admin' where email = 'you@example.com';`
5. Restart the server. The demo database is no longer used.

### Auth settings (Supabase dashboard → Authentication)

- **URL Configuration** → Site URL = production URL (e.g. `https://<your-domain>`).
  Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3100/auth/callback`,
  `https://<your-domain>/auth/callback` (and `https://*-<team>.vercel.app/auth/callback` for previews if wanted).
- **Sign In / Providers → Email**: keep *Confirm email* on for production.
- **Emails → SMTP**: the built-in sender only delivers to project team members and is heavily
  rate-limited. Configure a custom SMTP provider before real customers sign up.
- **Emails → Templates** (recommended, works across devices): use the `token_hash` link, e.g.
  Confirm signup: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/account`
  Reset password: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/account/reset-password`

### Vercel (backend mode)

Add in Vercel → Project → Settings → Environment Variables (Production and, if wanted, Preview):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (mark Sensitive),
`NEXT_PUBLIC_SITE_URL` (the production URL). Do **not** add `SESSION_SECRET`, `DEMO_*` or `RAZORPAY_*`.
Once the Supabase values are set the browse-only preview switches off automatically on the next deploy.

## Tests

```bash
npm run typecheck && npm run lint && npm run build
npx playwright install chromium        # once
npm run start -- -p 3100 &             # or let Playwright start `next dev`
E2E_BASE_URL=http://localhost:3100 npm run test:e2e
```

The e2e suite (`e2e/`) uses the service-role key from `.env.local` to create throw-away confirmed
users (one promoted to admin), exercises auth, customer, checkout (demo), admin product management
and RLS, then deletes its users, orders, products and uploads and restores stock. Run it only against
a project whose data you are happy for tests to touch.

See `supabase/README.md` for details and `docs/backend/data-model.md` for the schema and RLS rules.

## Switching on Razorpay (test mode)

1. In the Razorpay dashboard (Test Mode) create API keys → set `RAZORPAY_KEY_ID` (`rzp_test_…`)
   and `RAZORPAY_KEY_SECRET`.
2. Add a webhook to `<site>/api/webhooks/razorpay` for `payment.captured`, `order.paid` and
   `payment.failed`; set the same secret in `RAZORPAY_WEBHOOK_SECRET`.
3. Restart. Checkout now opens Razorpay Checkout. An order is marked **paid only after**
   (a) the checkout signature is verified with the key secret **and** (b) the payment is fetched from
   the Razorpay API and its order id, amount and status match. Finalisation is idempotent, so a
   webhook and the browser callback can both arrive safely.
4. Going live requires business approval, live keys and `RAZORPAY_ALLOW_LIVE=true`.

## Security model (summary)

- All prices, discounts, delivery fees and stock are recomputed on the server (`lib/server/pricing.ts`);
  the browser only sends product slugs, variant codes, planter ids and quantities.
- Every Server Action re-checks authentication/authorisation (`lib/server/auth.ts`). Admin pages and
  actions verify `role = 'admin'` on the server; nothing relies on hidden buttons.
- `SUPABASE_SERVICE_ROLE_KEY` and `RAZORPAY_KEY_SECRET` are only read in `server-only` modules.
- Orders, payments and inventory have no customer write policies in Supabase; they are written by
  the server after verification (`finalize_order` runs as `service_role`).
- Duplicate orders are prevented with a per-checkout idempotency key; payment finalisation is idempotent.
