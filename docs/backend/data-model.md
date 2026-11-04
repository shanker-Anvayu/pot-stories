# Pot Stories — data model (source of truth)

All money values are **integer rupees (INR)** in the database and app code.
Razorpay amounts are converted to paise (`× 100`) only at the payment boundary.

Both backends implement this model:

- **Supabase** (`supabase/migrations/*.sql`) — production target, enabled when
  `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
- **Local demo backend** (`lib/server/backend/demo.ts`) — a JSON file in `.data/`
  used automatically when Supabase is not configured. Same shapes, same rules.

## Tables

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id uuid pk → auth.users.id`, `email text`, `full_name text`, `phone text`, `role text check in ('customer','admin') default 'customer'`, `created_at`, `updated_at` | Row created by trigger on `auth.users` insert. Customers cannot change `role`. |
| `categories` | `id text pk` (slug, e.g. `indoor`), `name`, `short_name`, `description`, `image_url`, `image_alt`, `position int`, `created_at` | |
| `products` | `id uuid pk`, `slug text unique`, `name`, `botanical`, `tags text[]`, `light text check in ('low','medium','bright')`, `care text check in ('easy','moderate','expert')`, `size text check in ('small','medium','large')`, `height`, `water`, `pet_friendly bool`, `allows_planter bool`, `short_description`, `description`, `care_notes text[]`, `is_active bool default true`, `position int`, `created_at`, `updated_at` | |
| `product_categories` | `product_id uuid → products on delete cascade`, `category_id text → categories on delete cascade`, pk(product_id, category_id) | many-to-many |
| `product_images` | `id uuid pk`, `product_id → products cascade`, `url text`, `alt text`, `storage_path text null`, `position int` | position 0 = primary image |
| `product_variants` | `id uuid pk`, `product_id → products cascade`, `code text` (e.g. `medium`, `standard`), `sku text unique`, `label`, `detail`, `price int check > 0`, `compare_at_price int null check > price`, `position int`, `is_default bool`, `is_active bool` | unique(product_id, code). Plant sizes are variants. Products without sizes have one `standard` variant. |
| `inventory` | `variant_id uuid pk → product_variants cascade`, `quantity int check >= 0`, `low_stock_threshold int default 5`, `updated_at` | |
| `planters` | `id text pk` (`grower`,`terracotta`,`ceramic`), `label`, `note`, `price int check >= 0`, `swatch text`, `position`, `is_active` | Add-on chosen per line when `products.allows_planter`. |
| `discount_codes` | `code text pk` (upper-case), `kind text check in ('percent','fixed')`, `value int`, `min_subtotal int default 0`, `max_redemptions int null`, `redemptions int default 0`, `starts_at`, `ends_at`, `is_active`, `description` | Architecture for promotions. Seeded demo code `DEMO10` is labelled demo. |
| `addresses` | `id uuid pk`, `user_id → auth.users cascade`, `label`, `full_name`, `phone`, `line1`, `line2`, `city`, `state`, `postal_code text check ~ '^[1-9][0-9]{5}$'`, `country text default 'IN'`, `is_default bool`, `created_at` | |
| `carts` | `id uuid pk`, `user_id uuid unique → auth.users cascade`, `updated_at` | one cart per signed-in user (guests use browser storage) |
| `cart_items` | `id uuid pk`, `cart_id → carts cascade`, `variant_id → product_variants cascade`, `planter_id text → planters null`, `quantity int check 1..20`, unique(cart_id, variant_id, planter_id) (nulls not distinct) | |
| `wishlists` | `id uuid pk`, `user_id uuid unique → auth.users cascade`, `created_at` | |
| `wishlist_items` | `wishlist_id → wishlists cascade`, `product_id → products cascade`, `created_at`, pk(wishlist_id, product_id) | |
| `orders` | `id uuid pk`, `order_number text unique` (`PS-YYMMDD-XXXXXX`), `user_id → auth.users set null`, `email`, `phone`, `full_name`, `shipping_address jsonb`, `status text`, `payment_status text`, `payment_method text check in ('razorpay','demo')`, `subtotal int`, `discount int`, `delivery_fee int`, `total int check >= 0`, `currency text default 'INR'`, `discount_code text null`, `idempotency_key text unique`, `notes text`, `created_at`, `updated_at` | see status values below |
| `order_items` | `id uuid pk`, `order_id → orders cascade`, `product_id → products set null`, `variant_id → product_variants set null`, `planter_id text null`, `product_slug`, `product_name`, `variant_label`, `planter_label`, `image_url`, `unit_price int`, `quantity int check > 0`, `line_total int` | snapshot at purchase time |
| `payments` | `id uuid pk`, `order_id → orders cascade`, `provider text check in ('razorpay','demo')`, `provider_order_id text unique null`, `provider_payment_id text unique null`, `amount int`, `currency`, `status text check in ('created','authorized','captured','failed','refunded','demo_not_charged')`, `error_code`, `error_description`, `raw jsonb`, `created_at`, `updated_at` | |
| `newsletter_subscribers` | `id uuid pk`, `email text unique` (lower-cased, format-checked), `status text check in ('subscribed','unsubscribed') default 'subscribed'`, `source text`, `created_at` | |

### Order status values

`orders.status`: `pending_payment` → `processing` → `shipped` → `delivered`; or `cancelled`.
`orders.payment_status`: `pending`, `paid` (verified Razorpay payment only), `failed`, `refunded`, `demo_not_charged` (demo checkout — **never counted as revenue**).

Inventory is decremented only when an order is finalised: a verified Razorpay
payment, or a demo-mode order confirmation. Finalisation is idempotent.

## Security (Supabase RLS)

- Helper `public.is_admin()` — `security definer`, checks `profiles.role = 'admin'` for `auth.uid()`.
- Public (anon + authenticated) **select**: `categories`, active `products`, `product_categories`, `product_images`, active `product_variants`, `inventory`, active `planters`.
- Admin full access to catalogue tables, `orders`, `order_items`, `payments`, `discount_codes`, `newsletter_subscribers`, and select on `profiles`.
- Owner-only (`user_id = auth.uid()`): `addresses` (all ops), `carts` / `cart_items` / `wishlists` / `wishlist_items` (all ops via ownership join), `orders` / `order_items` / `payments` (**select only**).
- Order, payment and inventory writes happen **only on the server** with the service-role key, after the server has re-priced the cart. Customers have no insert/update policy on these tables.
- `newsletter_subscribers`: no public policies; inserts go through a server action using the service role.
- Function `public.finalize_order(order_id uuid, payment jsonb)` — `security definer`, executable by `service_role` only; atomically checks/decrements inventory, marks the order paid/processing and records the payment; returns early if already finalised.
- Storage bucket `product-images`: public read; insert/update/delete for admins only.
