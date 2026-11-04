-- Pot Stories — core schema
-- Source of truth: docs/backend/data-model.md
-- All money values are integer rupees (INR).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Shared trigger function: keep updated_at current
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  phone       text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (lower(email));

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table public.categories (
  id          text primary key,
  name        text not null,
  short_name  text not null,
  description text,
  image_url   text,
  image_alt   text,
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name              text not null,
  botanical         text,
  tags              text[] not null default '{}',
  light             text not null check (light in ('low', 'medium', 'bright')),
  care              text not null check (care in ('easy', 'moderate', 'expert')),
  size              text not null check (size in ('small', 'medium', 'large')),
  height            text,
  water             text,
  pet_friendly      boolean not null default false,
  allows_planter    boolean not null default false,
  short_description text,
  description       text,
  care_notes        text[] not null default '{}',
  is_active         boolean not null default true,
  position          int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index products_active_position_idx on public.products (is_active, position);
create index products_tags_idx on public.products using gin (tags);

create table public.product_categories (
  product_id  uuid not null references public.products (id) on delete cascade,
  category_id text not null references public.categories (id) on delete cascade,
  primary key (product_id, category_id)
);

create index product_categories_category_id_idx on public.product_categories (category_id);

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  url          text not null,
  alt          text not null default '',
  storage_path text,
  position     int not null default 0
);

create index product_images_product_id_idx on public.product_images (product_id, position);

create table public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products (id) on delete cascade,
  code             text not null,
  sku              text not null unique,
  label            text not null,
  detail           text,
  price            int not null check (price > 0),
  compare_at_price int check (compare_at_price is null or compare_at_price > price),
  position         int not null default 0,
  is_default       boolean not null default false,
  is_active        boolean not null default true,
  constraint product_variants_product_code_key unique (product_id, code)
);

create index product_variants_product_id_idx on public.product_variants (product_id, position);

create table public.inventory (
  variant_id          uuid primary key references public.product_variants (id) on delete cascade,
  quantity            int not null default 0 check (quantity >= 0),
  low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  updated_at          timestamptz not null default now()
);

create table public.planters (
  id        text primary key,
  label     text not null,
  note      text,
  price     int not null default 0 check (price >= 0),
  swatch    text,
  position  int not null default 0,
  is_active boolean not null default true
);

create table public.discount_codes (
  code            text primary key check (code = upper(code) and length(code) between 3 and 40),
  kind            text not null check (kind in ('percent', 'fixed')),
  value           int not null check (value > 0),
  min_subtotal    int not null default 0 check (min_subtotal >= 0),
  max_redemptions int check (max_redemptions is null or max_redemptions > 0),
  redemptions     int not null default 0 check (redemptions >= 0),
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_active       boolean not null default true,
  description     text,
  created_at      timestamptz not null default now(),
  constraint discount_codes_percent_range check (kind <> 'percent' or value <= 100),
  constraint discount_codes_window check (starts_at is null or ends_at is null or ends_at > starts_at)
);

-- ---------------------------------------------------------------------------
-- Customer data
-- ---------------------------------------------------------------------------
create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  label       text,
  full_name   text not null,
  phone       text,
  line1       text not null,
  line2       text,
  city        text not null,
  state       text not null,
  postal_code text not null check (postal_code ~ '^[1-9][0-9]{5}$'),
  country     text not null default 'IN',
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses (user_id);

create table public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  planter_id text references public.planters (id),
  quantity   int not null check (quantity between 1 and 20),
  constraint cart_items_line_key unique nulls not distinct (cart_id, variant_id, planter_id)
);

create index cart_items_variant_id_idx on public.cart_items (variant_id);
create index cart_items_planter_id_idx on public.cart_items (planter_id);

create table public.wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (wishlist_id, product_id)
);

create index wishlist_items_product_id_idx on public.wishlist_items (product_id);

-- ---------------------------------------------------------------------------
-- Orders & payments (written only by the server with the service role)
-- ---------------------------------------------------------------------------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text not null unique,
  user_id          uuid references auth.users (id) on delete set null,
  email            text not null,
  phone            text,
  full_name        text,
  shipping_address jsonb not null default '{}'::jsonb,
  status           text not null default 'pending_payment'
                   check (status in ('pending_payment', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status   text not null default 'pending'
                   check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'demo_not_charged')),
  payment_method   text not null check (payment_method in ('razorpay', 'demo')),
  subtotal         int not null check (subtotal >= 0),
  discount         int not null default 0 check (discount >= 0),
  delivery_fee     int not null default 0 check (delivery_fee >= 0),
  total            int not null check (total >= 0),
  currency         text not null default 'INR',
  discount_code    text,
  idempotency_key  text unique,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_payment_status_idx on public.orders (payment_status);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  variant_id    uuid references public.product_variants (id) on delete set null,
  planter_id    text,
  product_slug  text not null,
  product_name  text not null,
  variant_label text,
  planter_label text,
  image_url     text,
  unit_price    int not null check (unit_price >= 0),
  quantity      int not null check (quantity > 0),
  line_total    int not null check (line_total >= 0)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders (id) on delete cascade,
  provider            text not null check (provider in ('razorpay', 'demo')),
  provider_order_id   text unique,
  provider_payment_id text unique,
  amount              int not null check (amount >= 0),
  currency            text not null default 'INR',
  status              text not null default 'created'
                      check (status in ('created', 'authorized', 'captured', 'failed', 'refunded', 'demo_not_charged')),
  error_code          text,
  error_description   text,
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index payments_order_id_idx on public.payments (order_id);

-- ---------------------------------------------------------------------------
-- Newsletter
-- ---------------------------------------------------------------------------
create table public.newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique
             check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  status     text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  source     text,
  created_at timestamptz not null default now()
);

create unique index newsletter_subscribers_email_lower_idx on public.newsletter_subscribers (lower(email));

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create trigger profiles_set_updated_at  before update on public.profiles  for each row execute function public.set_updated_at();
create trigger products_set_updated_at  before update on public.products  for each row execute function public.set_updated_at();
create trigger inventory_set_updated_at before update on public.inventory for each row execute function public.set_updated_at();
create trigger carts_set_updated_at     before update on public.carts     for each row execute function public.set_updated_at();
create trigger orders_set_updated_at    before update on public.orders    for each row execute function public.set_updated_at();
create trigger payments_set_updated_at  before update on public.payments  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- New auth user -> profiles row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Guard: customers cannot change profiles.role
-- Requests through the Data API run as the `anon` / `authenticated` roles;
-- for those, a role change requires public.is_admin() (defined in the RLS
-- migration). The service role, the SQL editor (postgres) and other
-- privileged roles are allowed.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and (current_user in ('anon', 'authenticated')
          or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') in ('anon', 'authenticated'))
     and not public.is_admin()
  then
    raise exception 'Only administrators can change a profile role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

revoke execute on function public.set_updated_at()     from public, anon, authenticated;
revoke execute on function public.handle_new_user()    from public, anon, authenticated;
revoke execute on function public.guard_profile_role() from public, anon, authenticated;
