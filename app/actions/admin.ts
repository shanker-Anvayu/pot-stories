"use server";

import { updateTag } from "next/cache";
import type { ActionResult, CatalogProduct, OrderStatus } from "@/lib/domain";
import type { Category, CategoryId } from "@/lib/products";
import { tagLabel } from "@/lib/products";
import { AuthError, requireAdmin } from "@/lib/server/auth";
import { getBackend } from "@/lib/server/backend";
import type { ProductUpsertInput } from "@/lib/server/backend/types";
import { CATALOG_TAG, getFreshCatalog } from "@/lib/server/catalog";
import { env } from "@/lib/server/env";
import { ALLOWED_TRANSITIONS } from "@/components/admin/order-transitions";

/*
 * Admin Server Actions. Every export is a public HTTP endpoint, so each one
 * re-verifies the admin role on the server and validates every input by hand.
 * Nothing here trusts ids, prices or URLs sent from the browser.
 */

type Fail = { ok: false; error: string; fieldErrors?: Record<string, string> };

const fail = (error: string, fieldErrors?: Record<string, string>): Fail => ({ ok: false, error, ...(fieldErrors ? { fieldErrors } : {}) });

async function guard(): Promise<Fail | null> {
  try {
    await requireAdmin();
    return null;
  } catch (e) {
    if (e instanceof AuthError) return fail(e.message);
    return fail("Could not verify your session. Please sign in again.");
  }
}

const safeError = (e: unknown, fallback: string) => {
  // Backend errors we raise ourselves are user-facing sentences; anything else is hidden.
  if (e instanceof Error && /^[A-Z][^\n]{3,200}$/.test(e.message) && !/supabase|postgres|sql|jwt|key/i.test(e.message)) return e.message;
  return fallback;
};

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VARIANT_CODE = /^[a-z0-9-]{1,30}$/;
const ID = /^[A-Za-z0-9_-]{1,100}$/;
const LIGHTS = ["low", "medium", "bright"] as const;
const CARES = ["easy", "moderate", "expert"] as const;
const SIZES = ["small", "medium", "large"] as const;
const TAGS = Object.keys(tagLabel);
const MAX_STOCK = 100_000;
const MAX_PRICE = 10_000_000;
const DEMO_UPLOAD = /^\/api\/demo-uploads\/([a-f0-9-]{36}\.[a-z0-9]{2,5})$/;
const SUPABASE_BUCKET_PATH = "/storage/v1/object/public/product-images/";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function str(v: unknown, field: string, errors: Record<string, string>, opts: { max: number; required?: boolean; label?: string }) {
  const label = opts.label ?? "This field";
  if (v !== undefined && v !== null && typeof v !== "string") {
    errors[field] = `${label} is invalid.`;
    return "";
  }
  const s = (v ?? "").trim();
  if (opts.required && !s) errors[field] = `${label} is required.`;
  else if (s.length > opts.max) errors[field] = `${label} must be ${opts.max} characters or fewer.`;
  return s;
}

function int(v: unknown, field: string, errors: Record<string, string>, opts: { min: number; max: number; label: string }) {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n)) {
    errors[field] = `${opts.label} must be a whole number.`;
    return 0;
  }
  if (n < opts.min || n > opts.max) {
    errors[field] = `${opts.label} must be between ${opts.min.toLocaleString("en-IN")} and ${opts.max.toLocaleString("en-IN")}.`;
    return 0;
  }
  return n;
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], field: string, errors: Record<string, string>, label: string): T {
  if (typeof v === "string" && (allowed as readonly string[]).includes(v)) return v as T;
  errors[field] = `Choose a valid ${label}.`;
  return allowed[0];
}

function bool(v: unknown) {
  return v === true || v === "true" || v === "on";
}

/** Only our own image hosts are accepted. */
function checkImageUrl(raw: string): { ok: true; storagePath: string | null } | { ok: false } {
  const demo = DEMO_UPLOAD.exec(raw);
  if (demo) return { ok: true, storagePath: demo[1] };
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false };
  }
  if (url.username || url.password) return { ok: false };
  if (url.protocol === "https:" && url.hostname === "images.unsplash.com" && url.pathname.length > 1) return { ok: true, storagePath: null };
  if (env.supabaseUrl) {
    try {
      const base = new URL(env.supabaseUrl);
      if (url.protocol === base.protocol && url.host === base.host && url.pathname.startsWith(SUPABASE_BUCKET_PATH)) {
        const path = decodeURIComponent(url.pathname.slice(SUPABASE_BUCKET_PATH.length));
        if (path && !path.includes("..")) return { ok: true, storagePath: path };
      }
    } catch {
      /* misconfigured env — fall through */
    }
  }
  return { ok: false };
}

const IMAGE_HOST_HINT = "Use an uploaded image, an images.unsplash.com URL or this shop's Supabase storage URL.";

/* ------------------------------------------------------------------ */
/* Products                                                            */
/* ------------------------------------------------------------------ */

async function validateProduct(raw: unknown): Promise<{ input: ProductUpsertInput } | { errors: Record<string, string> }> {
  const errors: Record<string, string> = {};
  if (!isObj(raw)) return { errors: { form: "Invalid submission." } };

  let id: string | undefined;
  if (raw.id !== undefined && raw.id !== null && raw.id !== "") {
    if (typeof raw.id !== "string" || !ID.test(raw.id)) errors.form = "Invalid product id.";
    else id = raw.id;
  }

  const name = str(raw.name, "name", errors, { max: 120, required: true, label: "Name" });
  const slug = str(raw.slug, "slug", errors, { max: 80, required: true, label: "URL slug" });
  if (slug && !errors.slug && !SLUG.test(slug)) errors.slug = "Use lowercase letters, numbers and single hyphens (e.g. snake-plant).";
  const botanical = str(raw.botanical, "botanical", errors, { max: 120, label: "Botanical name" });
  const height = str(raw.height, "height", errors, { max: 60, label: "Height" });
  const water = str(raw.water, "water", errors, { max: 120, label: "Watering" });
  const shortDescription = str(raw.shortDescription, "shortDescription", errors, { max: 300, required: true, label: "Short description" });
  const description = str(raw.description, "description", errors, { max: 5000, required: true, label: "Description" });

  const light = oneOf(raw.light, LIGHTS, "light", errors, "light level");
  const care = oneOf(raw.care, CARES, "care", errors, "care level");
  const size = oneOf(raw.size, SIZES, "size", errors, "size");

  // Categories must exist.
  const catalog = await getFreshCatalog(true);
  const knownCategories = new Set(catalog.categories.map((c) => c.id as string));
  let categoryIds: string[] = [];
  if (!Array.isArray(raw.categoryIds) || raw.categoryIds.some((c) => typeof c !== "string")) errors.categoryIds = "Choose at least one category.";
  else {
    categoryIds = [...new Set(raw.categoryIds as string[])];
    if (categoryIds.length === 0) errors.categoryIds = "Choose at least one category.";
    else if (categoryIds.some((c) => !knownCategories.has(c))) errors.categoryIds = "One of the chosen categories no longer exists.";
  }

  let tags: string[] = [];
  if (!Array.isArray(raw.tags) || raw.tags.some((t) => typeof t !== "string" || !TAGS.includes(t))) errors.tags = "Choose tags from the list.";
  else tags = [...new Set(raw.tags as string[])];

  let careNotes: string[] = [];
  if (!Array.isArray(raw.careNotes) || raw.careNotes.some((n) => typeof n !== "string")) errors.careNotes = "Care notes are invalid.";
  else {
    careNotes = (raw.careNotes as string[]).map((n) => n.trim()).filter(Boolean);
    if (careNotes.length > 12) errors.careNotes = "Keep it to 12 care notes or fewer.";
    else if (careNotes.some((n) => n.length > 300)) errors.careNotes = "Each care note must be 300 characters or fewer.";
  }

  const images: ProductUpsertInput["images"] = [];
  if (!Array.isArray(raw.images)) errors.images = "Images are invalid.";
  else if (raw.images.length === 0) errors.images = "Add at least one image.";
  else if (raw.images.length > 12) errors.images = "Use 12 images or fewer.";
  else
    raw.images.forEach((img, i) => {
      if (!isObj(img)) {
        errors[`images.${i}.url`] = "Invalid image.";
        return;
      }
      const url = str(img.url, `images.${i}.url`, errors, { max: 1000, required: true, label: "Image URL" });
      const alt = str(img.alt, `images.${i}.alt`, errors, { max: 200, required: true, label: "Alt text" });
      if (url && !errors[`images.${i}.url`]) {
        const check = checkImageUrl(url);
        if (!check.ok) errors[`images.${i}.url`] = IMAGE_HOST_HINT;
        else images.push({ url, alt, storagePath: check.storagePath });
      }
    });

  const variants: ProductUpsertInput["variants"] = [];
  if (!Array.isArray(raw.variants) || raw.variants.length === 0) errors.variants = "Add at least one variant.";
  else if (raw.variants.length > 20) errors.variants = "Use 20 variants or fewer.";
  else {
    const codes = new Set<string>();
    raw.variants.forEach((v, i) => {
      const p = `variants.${i}`;
      if (!isObj(v)) {
        errors[`${p}.code`] = "Invalid variant.";
        return;
      }
      let vid: string | undefined;
      if (v.id !== undefined && v.id !== null && v.id !== "") {
        if (typeof v.id !== "string" || !ID.test(v.id)) errors[`${p}.code`] = "Invalid variant id.";
        else vid = v.id;
      }
      const code = str(v.code, `${p}.code`, errors, { max: 30, required: true, label: "Code" });
      if (code && !errors[`${p}.code`]) {
        if (!VARIANT_CODE.test(code)) errors[`${p}.code`] = "Lowercase letters, numbers and hyphens only.";
        else if (codes.has(code)) errors[`${p}.code`] = "Each variant needs a unique code.";
        codes.add(code);
      }
      const label = str(v.label, `${p}.label`, errors, { max: 60, required: true, label: "Label" });
      const detail = str(v.detail, `${p}.detail`, errors, { max: 120, label: "Detail" });
      const price = int(v.price, `${p}.price`, errors, { min: 1, max: MAX_PRICE, label: "Price" });
      let compareAtPrice: number | null = null;
      if (v.compareAtPrice !== null && v.compareAtPrice !== undefined && v.compareAtPrice !== "") {
        compareAtPrice = int(v.compareAtPrice, `${p}.compareAtPrice`, errors, { min: 1, max: MAX_PRICE, label: "Compare-at price" });
        if (!errors[`${p}.compareAtPrice`] && !errors[`${p}.price`] && compareAtPrice <= price)
          errors[`${p}.compareAtPrice`] = "Compare-at price must be higher than the price (or left empty).";
      }
      const stock = int(v.stock, `${p}.stock`, errors, { min: 0, max: MAX_STOCK, label: "Stock" });
      const lowStockThreshold = int(v.lowStockThreshold, `${p}.lowStockThreshold`, errors, { min: 0, max: MAX_STOCK, label: "Low-stock threshold" });
      variants.push({ id: vid, code, label, detail, price, compareAtPrice, stock, lowStockThreshold, isActive: bool(v.isActive) });
    });
  }

  // Updating: the product must exist, and variant ids must belong to it.
  if (id) {
    const existing = catalog.products.find((p) => p.id === id);
    if (!existing) errors.form = "This product no longer exists.";
    else {
      const own = new Set(existing.variants.map((v) => v.id));
      if (variants.some((v) => v.id && !own.has(v.id))) errors.variants = "A variant does not belong to this product. Reload and try again.";
    }
  } else if (variants.some((v) => v.id)) {
    variants.forEach((v) => (v.id = undefined));
  }
  if (slug && !errors.slug && catalog.products.some((p) => p.slug === slug && p.id !== id)) errors.slug = "Another product already uses this slug.";

  if (Object.keys(errors).length) return { errors };
  return {
    input: {
      id,
      slug,
      name,
      botanical,
      categoryIds,
      tags,
      light,
      care,
      size,
      height,
      water,
      petFriendly: bool(raw.petFriendly),
      allowsPlanter: bool(raw.allowsPlanter),
      shortDescription,
      description,
      careNotes,
      isActive: bool(raw.isActive),
      images,
      variants,
    },
  };
}

export async function saveProduct(raw: unknown): Promise<ActionResult<{ id: string; slug: string }>> {
  const denied = await guard();
  if (denied) return denied;
  const result = await validateProduct(raw);
  if ("errors" in result) {
    return fail(result.errors.form ?? "Please fix the highlighted fields.", result.errors);
  }
  try {
    const backend = await getBackend();
    const saved = await backend.admin.upsertProduct(result.input);
    updateTag(CATALOG_TAG);
    return { ok: true, data: saved };
  } catch (e) {
    return fail(safeError(e, "We couldn't save this product. Please try again."));
  }
}

/** Rebuilds the full upsert payload from the stored product (used for partial updates). */
function toUpsertInput(p: CatalogProduct): ProductUpsertInput {
  const images = [{ src: p.image, alt: p.imageAlt }, ...p.gallery].map((img) => {
    const check = checkImageUrl(img.src);
    return { url: img.src, alt: img.alt, storagePath: check.ok ? check.storagePath : null };
  });
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    botanical: p.botanical,
    categoryIds: p.categories,
    tags: p.tags,
    light: p.light,
    care: p.care,
    size: p.size,
    height: p.height,
    water: p.water,
    petFriendly: p.petFriendly,
    allowsPlanter: p.potOptions,
    shortDescription: p.shortDescription,
    description: p.description,
    careNotes: p.careNotes,
    isActive: p.isActive,
    images,
    variants: [...p.variants]
      .sort((a, b) => a.position - b.position)
      .map((v) => ({
        id: v.id,
        code: v.code,
        label: v.label,
        detail: v.detail,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        stock: v.stock,
        lowStockThreshold: v.lowStockThreshold,
        isActive: v.isActive,
      })),
  };
}

export async function toggleProductActive(productId: unknown, active: unknown): Promise<ActionResult<{ isActive: boolean }>> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof productId !== "string" || !ID.test(productId) || typeof active !== "boolean") return fail("Invalid request.");
  try {
    const catalog = await getFreshCatalog(true);
    const product = catalog.products.find((p) => p.id === productId);
    if (!product) return fail("This product no longer exists.");
    const backend = await getBackend();
    await backend.admin.upsertProduct({ ...toUpsertInput(product), isActive: active });
    updateTag(CATALOG_TAG);
    return { ok: true, data: { isActive: active } };
  } catch (e) {
    return fail(safeError(e, "We couldn't update this product."));
  }
}

export async function deleteProduct(productId: unknown): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof productId !== "string" || !ID.test(productId)) return fail("Invalid product.");
  try {
    const catalog = await getFreshCatalog(true);
    if (!catalog.products.some((p) => p.id === productId)) return fail("This product no longer exists.");
    const backend = await getBackend();
    await backend.admin.deleteProduct(productId);
    updateTag(CATALOG_TAG);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(safeError(e, "We couldn't delete this product."));
  }
}

export async function setStock(variantId: unknown, quantity: unknown): Promise<ActionResult<{ stock: number }>> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof variantId !== "string" || !ID.test(variantId)) return fail("Invalid variant.");
  const errors: Record<string, string> = {};
  const stock = int(quantity, "stock", errors, { min: 0, max: MAX_STOCK, label: "Stock" });
  if (errors.stock) return fail(errors.stock, errors);
  try {
    const backend = await getBackend();
    await backend.admin.setStock(variantId, stock);
    updateTag(CATALOG_TAG);
    return { ok: true, data: { stock } };
  } catch (e) {
    return fail(safeError(e, "We couldn't update stock."));
  }
}

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Checks the file's magic bytes so a renamed file can't masquerade as an image. */
function sniff(bytes: Uint8Array): string | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (b.length >= 12 && ascii(4, 8) === "ftyp" && /^avi[fs]$/.test(ascii(8, 12))) return "image/avif";
  return null;
}

export async function uploadProductImage(formData: FormData): Promise<ActionResult<{ url: string; storagePath: string }>> {
  const denied = await guard();
  if (denied) return denied;
  if (!(formData instanceof FormData)) return fail("Invalid upload.");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image to upload.", { file: "Choose an image to upload." });
  if (file.size > MAX_UPLOAD_BYTES) return fail("Images must be 5 MB or smaller.", { file: "Images must be 5 MB or smaller." });
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) return fail("Use a JPEG, PNG, WebP or AVIF image.", { file: "Use a JPEG, PNG, WebP or AVIF image." });
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (sniff(head) !== file.type) return fail("That file doesn't look like a valid image.", { file: "That file doesn't look like a valid image." });
  try {
    // Re-wrap with a server-chosen name so the client filename never reaches storage.
    const safe = new File([file], `upload.${ext}`, { type: file.type });
    const backend = await getBackend();
    const result = await backend.admin.uploadProductImage(safe);
    return { ok: true, data: result };
  } catch (e) {
    return fail(safeError(e, "The upload failed. Please try again."));
  }
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export async function saveCategory(raw: unknown, mode: unknown): Promise<ActionResult<{ id: string }>> {
  const denied = await guard();
  if (denied) return denied;
  if (!isObj(raw) || (mode !== "create" && mode !== "update")) return fail("Invalid submission.");
  const errors: Record<string, string> = {};
  const id = str(raw.id, "id", errors, { max: 40, required: true, label: "Category id" });
  if (id && !errors.id && !SLUG.test(id)) errors.id = "Use lowercase letters, numbers and single hyphens.";
  const name = str(raw.name, "name", errors, { max: 80, required: true, label: "Name" });
  const short = str(raw.short, "short", errors, { max: 30, required: true, label: "Short name" });
  const description = str(raw.description, "description", errors, { max: 300, label: "Description" });
  const image = str(raw.image, "image", errors, { max: 1000, required: true, label: "Image URL" });
  if (image && !errors.image && !checkImageUrl(image).ok) errors.image = IMAGE_HOST_HINT;
  const imageAlt = str(raw.imageAlt, "imageAlt", errors, { max: 200, required: true, label: "Alt text" });

  try {
    const catalog = await getFreshCatalog(true);
    const exists = catalog.categories.some((c) => c.id === id);
    if (mode === "create" && exists) errors.id = "A category with this id already exists.";
    if (mode === "update" && !exists) errors.id = "This category no longer exists.";
    if (Object.keys(errors).length) return fail("Please fix the highlighted fields.", errors);
    const backend = await getBackend();
    // Category ids are free-form slugs in the database; the CategoryId union only types the seed set.
    const category: Category = { id: id as CategoryId, name, short, description, image, imageAlt };
    await backend.admin.upsertCategory(category);
    updateTag(CATALOG_TAG);
    return { ok: true, data: { id } };
  } catch (e) {
    return fail(safeError(e, "We couldn't save this category."));
  }
}

export async function deleteCategory(categoryId: unknown): Promise<ActionResult> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof categoryId !== "string" || !SLUG.test(categoryId)) return fail("Invalid category.");
  try {
    const catalog = await getFreshCatalog(true);
    if (!catalog.categories.some((c) => c.id === categoryId)) return fail("This category no longer exists.");
    const backend = await getBackend();
    await backend.admin.deleteCategory(categoryId);
    updateTag(CATALOG_TAG);
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(safeError(e, "We couldn't delete this category."));
  }
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export async function updateOrderStatus(orderId: unknown, next: unknown): Promise<ActionResult<{ status: OrderStatus }>> {
  const denied = await guard();
  if (denied) return denied;
  if (typeof orderId !== "string" || !ID.test(orderId)) return fail("Invalid order.");
  if (typeof next !== "string") return fail("Invalid status.");
  try {
    const backend = await getBackend();
    const order = await backend.admin.getOrder(orderId);
    if (!order) return fail("This order no longer exists.");
    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!(allowed as string[]).includes(next)) return fail("That status change isn't allowed for this order.");
    // Payment state is only ever changed by verified payment flows, never from admin.
    await backend.admin.updateOrderStatus(orderId, next as OrderStatus);
    // Cancelling/shipping doesn't change catalogue stock here, so no catalogue tag update.
    return { ok: true, data: { status: next as OrderStatus } };
  } catch (e) {
    return fail(safeError(e, "We couldn't update this order."));
  }
}
