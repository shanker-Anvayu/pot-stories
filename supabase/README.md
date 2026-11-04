# Supabase setup — Pot Stories

The schema follows `docs/backend/data-model.md`. When the Supabase env vars
are missing, the app falls back to the local demo backend automatically.

## 1. Create a project

Create a project at <https://supabase.com/dashboard> and note the Project URL,
the `anon` key and the `service_role` key (Project Settings → API).

## 2. Run the migrations (in order)

```
supabase/migrations/20261103000001_schema.sql     tables, indexes, triggers
supabase/migrations/20261103000002_rls.sql        is_admin(), RLS policies, grants
supabase/migrations/20261103000003_functions.sql  finalize_order()
supabase/migrations/20261103000004_storage.sql    product-images bucket + policies
```

With the CLI:

```bash
supabase init   # only if supabase/config.toml does not exist yet (keep the existing files)
supabase link --project-ref <project-ref>
supabase db push
```

Or paste each file into the dashboard **SQL Editor** and run them one at a time, in the order above.

## 3. Seed the demo catalogue

Run `supabase/seed.sql` in the SQL Editor, or with the CLI:
`psql "$DATABASE_URL" -f supabase/seed.sql`. (`supabase db reset` runs it
automatically on a local stack.)

The seed is idempotent. It loads 7 categories, 3 planters, 25 products (34
variants) and the demo code `DEMO10`. Running it again refreshes catalogue
content but leaves stock levels and discount redemptions alone. Product,
variant and image ids are deterministic UUID v5 values (the scheme is in
the header of `seed.sql`).

## 4. Make a user an admin

Sign up through the app first, so the `profiles` row exists. Then run this
in the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Customers cannot change `role` themselves. A trigger blocks it for
API requests that don't come from an admin.

## 5. Environment variables

Put these in `.env.local`, and in your host's environment for production:

| Variable | Exposure |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public (RLS protects the data) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only**. Never prefix it with `NEXT_PUBLIC_` and never send it to the browser. It bypasses RLS and is the only key that can write orders, payments and inventory or call `finalize_order` |

## 6. Auth settings

Under Authentication → URL Configuration:

- **Site URL**: your deployed origin, for example `https://potstories.in`. Use `http://localhost:3000` for local development.
- **Redirect URLs**: add `<origin>/auth/callback` for every origin you use, including localhost. Email confirmation and password-reset links come back through this route.

If you want sign-ups confirmed, keep email confirmation turned on (Authentication → Providers → Email).

## 7. Storage

The storage migration creates the public bucket `product-images` with a 5 MB
limit and jpeg/png/webp/avif only. Anyone can read from it. Only admins can
upload, replace or delete. Record uploaded files in
`product_images.storage_path` and put the public URL in
`product_images.url`. The seeded products use Unsplash URLs, so their
`storage_path` is null.

## Security summary

- RLS is enabled on every table. The catalogue is publicly readable, limited
  to active rows. Carts, wishlists and addresses can only be reached by their
  owner. Customers can read their own orders and payments, but cannot create
  or change them.
- Orders, payments, inventory and newsletter rows are written only by the
  server with the service role.
- `public.finalize_order(order_id, payment)` is executable by `service_role`
  only. It locks the order and its inventory rows, is idempotent, and returns
  `finalized`, `already_finalized` or `insufficient_stock`.
