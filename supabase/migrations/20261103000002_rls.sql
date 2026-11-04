-- Pot Stories — row level security
-- Source of truth: docs/backend/data-model.md ("Security (Supabase RLS)")
--
-- Order, payment, inventory and newsletter writes happen only on the server
-- with the service-role key (which bypasses RLS). Customers have no
-- insert/update/delete policies on those tables.

-- ---------------------------------------------------------------------------
-- Helper: is the current user an admin?
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.products               enable row level security;
alter table public.product_categories     enable row level security;
alter table public.product_images         enable row level security;
alter table public.product_variants       enable row level security;
alter table public.inventory              enable row level security;
alter table public.planters               enable row level security;
alter table public.discount_codes         enable row level security;
alter table public.addresses              enable row level security;
alter table public.carts                  enable row level security;
alter table public.cart_items             enable row level security;
alter table public.wishlists              enable row level security;
alter table public.wishlist_items         enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.payments               enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ---------------------------------------------------------------------------
-- Table privileges (defence in depth on top of RLS)
-- TRUNCATE is not subject to RLS, so never grant it to API roles.
-- ---------------------------------------------------------------------------
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- anon: read-only catalogue, nothing else
revoke insert, update, delete on
  public.categories, public.products, public.product_categories, public.product_images,
  public.product_variants, public.inventory, public.planters
from anon;
revoke all on
  public.profiles, public.discount_codes, public.addresses, public.carts, public.cart_items,
  public.wishlists, public.wishlist_items, public.orders, public.order_items, public.payments,
  public.newsletter_subscribers
from anon;
grant select on
  public.categories, public.products, public.product_categories, public.product_images,
  public.product_variants, public.inventory, public.planters
to anon;

-- authenticated: privileges are needed for owner tables and for admins;
-- RLS policies below decide which rows (if any) each user can touch.
grant select, insert, update, delete on all tables in schema public to authenticated;
-- profiles rows are created by the auth trigger and removed with the auth user
revoke insert, delete on public.profiles from authenticated;

grant all on all tables in schema public to service_role;

-- ---------------------------------------------------------------------------
-- profiles: owner select/update, admin select
-- ---------------------------------------------------------------------------
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- role changes by non-admins are blocked by the profiles_guard_role trigger

-- ---------------------------------------------------------------------------
-- Catalogue: public read, admin write
-- ---------------------------------------------------------------------------
-- categories
create policy "categories_select_public" on public.categories
  for select to anon, authenticated
  using (true);
create policy "categories_insert_admin" on public.categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "categories_update_admin" on public.categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "categories_delete_admin" on public.categories
  for delete to authenticated using ((select public.is_admin()));

-- products (only active ones are public; admins see all)
create policy "products_select_active_or_admin" on public.products
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "products_insert_admin" on public.products
  for insert to authenticated with check ((select public.is_admin()));
create policy "products_update_admin" on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products_delete_admin" on public.products
  for delete to authenticated using ((select public.is_admin()));

-- product_categories
create policy "product_categories_select_public" on public.product_categories
  for select to anon, authenticated
  using (true);
create policy "product_categories_insert_admin" on public.product_categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "product_categories_update_admin" on public.product_categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_categories_delete_admin" on public.product_categories
  for delete to authenticated using ((select public.is_admin()));

-- product_images
create policy "product_images_select_public" on public.product_images
  for select to anon, authenticated
  using (true);
create policy "product_images_insert_admin" on public.product_images
  for insert to authenticated with check ((select public.is_admin()));
create policy "product_images_update_admin" on public.product_images
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_images_delete_admin" on public.product_images
  for delete to authenticated using ((select public.is_admin()));

-- product_variants (only active ones are public; admins see all)
create policy "product_variants_select_active_or_admin" on public.product_variants
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "product_variants_insert_admin" on public.product_variants
  for insert to authenticated with check ((select public.is_admin()));
create policy "product_variants_update_admin" on public.product_variants
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "product_variants_delete_admin" on public.product_variants
  for delete to authenticated using ((select public.is_admin()));

-- inventory (public read; admin can correct stock; checkout decrements via
-- public.finalize_order with the service role)
create policy "inventory_select_public" on public.inventory
  for select to anon, authenticated
  using (true);
create policy "inventory_insert_admin" on public.inventory
  for insert to authenticated with check ((select public.is_admin()));
create policy "inventory_update_admin" on public.inventory
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "inventory_delete_admin" on public.inventory
  for delete to authenticated using ((select public.is_admin()));

-- planters (only active ones are public; admins see all)
create policy "planters_select_active_or_admin" on public.planters
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "planters_insert_admin" on public.planters
  for insert to authenticated with check ((select public.is_admin()));
create policy "planters_update_admin" on public.planters
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "planters_delete_admin" on public.planters
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- discount_codes: admin only (codes are validated server-side)
-- ---------------------------------------------------------------------------
create policy "discount_codes_select_admin" on public.discount_codes
  for select to authenticated using ((select public.is_admin()));
create policy "discount_codes_insert_admin" on public.discount_codes
  for insert to authenticated with check ((select public.is_admin()));
create policy "discount_codes_update_admin" on public.discount_codes
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "discount_codes_delete_admin" on public.discount_codes
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- addresses: owner only, all operations
-- ---------------------------------------------------------------------------
create policy "addresses_select_own" on public.addresses
  for select to authenticated using (user_id = (select auth.uid()));
create policy "addresses_insert_own" on public.addresses
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "addresses_update_own" on public.addresses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "addresses_delete_own" on public.addresses
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- carts / cart_items: owner only (items via parent cart)
-- ---------------------------------------------------------------------------
create policy "carts_select_own" on public.carts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "carts_insert_own" on public.carts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "carts_update_own" on public.carts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "carts_delete_own" on public.carts
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "cart_items_select_own" on public.cart_items
  for select to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = (select auth.uid())));
create policy "cart_items_insert_own" on public.cart_items
  for insert to authenticated
  with check (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = (select auth.uid())));
create policy "cart_items_update_own" on public.cart_items
  for update to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = (select auth.uid())));
create policy "cart_items_delete_own" on public.cart_items
  for delete to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- wishlists / wishlist_items: owner only (items via parent wishlist)
-- ---------------------------------------------------------------------------
create policy "wishlists_select_own" on public.wishlists
  for select to authenticated using (user_id = (select auth.uid()));
create policy "wishlists_insert_own" on public.wishlists
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "wishlists_update_own" on public.wishlists
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "wishlists_delete_own" on public.wishlists
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "wishlist_items_select_own" on public.wishlist_items
  for select to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_items.wishlist_id and w.user_id = (select auth.uid())));
create policy "wishlist_items_insert_own" on public.wishlist_items
  for insert to authenticated
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_items.wishlist_id and w.user_id = (select auth.uid())));
create policy "wishlist_items_update_own" on public.wishlist_items
  for update to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_items.wishlist_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_items.wishlist_id and w.user_id = (select auth.uid())));
create policy "wishlist_items_delete_own" on public.wishlist_items
  for delete to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_items.wishlist_id and w.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- orders / order_items / payments: owner SELECT only; admin full access.
-- No customer insert/update/delete — the server writes with the service role.
-- ---------------------------------------------------------------------------
create policy "orders_select_own_or_admin" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "orders_insert_admin" on public.orders
  for insert to authenticated with check ((select public.is_admin()));
create policy "orders_update_admin" on public.orders
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "orders_delete_admin" on public.orders
  for delete to authenticated using ((select public.is_admin()));

create policy "order_items_select_own_or_admin" on public.order_items
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "order_items_insert_admin" on public.order_items
  for insert to authenticated with check ((select public.is_admin()));
create policy "order_items_update_admin" on public.order_items
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "order_items_delete_admin" on public.order_items
  for delete to authenticated using ((select public.is_admin()));

create policy "payments_select_own_or_admin" on public.payments
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = payments.order_id and o.user_id = (select auth.uid()))
    or (select public.is_admin())
  );
create policy "payments_insert_admin" on public.payments
  for insert to authenticated with check ((select public.is_admin()));
create policy "payments_update_admin" on public.payments
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "payments_delete_admin" on public.payments
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- newsletter_subscribers: no public policies; admin only.
-- Sign-ups go through a server action using the service role.
-- ---------------------------------------------------------------------------
create policy "newsletter_subscribers_select_admin" on public.newsletter_subscribers
  for select to authenticated using ((select public.is_admin()));
create policy "newsletter_subscribers_insert_admin" on public.newsletter_subscribers
  for insert to authenticated with check ((select public.is_admin()));
create policy "newsletter_subscribers_update_admin" on public.newsletter_subscribers
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "newsletter_subscribers_delete_admin" on public.newsletter_subscribers
  for delete to authenticated using ((select public.is_admin()));
