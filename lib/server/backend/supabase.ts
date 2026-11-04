import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type {
  Address,
  CartLineInput,
  Catalog,
  DiscountCode,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  PaymentMode,
  PaymentRecordStatus,
  PaymentStatus,
  Planter,
  Profile,
  Role,
  SessionUser,
  ShippingAddress,
  Variant,
} from "@/lib/domain";
import type { CareLevel, Category, CategoryId, Light, Size } from "@/lib/products";
import { env } from "../env";
import { createAnonClient, createServiceClient, createUserClient } from "../supabase/clients";
import { sortPlanters, toCatalogProduct, type ProductRow } from "./shape";
import type { AdminStats, Backend, CustomerSummary, FinalizeResult } from "./types";

/**
 * SUPABASE BACKEND — production implementation of `Backend`.
 *
 * Client choice:
 * - anon client (no cookies): public catalogue reads, safe inside 'use cache'.
 * - user client (session cookies): auth + customer-owned data; RLS enforces
 *   ownership and every query still filters by the caller-supplied user id.
 * - service client (bypasses RLS): orders, payments, newsletter and admin —
 *   only after the server has authorised the action.
 *
 * Errors are logged server-side and re-thrown as `Error`s with safe messages.
 */

/* ------------------------------------------------------------------ */
/* Errors & small helpers                                               */
/* ------------------------------------------------------------------ */

type DbError = { code?: string; message?: string; details?: string } | null;

function fail(context: string, error: DbError): never {
  console.error(`[supabase] ${context} failed`, error?.code ?? "", error?.message ?? "");
  switch (error?.code) {
    case "23505":
      throw new Error(`${context}: a record with the same unique value already exists.`);
    case "23514":
      throw new Error(`${context}: some values are out of the allowed range.`);
    case "23503":
      throw new Error(`${context}: a referenced record does not exist.`);
    case "42501":
      throw new Error(`${context}: permission denied.`);
    default:
      throw new Error(`${context} failed. Please try again.`);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string | null | undefined): v is string => !!v && UUID_RE.test(v);

/** PostgREST may embed a to-one relation as an object or a one-element array. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

const PAGE_SIZE = 1000; // PostgREST default max-rows

/** Reads every page of an ordered query (PostgREST caps rows per request). */
async function selectAll<T>(
  context: string,
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: DbError }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) fail(context, error);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) return out;
  }
}

async function countRows(context: string, q: PromiseLike<{ count: number | null; error: DbError }>): Promise<number> {
  const { count, error } = await q;
  if (error) fail(context, error);
  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/* Row shapes (snake_case, as stored)                                   */
/* ------------------------------------------------------------------ */

interface InventoryRow {
  quantity: number;
  low_stock_threshold: number;
}

interface VariantDbRow {
  id: string;
  product_id: string;
  code: string;
  sku: string;
  label: string;
  detail: string | null;
  price: number;
  compare_at_price: number | null;
  position: number;
  is_default: boolean;
  is_active: boolean;
  inventory?: InventoryRow | InventoryRow[] | null;
}

interface ProductDbRow {
  id: string;
  slug: string;
  name: string;
  botanical: string | null;
  tags: string[] | null;
  light: Light;
  care: CareLevel;
  size: Size;
  height: string | null;
  water: string | null;
  pet_friendly: boolean;
  allows_planter: boolean;
  short_description: string | null;
  description: string | null;
  care_notes: string[] | null;
  is_active: boolean;
  position: number;
  product_categories?: { category_id: string }[] | null;
  product_images?: { url: string; alt: string | null; storage_path: string | null; position: number }[] | null;
  product_variants?: VariantDbRow[] | null;
}

interface CategoryDbRow {
  id: string;
  name: string;
  short_name: string;
  description: string | null;
  image_url: string | null;
  image_alt: string | null;
  position: number;
}

interface PlanterDbRow {
  id: string;
  label: string;
  note: string | null;
  price: number;
  swatch: string | null;
  position: number;
  is_active: boolean;
}

interface DiscountDbRow {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  max_redemptions: number | null;
  redemptions: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  description: string | null;
}

interface ProfileDbRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: Role;
  created_at: string;
}

interface AddressDbRow {
  id: string;
  user_id: string;
  label: string | null;
  full_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
  created_at: string;
}

interface OrderItemDbRow {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  planter_id: string | null;
  product_slug: string;
  product_name: string;
  variant_label: string | null;
  planter_label: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface PaymentDbRow {
  id: string;
  order_id: string;
  provider: PaymentMode;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  error_code: string | null;
  error_description: string | null;
  created_at: string;
}

interface OrderDbRow {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  phone: string | null;
  full_name: string | null;
  shipping_address: Partial<ShippingAddress> | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMode;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  currency: string;
  discount_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItemDbRow[] | null;
  payments?: PaymentDbRow[] | null;
}

/* ------------------------------------------------------------------ */
/* Mapping                                                              */
/* ------------------------------------------------------------------ */

const VARIANT_COLUMNS = "id, product_id, code, sku, label, detail, price, compare_at_price, position, is_default, is_active, inventory(quantity, low_stock_threshold)";
const PRODUCT_SELECT = `id, slug, name, botanical, tags, light, care, size, height, water, pet_friendly, allows_planter,
  short_description, description, care_notes, is_active, position,
  product_categories(category_id),
  product_images(url, alt, storage_path, position),
  product_variants(${VARIANT_COLUMNS})`;
const PAYMENT_COLUMNS = "id, order_id, provider, provider_order_id, provider_payment_id, amount, currency, status, error_code, error_description, created_at";
const ORDER_SELECT = `id, order_number, user_id, email, phone, full_name, shipping_address, status, payment_status, payment_method,
  subtotal, discount, delivery_fee, total, currency, discount_code, notes, created_at, updated_at,
  order_items(*), payments(${PAYMENT_COLUMNS})`;
const PROFILE_COLUMNS = "id, email, full_name, phone, role, created_at";
const ADDRESS_COLUMNS = "id, user_id, label, full_name, phone, line1, line2, city, state, postal_code, country, is_default, created_at";

function toVariant(v: VariantDbRow): Variant {
  const inv = one(v.inventory);
  return {
    id: v.id,
    code: v.code,
    sku: v.sku,
    label: v.label,
    detail: v.detail ?? "",
    price: v.price,
    compareAtPrice: v.compare_at_price,
    stock: inv?.quantity ?? 0,
    lowStockThreshold: inv?.low_stock_threshold ?? 5,
    isDefault: v.is_default,
    isActive: v.is_active,
    position: v.position,
  };
}

function toProductRow(p: ProductDbRow): ProductRow {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    botanical: p.botanical ?? "",
    categoryIds: (p.product_categories ?? []).map((c) => c.category_id),
    tags: p.tags ?? [],
    light: p.light,
    care: p.care,
    size: p.size,
    height: p.height ?? "",
    water: p.water ?? "",
    petFriendly: p.pet_friendly,
    allowsPlanter: p.allows_planter,
    shortDescription: p.short_description ?? "",
    description: p.description ?? "",
    careNotes: p.care_notes ?? [],
    isActive: p.is_active,
    position: p.position,
    images: (p.product_images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? "", storagePath: i.storage_path, position: i.position })),
  };
}

const toCategory = (c: CategoryDbRow): Category => ({
  id: c.id as CategoryId,
  name: c.name,
  short: c.short_name,
  description: c.description ?? "",
  image: c.image_url ?? "",
  imageAlt: c.image_alt ?? "",
});

const toPlanter = (p: PlanterDbRow): Planter => ({
  id: p.id,
  label: p.label,
  note: p.note ?? "",
  price: p.price,
  swatch: p.swatch ?? "",
  position: p.position,
  isActive: p.is_active,
});

const toDiscount = (d: DiscountDbRow): DiscountCode => ({
  code: d.code,
  kind: d.kind,
  value: d.value,
  minSubtotal: d.min_subtotal,
  maxRedemptions: d.max_redemptions,
  redemptions: d.redemptions,
  startsAt: d.starts_at,
  endsAt: d.ends_at,
  isActive: d.is_active,
  description: d.description ?? "",
});

const toProfile = (p: ProfileDbRow): Profile => ({
  id: p.id,
  email: p.email ?? "",
  fullName: p.full_name,
  phone: p.phone,
  role: p.role,
  createdAt: p.created_at,
});

const toAddress = (a: AddressDbRow): Address => ({
  id: a.id,
  label: a.label ?? "",
  fullName: a.full_name,
  phone: a.phone ?? "",
  line1: a.line1,
  line2: a.line2,
  city: a.city,
  state: a.state,
  postalCode: a.postal_code,
  country: a.country,
  isDefault: a.is_default,
});

const toPayment = (p: PaymentDbRow): Payment => ({
  id: p.id,
  orderId: p.order_id,
  provider: p.provider,
  providerOrderId: p.provider_order_id,
  providerPaymentId: p.provider_payment_id,
  amount: p.amount,
  currency: p.currency,
  status: p.status,
  errorCode: p.error_code,
  errorDescription: p.error_description,
  createdAt: p.created_at,
});

const toOrderItem = (i: OrderItemDbRow): OrderItem => ({
  id: i.id,
  productId: i.product_id,
  variantId: i.variant_id,
  planterId: i.planter_id,
  productSlug: i.product_slug,
  productName: i.product_name,
  variantLabel: i.variant_label ?? "",
  planterLabel: i.planter_label,
  imageUrl: i.image_url ?? "",
  unitPrice: i.unit_price,
  quantity: i.quantity,
  lineTotal: i.line_total,
});

function toShipping(s: Partial<ShippingAddress> | null): ShippingAddress {
  return {
    fullName: s?.fullName ?? "",
    phone: s?.phone ?? "",
    line1: s?.line1 ?? "",
    line2: s?.line2 ?? null,
    city: s?.city ?? "",
    state: s?.state ?? "",
    postalCode: s?.postalCode ?? "",
    country: s?.country ?? "IN",
  };
}

function toOrder(o: OrderDbRow): Order {
  return {
    id: o.id,
    orderNumber: o.order_number,
    userId: o.user_id,
    email: o.email,
    phone: o.phone ?? "",
    fullName: o.full_name ?? "",
    shippingAddress: toShipping(o.shipping_address),
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    subtotal: o.subtotal,
    discount: o.discount,
    deliveryFee: o.delivery_fee,
    total: o.total,
    currency: o.currency,
    discountCode: o.discount_code,
    notes: o.notes,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    items: (o.order_items ?? []).map(toOrderItem),
    payments: (o.payments ?? []).map(toPayment).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

/* ------------------------------------------------------------------ */
/* Shared queries                                                       */
/* ------------------------------------------------------------------ */

async function fetchOrder(sb: SupabaseClient, context: string, orderId: string, userId?: string): Promise<Order | null> {
  if (!isUuid(orderId)) return null;
  let q = sb.from("orders").select(ORDER_SELECT).eq("id", orderId);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q.maybeSingle();
  if (error) fail(context, error);
  return data ? toOrder(data as unknown as OrderDbRow) : null;
}

async function sessionUserFor(sb: SupabaseClient, user: User): Promise<SessionUser> {
  const { data, error } = await sb.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  if (error) console.error("[supabase] profile lookup failed", error.code, error.message);
  const profile = data as Pick<ProfileDbRow, "full_name" | "role"> | null;
  const metaName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;
  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? metaName,
    role: profile?.role === "admin" ? "admin" : "customer",
  };
}

/** Maps `${slug}::${code}` → variant uuid for the given product slugs (active rows visible to the client). */
async function variantIdsBySlug(sb: SupabaseClient, slugs: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!slugs.length) return map;
  const { data, error } = await sb.from("product_variants").select("id, code, products!inner(slug)").in("products.slug", slugs);
  if (error) fail("Cart lookup", error);
  for (const row of (data ?? []) as unknown as { id: string; code: string; products: { slug: string } | { slug: string }[] | null }[]) {
    const slug = one(row.products)?.slug;
    if (slug) map.set(`${slug}::${row.code}`, row.id);
  }
  return map;
}

async function clearCartFor(sb: SupabaseClient, userId: string) {
  const { data: cart, error } = await sb.from("carts").select("id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!cart) return;
  const del = await sb.from("cart_items").delete().eq("cart_id", (cart as { id: string }).id);
  if (del.error) throw del.error;
}

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Checks the file's magic bytes match the declared image type. */
function sniffImage(bytes: Uint8Array, type: string): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  switch (type) {
    case "image/jpeg":
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes[0] === 0x89 && ascii(1, 4) === "PNG";
    case "image/webp":
      return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
    case "image/avif":
      return ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12));
    default:
      return false;
  }
}

const SAFE_SEARCH = /[^\p{L}\p{N}@._+\- ]/gu;

/* ------------------------------------------------------------------ */
/* Backend                                                              */
/* ------------------------------------------------------------------ */

export const supabaseBackend: Backend = {
  mode: "supabase",

  /* ---------------------------- Catalogue ---------------------------- */

  async getCatalog(options) {
    const includeInactive = options?.includeInactive ?? false;
    // Public reads use the cookie-free anon client (runs inside 'use cache').
    const sb = includeInactive ? createServiceClient() : createAnonClient();

    const products = await selectAll<ProductDbRow>("Loading products", (from, to) => {
      let q = sb.from("products").select(PRODUCT_SELECT);
      if (!includeInactive) q = q.eq("is_active", true);
      return q.order("position").order("id").range(from, to);
    });

    const { data: categories, error: catErr } = await sb.from("categories").select("id, name, short_name, description, image_url, image_alt, position").order("position");
    if (catErr) fail("Loading categories", catErr);

    let plantersQ = sb.from("planters").select("id, label, note, price, swatch, position, is_active");
    if (!includeInactive) plantersQ = plantersQ.eq("is_active", true);
    const { data: planters, error: plErr } = await plantersQ.order("position");
    if (plErr) fail("Loading planters", plErr);

    const catalog: Catalog = {
      products: products.map((p) => toCatalogProduct(toProductRow(p), (p.product_variants ?? []).map(toVariant))),
      categories: ((categories ?? []) as unknown as CategoryDbRow[]).map(toCategory),
      planters: sortPlanters(((planters ?? []) as unknown as PlanterDbRow[]).map(toPlanter)),
      generatedAt: new Date().toISOString(),
    };
    return catalog;
  },

  async getDiscountCode(code) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;
    // discount_codes has no public RLS policy — validated server-side only.
    const sb = createServiceClient();
    const { data, error } = await sb
      .from("discount_codes")
      .select("code, kind, value, min_subtotal, max_redemptions, redemptions, starts_at, ends_at, is_active, description")
      .eq("code", normalized)
      .maybeSingle();
    if (error) fail("Looking up the discount code", error);
    return data ? toDiscount(data as unknown as DiscountDbRow) : null;
  },

  /* ------------------------------ Auth ------------------------------ */

  async getSessionUser() {
    const sb = await createUserClient();
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) return null;
    return sessionUserFor(sb, data.user);
  },

  async signUp({ email, password, fullName }) {
    const sb = await createUserClient();
    const { data, error } = await sb.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${env.siteUrl}/auth/callback?next=/account`,
      },
    });
    if (error) {
      console.error("[supabase] signUp failed", error.code, error.status);
      if (error.code === "user_already_exists" || error.code === "email_exists") {
        return { ok: false, error: "An account with this email already exists." };
      }
      if (error.code === "weak_password") return { ok: false, error: "Please choose a stronger password." };
      if (error.code === "over_email_send_rate_limit" || error.status === 429) {
        return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
      }
      return { ok: false, error: "We couldn't create your account. Please try again." };
    }
    if (!data.session || !data.user) {
      return { ok: false, needsConfirmation: true, error: "Check your email to confirm your account." };
    }
    return { ok: true, user: await sessionUserFor(sb, data.user) };
  },

  async signIn({ email, password }) {
    const sb = await createUserClient();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error || !data.user) {
      if (error?.code === "email_not_confirmed") return { ok: false, error: "Please confirm your email address before signing in." };
      if (error?.status === 429) return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
      return { ok: false, error: "Incorrect email or password." };
    }
    return { ok: true, user: await sessionUserFor(sb, data.user) };
  },

  async signOut() {
    const sb = await createUserClient();
    const { error } = await sb.auth.signOut();
    if (error) console.error("[supabase] signOut failed", error.code, error.message);
  },

  async requestPasswordReset(email) {
    // The redirect always goes through /auth/callback, which establishes the
    // recovery session before showing the reset form.
    const sb = await createUserClient();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${env.siteUrl}/auth/callback?next=/account/reset-password`,
    });
    // Never reveal whether the email exists — errors are only logged.
    if (error) console.error("[supabase] resetPasswordForEmail failed", error.code, error.status);
    return {};
  },

  async resetPassword({ password }) {
    const sb = await createUserClient();
    const { data: current, error: userErr } = await sb.auth.getUser();
    if (userErr || !current.user) return { ok: false, error: "This reset link is invalid or has expired." };
    const { data, error } = await sb.auth.updateUser({ password });
    if (error || !data.user) {
      if (error?.code === "same_password") return { ok: false, error: "Please choose a password different from your current one." };
      if (error?.code === "weak_password") return { ok: false, error: "Please choose a stronger password." };
      console.error("[supabase] updateUser(password) failed", error?.code, error?.status);
      return { ok: false, error: "We couldn't update your password. Please request a new reset link." };
    }
    return { ok: true, user: await sessionUserFor(sb, data.user) };
  },

  /* ------------------------- Customer-scoped ------------------------- */

  async getProfile(userId) {
    const sb = await createUserClient();
    const { data, error } = await sb.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
    if (error) fail("Loading your profile", error);
    return data ? toProfile(data as unknown as ProfileDbRow) : null;
  },

  async updateProfile(userId, input) {
    const sb = await createUserClient();
    const { data, error } = await sb
      .from("profiles")
      .update({ full_name: input.fullName.trim() || null, phone: input.phone?.trim() || null })
      .eq("id", userId)
      .select(PROFILE_COLUMNS)
      .maybeSingle();
    if (error) fail("Updating your profile", error);
    if (!data) throw new Error("Profile not found");
    return toProfile(data as unknown as ProfileDbRow);
  },

  async listAddresses(userId) {
    const sb = await createUserClient();
    const { data, error } = await sb
      .from("addresses")
      .select(ADDRESS_COLUMNS)
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at");
    if (error) fail("Loading addresses", error);
    return ((data ?? []) as unknown as AddressDbRow[]).map(toAddress);
  },

  async saveAddress(userId, input) {
    const sb = await createUserClient();
    const { data: mineData, error: mineErr } = await sb.from("addresses").select("id").eq("user_id", userId);
    if (mineErr) fail("Saving the address", mineErr);
    const mine = (mineData ?? []) as { id: string }[];
    if (input.id && !mine.some((a) => a.id === input.id)) throw new Error("Address not found");
    const makeDefault = input.isDefault || mine.length === 0;

    if (makeDefault) {
      let clear = sb.from("addresses").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
      if (input.id) clear = clear.neq("id", input.id);
      const { error } = await clear;
      if (error) fail("Saving the address", error);
    }

    const row = {
      user_id: userId,
      label: input.label,
      full_name: input.fullName,
      phone: input.phone,
      line1: input.line1,
      line2: input.line2,
      city: input.city,
      state: input.state,
      postal_code: input.postalCode,
      country: "IN",
      is_default: makeDefault,
    };
    const q = input.id
      ? sb.from("addresses").update(row).eq("id", input.id).eq("user_id", userId).select(ADDRESS_COLUMNS).single()
      : sb.from("addresses").insert(row).select(ADDRESS_COLUMNS).single();
    const { data, error } = await q;
    if (error) fail("Saving the address", error);
    return toAddress(data as unknown as AddressDbRow);
  },

  async deleteAddress(userId, addressId) {
    if (!isUuid(addressId)) return;
    const sb = await createUserClient();
    const { error } = await sb.from("addresses").delete().eq("user_id", userId).eq("id", addressId);
    if (error) fail("Deleting the address", error);
  },

  async getCart(userId) {
    const sb = await createUserClient();
    const { data, error } = await sb
      .from("carts")
      .select("id, cart_items(quantity, planter_id, product_variants(code, products(slug)))")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) fail("Loading your cart", error);
    type Item = {
      quantity: number;
      planter_id: string | null;
      product_variants: { code: string; products: { slug: string } | { slug: string }[] | null } | { code: string; products: { slug: string } | { slug: string }[] | null }[] | null;
    };
    const items = ((data as { cart_items?: Item[] } | null)?.cart_items ?? []) as Item[];
    const lines: CartLineInput[] = [];
    for (const item of items) {
      const variant = one(item.product_variants);
      const slug = one(variant?.products)?.slug;
      // Variants/products hidden by RLS (inactive) are skipped.
      if (!variant || !slug) continue;
      lines.push({ slug, variant: variant.code, planter: item.planter_id, quantity: item.quantity });
    }
    return lines;
  },

  async replaceCart(userId, lines) {
    const sb = await createUserClient();
    const { data: cart, error: cartErr } = await sb
      .from("carts")
      .upsert({ user_id: userId }, { onConflict: "user_id" })
      .select("id")
      .single();
    if (cartErr) fail("Saving your cart", cartErr);
    const cartId = (cart as { id: string }).id;

    const variantIds = await variantIdsBySlug(sb, [...new Set(lines.map((l) => l.slug))]);
    const planterIds = new Set<string>();
    if (lines.some((l) => l.planter)) {
      const { data: planters, error } = await sb.from("planters").select("id");
      if (error) fail("Saving your cart", error);
      for (const p of (planters ?? []) as { id: string }[]) planterIds.add(p.id);
    }

    // Merge duplicate lines (unique per cart/variant/planter); drop unknown ones.
    const merged = new Map<string, { cart_id: string; variant_id: string; planter_id: string | null; quantity: number }>();
    for (const line of lines) {
      const variantId = variantIds.get(`${line.slug}::${line.variant}`);
      if (!variantId) continue;
      if (line.planter && !planterIds.has(line.planter)) continue;
      const qty = Math.floor(line.quantity);
      if (!Number.isFinite(qty) || qty < 1) continue;
      const key = `${variantId}::${line.planter ?? ""}`;
      const existing = merged.get(key);
      if (existing) existing.quantity = Math.min(20, existing.quantity + qty);
      else merged.set(key, { cart_id: cartId, variant_id: variantId, planter_id: line.planter ?? null, quantity: Math.min(20, qty) });
    }

    const del = await sb.from("cart_items").delete().eq("cart_id", cartId);
    if (del.error) fail("Saving your cart", del.error);
    if (merged.size) {
      const ins = await sb.from("cart_items").insert([...merged.values()]);
      if (ins.error) fail("Saving your cart", ins.error);
    }
  },

  async getWishlist(userId) {
    const sb = await createUserClient();
    const { data, error } = await sb
      .from("wishlists")
      .select("id, wishlist_items(created_at, products(slug))")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) fail("Loading your wishlist", error);
    type Item = { created_at: string; products: { slug: string } | { slug: string }[] | null };
    const items = ((data as { wishlist_items?: Item[] } | null)?.wishlist_items ?? []) as Item[];
    return [...items]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((i) => one(i.products)?.slug)
      .filter((s): s is string => !!s);
  },

  async replaceWishlist(userId, slugs) {
    const sb = await createUserClient();
    const { data: list, error: listErr } = await sb
      .from("wishlists")
      .upsert({ user_id: userId }, { onConflict: "user_id" })
      .select("id")
      .single();
    if (listErr) fail("Saving your wishlist", listErr);
    const wishlistId = (list as { id: string }).id;

    const unique = [...new Set(slugs)];
    const ids = new Map<string, string>();
    if (unique.length) {
      const { data, error } = await sb.from("products").select("id, slug").in("slug", unique);
      if (error) fail("Saving your wishlist", error);
      for (const p of (data ?? []) as { id: string; slug: string }[]) ids.set(p.slug, p.id);
    }

    const del = await sb.from("wishlist_items").delete().eq("wishlist_id", wishlistId);
    if (del.error) fail("Saving your wishlist", del.error);
    // Explicit, increasing timestamps preserve the caller's order.
    const base = Date.now();
    const rows = unique
      .filter((s) => ids.has(s))
      .map((s, i) => ({ wishlist_id: wishlistId, product_id: ids.get(s)!, created_at: new Date(base + i).toISOString() }));
    if (rows.length) {
      const ins = await sb.from("wishlist_items").insert(rows);
      if (ins.error) fail("Saving your wishlist", ins.error);
    }
  },

  async findOrderByIdempotencyKey(userId, key) {
    const sb = await createUserClient();
    const { data, error } = await sb.from("orders").select(ORDER_SELECT).eq("user_id", userId).eq("idempotency_key", key).maybeSingle();
    if (error) fail("Looking up the order", error);
    return data ? toOrder(data as unknown as OrderDbRow) : null;
  },

  async listOrdersForUser(userId) {
    const sb = await createUserClient();
    const rows = await selectAll<OrderDbRow>("Loading your orders", (from, to) =>
      sb.from("orders").select(ORDER_SELECT).eq("user_id", userId).order("created_at", { ascending: false }).order("id").range(from, to),
    );
    return rows.map(toOrder);
  },

  async getOrderForUser(userId, orderId) {
    const sb = await createUserClient();
    return fetchOrder(sb, "Loading the order", orderId, userId);
  },

  async cancelPendingOrder(userId, orderId) {
    if (!isUuid(orderId)) return false;
    // Customers have no update policy on orders: the service client writes,
    // with ownership and state verified in the same statement.
    const sb = createServiceClient();
    const { data, error } = await sb
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("status", "pending_payment")
      .neq("payment_status", "paid")
      .select("id");
    if (error) fail("Cancelling the order", error);
    return (data ?? []).length > 0;
  },

  /* ------------------------ Orders & payments ------------------------ */

  async createOrder(input) {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from("orders")
      .insert({
        order_number: input.orderNumber,
        user_id: input.userId,
        email: input.email,
        phone: input.phone,
        full_name: input.fullName,
        shipping_address: input.shippingAddress,
        status: "pending_payment",
        payment_status: "pending",
        payment_method: input.paymentMethod,
        subtotal: input.subtotal,
        discount: input.discount,
        delivery_fee: input.deliveryFee,
        total: input.total,
        currency: "INR",
        discount_code: input.discountCode,
        idempotency_key: input.idempotencyKey,
        notes: input.notes,
      })
      .select("id")
      .single();
    if (error) fail("Creating the order", error);
    const orderId = (data as { id: string }).id;

    if (input.items.length) {
      const items = await sb.from("order_items").insert(
        input.items.map((i) => ({
          order_id: orderId,
          product_id: isUuid(i.productId) ? i.productId : null,
          variant_id: isUuid(i.variantId) ? i.variantId : null,
          planter_id: i.planterId,
          product_slug: i.productSlug,
          product_name: i.productName,
          variant_label: i.variantLabel,
          planter_label: i.planterLabel,
          image_url: i.imageUrl,
          unit_price: i.unitPrice,
          quantity: i.quantity,
          line_total: i.lineTotal,
        })),
      );
      if (items.error) {
        // Compensate: don't leave an order without its lines.
        await sb.from("orders").delete().eq("id", orderId);
        fail("Creating the order", items.error);
      }
    }

    const order = await fetchOrder(sb, "Creating the order", orderId);
    if (!order) throw new Error("Creating the order failed. Please try again.");
    return order;
  },

  async addPayment(input) {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from("payments")
      .insert({
        order_id: input.orderId,
        provider: input.provider,
        provider_order_id: input.providerOrderId,
        amount: input.amount,
        currency: "INR",
        status: input.status,
      })
      .select(PAYMENT_COLUMNS)
      .single();
    if (error) fail("Recording the payment", error);
    return toPayment(data as unknown as PaymentDbRow);
  },

  async getPaymentByProviderOrderId(providerOrderId) {
    const sb = createServiceClient();
    const { data, error } = await sb.from("payments").select(PAYMENT_COLUMNS).eq("provider_order_id", providerOrderId).maybeSingle();
    if (error) fail("Looking up the payment", error);
    return data ? toPayment(data as unknown as PaymentDbRow) : null;
  },

  async getOrderById(orderId) {
    return fetchOrder(createServiceClient(), "Loading the order", orderId);
  },

  async markPaymentFailed(paymentId, input) {
    if (!isUuid(paymentId)) return;
    const sb = createServiceClient();
    const { data, error } = await sb.from("payments").select("id, order_id, status, provider_payment_id").eq("id", paymentId).maybeSingle();
    if (error) fail("Updating the payment", error);
    const payment = data as { id: string; order_id: string; status: PaymentRecordStatus; provider_payment_id: string | null } | null;
    if (!payment || payment.status === "captured") return;

    const patch: Record<string, unknown> = {
      status: "failed",
      provider_payment_id: input.providerPaymentId ?? payment.provider_payment_id,
      error_code: input.errorCode ?? null,
      error_description: input.errorDescription ?? null,
    };
    if (input.raw !== undefined) patch.raw = input.raw;
    // Guard against a concurrent capture between the read and this write.
    const upd = await sb.from("payments").update(patch).eq("id", paymentId).neq("status", "captured");
    if (upd.error) fail("Updating the payment", upd.error);

    const ord = await sb.from("orders").update({ payment_status: "failed" }).eq("id", payment.order_id).eq("payment_status", "pending");
    if (ord.error) fail("Updating the order", ord.error);
  },

  async finalizeOrder(orderId, input) {
    const sb = createServiceClient();
    const payment: Record<string, unknown> = {
      payment_status: input.paymentStatus,
      payment_id: input.paymentId,
      status: input.recordStatus,
    };
    if (input.providerPaymentId) payment.provider_payment_id = input.providerPaymentId;
    if (input.raw !== undefined) payment.raw = input.raw;

    const { data, error } = await sb.rpc("finalize_order", { p_order_id: orderId, p_payment: payment });
    if (error) {
      if (error.code === "P0002") throw new Error("Order not found");
      fail("Finalising the order", error);
    }
    const status = (data as { status?: string } | null)?.status;
    let result: FinalizeResult;
    if (status === "finalized" || status === "already_finalized" || status === "insufficient_stock") result = status;
    else {
      console.error("[supabase] finalize_order returned an unexpected result", status);
      throw new Error("Finalising the order failed. Please try again.");
    }

    if (result === "finalized") {
      // Mirror the demo backend: the purchased cart is emptied.
      try {
        const { data: ord } = await sb.from("orders").select("user_id").eq("id", orderId).maybeSingle();
        const uid = (ord as { user_id: string | null } | null)?.user_id;
        if (uid) await clearCartFor(sb, uid);
      } catch (err) {
        console.error("[supabase] clearing the cart after finalisation failed", (err as DbError)?.code ?? "");
      }
    }
    return result;
  },

  /* ---------------------------- Newsletter ---------------------------- */

  async subscribeNewsletter(email, source) {
    const normalized = email.trim().toLowerCase();
    const sb = createServiceClient();
    const { data, error } = await sb.from("newsletter_subscribers").select("id, status").eq("email", normalized).maybeSingle();
    if (error) fail("Subscribing", error);
    const existing = data as { id: string; status: string } | null;
    if (existing?.status === "subscribed") return "already_subscribed";
    if (existing) {
      const upd = await sb.from("newsletter_subscribers").update({ status: "subscribed" }).eq("id", existing.id);
      if (upd.error) fail("Subscribing", upd.error);
      return "subscribed";
    }
    const ins = await sb.from("newsletter_subscribers").insert({ email: normalized, status: "subscribed", source });
    if (ins.error) {
      if (ins.error.code === "23505") return "already_subscribed"; // concurrent sign-up
      if (ins.error.code === "23514") throw new Error("Please enter a valid email address.");
      fail("Subscribing", ins.error);
    }
    return "subscribed";
  },

  /* ------------------------------ Admin ------------------------------ */

  admin: {
    async stats() {
      const sb = createServiceClient();
      const head = { count: "exact" as const, head: true };
      const [totalProducts, activeProducts, totalOrders, pendingOrders, demoOrders, customers, newsletterSubscribers] = await Promise.all([
        countRows("Loading stats", sb.from("products").select("id", head)),
        countRows("Loading stats", sb.from("products").select("id", head).eq("is_active", true)),
        countRows("Loading stats", sb.from("orders").select("id", head)),
        countRows("Loading stats", sb.from("orders").select("id", head).in("status", ["pending_payment", "processing"])),
        countRows("Loading stats", sb.from("orders").select("id", head).eq("payment_status", "demo_not_charged")),
        countRows("Loading stats", sb.from("profiles").select("id", head).eq("role", "customer")),
        countRows("Loading stats", sb.from("newsletter_subscribers").select("id", head).eq("status", "subscribed")),
      ]);

      // Verified revenue: only orders whose payment was verified (paid).
      const paid = await selectAll<{ total: number }>("Loading stats", (from, to) =>
        sb.from("orders").select("total").eq("payment_status", "paid").order("id").range(from, to),
      );
      const verifiedRevenue = paid.reduce((s, o) => s + o.total, 0);

      type LowRow = VariantDbRow & { products: { name: string; slug: string } | { name: string; slug: string }[] | null };
      const variants = await selectAll<LowRow>("Loading stats", (from, to) =>
        sb.from("product_variants").select(`${VARIANT_COLUMNS}, products(name, slug)`).eq("is_active", true).order("id").range(from, to),
      );
      const lowStock: AdminStats["lowStock"] = variants
        .map((v) => ({ v: toVariant(v), p: one(v.products) }))
        .filter(({ v }) => v.stock <= v.lowStockThreshold)
        .map(({ v, p }) => ({
          productName: p?.name ?? "Unknown",
          slug: p?.slug ?? "",
          variantLabel: v.label,
          variantId: v.id,
          stock: v.stock,
          threshold: v.lowStockThreshold,
        }))
        .sort((a, b) => a.stock - b.stock);

      return { totalProducts, activeProducts, totalOrders, pendingOrders, verifiedRevenue, demoOrders, lowStock, customers, newsletterSubscribers };
    },

    async listOrders({ query, status, payment }) {
      const sb = createServiceClient();
      const q = query?.replace(SAFE_SEARCH, "").trim();
      const rows = await selectAll<OrderDbRow>("Loading orders", (from, to) => {
        let b = sb.from("orders").select(ORDER_SELECT);
        if (status && status !== "all") b = b.eq("status", status);
        if (payment && payment !== "all") b = b.eq("payment_status", payment);
        if (q) b = b.or(`order_number.ilike."%${q}%",email.ilike."%${q}%",full_name.ilike."%${q}%"`);
        return b.order("created_at", { ascending: false }).order("id").range(from, to);
      });
      return rows.map(toOrder);
    },

    async getOrder(orderId) {
      return fetchOrder(createServiceClient(), "Loading the order", orderId);
    },

    async updateOrderStatus(orderId, status) {
      if (!isUuid(orderId)) throw new Error("Order not found");
      const sb = createServiceClient();
      const { data, error } = await sb.from("orders").update({ status }).eq("id", orderId).select("id");
      if (error) fail("Updating the order", error);
      if (!(data ?? []).length) throw new Error("Order not found");
    },

    async listCustomers() {
      const sb = createServiceClient();
      const [profiles, orders] = await Promise.all([
        selectAll<ProfileDbRow>("Loading customers", (from, to) =>
          sb.from("profiles").select(PROFILE_COLUMNS).order("created_at", { ascending: false }).order("id").range(from, to),
        ),
        selectAll<{ user_id: string; total: number; payment_status: PaymentStatus }>("Loading customers", (from, to) =>
          sb.from("orders").select("user_id, total, payment_status").not("user_id", "is", null).order("id").range(from, to),
        ),
      ]);
      const agg = new Map<string, { count: number; spent: number }>();
      for (const o of orders) {
        const a = agg.get(o.user_id) ?? { count: 0, spent: 0 };
        a.count += 1;
        if (o.payment_status === "paid") a.spent += o.total;
        agg.set(o.user_id, a);
      }
      return profiles.map((p): CustomerSummary => ({
        ...toProfile(p),
        orderCount: agg.get(p.id)?.count ?? 0,
        totalSpent: agg.get(p.id)?.spent ?? 0,
      }));
    },

    async getCustomer(userId) {
      if (!isUuid(userId)) return null;
      const sb = createServiceClient();
      const { data: profile, error } = await sb.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
      if (error) fail("Loading the customer", error);
      if (!profile) return null;
      const [orderRows, addrRes] = await Promise.all([
        selectAll<OrderDbRow>("Loading the customer", (from, to) =>
          sb.from("orders").select(ORDER_SELECT).eq("user_id", userId).order("created_at", { ascending: false }).order("id").range(from, to),
        ),
        sb.from("addresses").select(ADDRESS_COLUMNS).eq("user_id", userId).order("is_default", { ascending: false }).order("created_at"),
      ]);
      if (addrRes.error) fail("Loading the customer", addrRes.error);
      const orders = orderRows.map(toOrder);
      const p = toProfile(profile as unknown as ProfileDbRow);
      return {
        customer: {
          ...p,
          orderCount: orders.length,
          totalSpent: orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
        },
        orders,
        addresses: ((addrRes.data ?? []) as unknown as AddressDbRow[]).map(toAddress),
      };
    },

    async upsertProduct(input) {
      const sb = createServiceClient();
      const ctx = "Saving the product";

      const codes = input.variants.map((v) => v.code);
      const dup = codes.find((c, i) => codes.indexOf(c) !== i);
      if (dup) throw new Error(`Two variants share the code "${dup}".`);

      // Slug must be unique.
      let clashQ = sb.from("products").select("id").eq("slug", input.slug);
      if (isUuid(input.id)) clashQ = clashQ.neq("id", input.id);
      const { data: clash, error: clashErr } = await clashQ.limit(1);
      if (clashErr) fail(ctx, clashErr);
      if ((clash ?? []).length) throw new Error(`The URL slug "${input.slug}" is already used by another product.`);

      let existing: { id: string; slug: string } | null = null;
      if (input.id) {
        if (!isUuid(input.id)) throw new Error("Product not found");
        const { data, error } = await sb.from("products").select("id, slug").eq("id", input.id).maybeSingle();
        if (error) fail(ctx, error);
        if (!data) throw new Error("Product not found");
        existing = data as { id: string; slug: string };
      }

      const fields = {
        slug: input.slug,
        name: input.name,
        botanical: input.botanical,
        tags: input.tags,
        light: input.light,
        care: input.care,
        size: input.size,
        height: input.height,
        water: input.water,
        pet_friendly: input.petFriendly,
        allows_planter: input.allowsPlanter,
        short_description: input.shortDescription,
        description: input.description,
        care_notes: input.careNotes,
        is_active: input.isActive,
      };

      let id: string;
      if (existing) {
        const { error } = await sb.from("products").update(fields).eq("id", existing.id);
        if (error) fail(ctx, error);
        id = existing.id;
      } else {
        const position = await countRows(ctx, sb.from("products").select("id", { count: "exact", head: true }));
        const { data, error } = await sb.from("products").insert({ ...fields, position }).select("id").single();
        if (error) fail(ctx, error);
        id = (data as { id: string }).id;
      }

      // Categories (replace).
      const delCats = await sb.from("product_categories").delete().eq("product_id", id);
      if (delCats.error) fail(ctx, delCats.error);
      const categoryIds = [...new Set(input.categoryIds)];
      if (categoryIds.length) {
        const ins = await sb.from("product_categories").insert(categoryIds.map((category_id) => ({ product_id: id, category_id })));
        if (ins.error) fail(ctx, ins.error);
      }

      // Images (replace; position 0 = primary).
      const delImgs = await sb.from("product_images").delete().eq("product_id", id);
      if (delImgs.error) fail(ctx, delImgs.error);
      if (input.images.length) {
        const ins = await sb
          .from("product_images")
          .insert(input.images.map((img, i) => ({ product_id: id, url: img.url, alt: img.alt, storage_path: img.storagePath ?? null, position: i })));
        if (ins.error) fail(ctx, ins.error);
      }

      // Variants: delete removed, update kept (by id), insert new.
      const { data: currentData, error: curErr } = await sb.from("product_variants").select("id, code").eq("product_id", id);
      if (curErr) fail(ctx, curErr);
      const current = (currentData ?? []) as { id: string; code: string }[];
      const currentById = new Map(current.map((v) => [v.id, v]));
      const keptIds = new Set(input.variants.map((v) => v.id).filter((vid): vid is string => !!vid && currentById.has(vid)));
      const removed = current.filter((v) => !keptIds.has(v.id)).map((v) => v.id);
      if (removed.length) {
        const del = await sb.from("product_variants").delete().in("id", removed);
        if (del.error) fail(ctx, del.error);
      }

      // Codes/SKUs are unique: if any kept variant changes code (or the slug
      // changes), park kept rows on temporary values first so swaps can't clash.
      const slugChanged = existing !== null && existing.slug !== input.slug;
      const codeChanged = input.variants.some((v) => v.id && keptIds.has(v.id) && currentById.get(v.id)?.code !== v.code);
      if (slugChanged || codeChanged) {
        for (const vid of keptIds) {
          const tmp = `tmp-${vid}`;
          const upd = await sb.from("product_variants").update({ code: tmp, sku: tmp.toUpperCase() }).eq("id", vid);
          if (upd.error) fail(ctx, upd.error);
        }
      }

      const inventory: { variant_id: string; quantity: number; low_stock_threshold: number }[] = [];
      for (const [i, v] of input.variants.entries()) {
        const row = {
          product_id: id,
          code: v.code,
          sku: `PS-${input.slug.toUpperCase()}-${v.code.toUpperCase()}`,
          label: v.label,
          detail: v.detail,
          price: v.price,
          compare_at_price: v.compareAtPrice,
          position: i,
          is_default: i === 0,
          is_active: v.isActive,
        };
        let variantId: string;
        if (v.id && keptIds.has(v.id)) {
          const upd = await sb.from("product_variants").update(row).eq("id", v.id);
          if (upd.error) fail(ctx, upd.error);
          variantId = v.id;
        } else {
          const { data, error } = await sb.from("product_variants").insert(row).select("id").single();
          if (error) fail(ctx, error);
          variantId = (data as { id: string }).id;
        }
        inventory.push({
          variant_id: variantId,
          quantity: Math.max(0, Math.floor(v.stock)),
          low_stock_threshold: Math.max(0, Math.floor(v.lowStockThreshold)),
        });
      }
      if (inventory.length) {
        const inv = await sb.from("inventory").upsert(inventory, { onConflict: "variant_id" });
        if (inv.error) fail(ctx, inv.error);
      }

      return { id, slug: input.slug };
    },

    async deleteProduct(productId) {
      if (!isUuid(productId)) return;
      const sb = createServiceClient();
      // Cascades to categories, images, variants, inventory, cart/wishlist items;
      // order_items keep their snapshot (product_id/variant_id set null).
      const { error } = await sb.from("products").delete().eq("id", productId);
      if (error) fail("Deleting the product", error);
    },

    async setStock(variantId, quantity) {
      if (!isUuid(variantId)) throw new Error("Variant not found");
      const sb = createServiceClient();
      const { data, error } = await sb.from("product_variants").select("id").eq("id", variantId).maybeSingle();
      if (error) fail("Updating stock", error);
      if (!data) throw new Error("Variant not found");
      const qty = Math.max(0, Math.floor(Number.isFinite(quantity) ? quantity : 0));
      const upd = await sb.from("inventory").upsert({ variant_id: variantId, quantity: qty }, { onConflict: "variant_id" });
      if (upd.error) fail("Updating stock", upd.error);
    },

    async upsertCategory(input) {
      const sb = createServiceClient();
      let position = input.position;
      if (position === undefined) {
        const { data, error } = await sb.from("categories").select("position").eq("id", input.id).maybeSingle();
        if (error) fail("Saving the category", error);
        position = (data as { position: number } | null)?.position
          ?? (await countRows("Saving the category", sb.from("categories").select("id", { count: "exact", head: true })));
      }
      const { error } = await sb.from("categories").upsert(
        {
          id: input.id,
          name: input.name,
          short_name: input.short,
          description: input.description,
          image_url: input.image,
          image_alt: input.imageAlt,
          position,
        },
        { onConflict: "id" },
      );
      if (error) fail("Saving the category", error);
    },

    async deleteCategory(categoryId) {
      const sb = createServiceClient();
      // product_categories rows cascade.
      const { error } = await sb.from("categories").delete().eq("id", categoryId);
      if (error) fail("Deleting the category", error);
    },

    async uploadProductImage(file) {
      const ext = IMAGE_TYPES[file.type];
      if (!ext) throw new Error("Please upload a JPEG, PNG, WebP or AVIF image.");
      if (file.size <= 0) throw new Error("The selected file is empty.");
      if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be 5 MB or smaller.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!sniffImage(bytes, file.type)) throw new Error("The file does not look like a valid image.");

      const storagePath = `products/${randomUUID()}.${ext}`;
      const sb = createServiceClient();
      const bucket = sb.storage.from("product-images");
      const { error } = await bucket.upload(storagePath, bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });
      if (error) {
        console.error("[supabase] image upload failed", error.name, error.message);
        throw new Error("Uploading the image failed. Please try again.");
      }
      const { data } = bucket.getPublicUrl(storagePath);
      return { url: data.publicUrl, storagePath };
    },

    async listNewsletter() {
      const sb = createServiceClient();
      const rows = await selectAll<{ email: string; status: string; source: string | null; created_at: string }>("Loading subscribers", (from, to) =>
        sb.from("newsletter_subscribers").select("email, status, source, created_at").order("created_at", { ascending: false }).order("id").range(from, to),
      );
      return rows.map((r) => ({ email: r.email, status: r.status, source: r.source ?? "", createdAt: r.created_at }));
    },
  },
};
