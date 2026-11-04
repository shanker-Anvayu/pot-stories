import "server-only";
import { createHmac, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type {
  Address,
  CartLineInput,
  Catalog,
  DiscountCode,
  Order,
  Payment,
  Planter,
  Profile,
  SessionUser,
  Variant,
} from "@/lib/domain";
import type { Category } from "@/lib/products";
import { env, isReadOnlyPreview, PREVIEW_DISABLED_MESSAGE } from "../env";
import { buildSeed, seedCategories } from "./seed";
import { sortPlanters, toCatalogProduct, type ProductRow } from "./shape";
import type { AdminStats, AuthResult, Backend, CustomerSummary } from "./types";

/**
 * LOCAL DEMO BACKEND — for previewing the full shopping flow without external
 * services. Data lives in `.data/demo-db.json` (gitignored). Not for production.
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "demo-db.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const SESSION_COOKIE = "ps_demo_session";
const SESSION_TTL_S = 60 * 60 * 24 * 30;

interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  fullName: string | null;
  phone: string | null;
  role: "customer" | "admin";
  createdAt: string;
}

interface DB {
  version: 1;
  sessionSecret: string;
  users: UserRow[];
  categories: (Category & { position: number })[];
  products: ProductRow[];
  variants: (Variant & { productId: string })[];
  planters: Planter[];
  discountCodes: DiscountCode[];
  addresses: (Address & { userId: string; createdAt: string })[];
  carts: Record<string, CartLineInput[]>;
  wishlists: Record<string, string[]>;
  orders: (Omit<Order, "payments"> & { idempotencyKey: string })[];
  payments: Payment[];
  newsletter: { email: string; status: string; source: string; createdAt: string }[];
  resetTokens: { tokenHash: string; userId: string; expiresAt: number }[];
}

/* ------------------------------------------------------------------ */
/* Storage                                                              */
/* ------------------------------------------------------------------ */

async function hashPassword(password: string, salt = randomBytes(16)) {
  const hash = await scrypt(password, salt, 64);
  return { passwordHash: hash.toString("hex"), salt: salt.toString("hex") };
}

async function verifyPassword(password: string, user: UserRow) {
  const hash = await scrypt(password, Buffer.from(user.salt, "hex"), 64);
  const expected = Buffer.from(user.passwordHash, "hex");
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}

async function createSeedDb(): Promise<DB> {
  const seed = buildSeed();
  const db: DB = {
    version: 1,
    sessionSecret: randomBytes(32).toString("hex"),
    users: [],
    categories: seedCategories().map((c, i) => ({ ...c, position: i })),
    products: seed.productRows,
    variants: seed.variants,
    planters: seed.planters,
    discountCodes: seed.discountCodes,
    addresses: [],
    carts: {},
    wishlists: {},
    orders: [],
    payments: [],
    newsletter: [],
    resetTokens: [],
  };
  // No accounts at all in the read-only preview (even if DEMO_ADMIN_* is set).
  if (!isReadOnlyPreview()) await ensureDemoAdmin(db);
  return db;
}

/** Seeds an admin account from DEMO_ADMIN_EMAIL / DEMO_ADMIN_PASSWORD (if set). */
async function ensureDemoAdmin(db: DB) {
  const email = env.demoAdminEmail?.toLowerCase();
  const password = env.demoAdminPassword;
  if (!email || !password) return false;
  const existing = db.users.find((u) => u.email === email);
  if (existing) {
    if (existing.role === "admin") return false;
    existing.role = "admin";
    return true;
  }
  db.users.push({
    id: randomUUID(),
    email,
    ...(await hashPassword(password)),
    fullName: "Demo Admin",
    phone: null,
    role: "admin",
    createdAt: new Date().toISOString(),
  });
  return true;
}

let lock: Promise<unknown> = Promise.resolve();

/** Thrown by every write in the read-only preview (see isReadOnlyPreview). */
export class PreviewReadOnlyError extends Error {
  constructor() {
    super(PREVIEW_DISABLED_MESSAGE);
    this.name = "PreviewReadOnlyError";
  }
}

/** In read-only preview the seeded catalogue is built once per server instance. */
let previewSeed: Promise<DB> | null = null;

async function load(): Promise<DB> {
  if (isReadOnlyPreview()) {
    // Never touch the filesystem: serverless storage is read-only and not shared.
    previewSeed ??= createSeedDb();
    return structuredClone(await previewSeed);
  }
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as DB;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // First run: seed lazily on the first write; reads use an in-memory seed.
    return createSeedDb();
  }
}

async function persist(db: DB) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 1), "utf8");
  await fs.rename(tmp, DB_FILE);
}

/** Read-only snapshot. */
async function read<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  return fn(await load());
}

/** Serialised read-modify-write. */
function write<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  if (isReadOnlyPreview()) return Promise.reject(new PreviewReadOnlyError());
  const run = lock.then(async () => {
    const db = await load();
    if (await ensureDemoAdmin(db)) {
      /* admin env changed — persisted below */
    }
    const result = await fn(db);
    await persist(db);
    return result;
  });
  lock = run.catch(() => undefined);
  return run;
}

/* ------------------------------------------------------------------ */
/* Sessions (signed cookie)                                             */
/* ------------------------------------------------------------------ */

/** Per-instance key for the read-only preview, where no session is ever issued. */
const previewSecret = randomBytes(32).toString("hex");

async function secret() {
  if (env.sessionSecret) return env.sessionSecret;
  if (isReadOnlyPreview()) return previewSecret;
  // Persist a generated secret so sessions survive restarts in local demo use.
  const db = await load();
  try {
    await fs.access(DB_FILE);
  } catch {
    await write(() => undefined);
    return (await load()).sessionSecret;
  }
  return db.sessionSecret;
}

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

async function setSession(userId: string) {
  const payload = b64(JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S }));
  const value = `${payload}.${sign(payload, await secret())}`;
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && env.siteUrl.startsWith("https"),
    path: "/",
    maxAge: SESSION_TTL_S,
  });
}

async function readSession(): Promise<string | null> {
  // No accounts exist in the read-only preview, so no cookie can be valid.
  if (isReadOnlyPreview()) return null;
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload, await secret());
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { uid: string; exp: number };
    return exp * 1000 > Date.now() ? uid : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const toSessionUser = (u: UserRow): SessionUser => ({ id: u.id, email: u.email, fullName: u.fullName, role: u.role });
const toProfile = (u: UserRow): Profile => ({ id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role, createdAt: u.createdAt });

function withPayments(db: DB, o: DB["orders"][number]): Order {
  const { idempotencyKey: _key, ...order } = o;
  void _key;
  return { ...order, payments: db.payments.filter((p) => p.orderId === o.id) };
}

function buildCatalog(db: DB, includeInactive: boolean): Catalog {
  const products = db.products
    .filter((p) => includeInactive || p.isActive)
    .sort((a, b) => a.position - b.position)
    .map((row) =>
      toCatalogProduct(
        row,
        db.variants.filter((v) => v.productId === row.id).map(({ productId: _p, ...v }) => (void _p, v)),
      ),
    );
  return {
    products,
    categories: [...db.categories].sort((a, b) => a.position - b.position).map(({ position: _p, ...c }) => (void _p, c)),
    planters: sortPlanters(db.planters.filter((p) => includeInactive || p.isActive)),
    generatedAt: new Date().toISOString(),
  };
}

function customerSummary(db: DB, u: UserRow): CustomerSummary {
  const orders = db.orders.filter((o) => o.userId === u.id);
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role,
    createdAt: u.createdAt,
    orderCount: orders.length,
    totalSpent: orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Backend                                                              */
/* ------------------------------------------------------------------ */

export const demoBackend: Backend = {
  mode: "demo",

  getCatalog: (options) => read((db) => buildCatalog(db, options?.includeInactive ?? false)),

  getDiscountCode: (code) => read((db) => db.discountCodes.find((d) => d.code === code.trim().toUpperCase()) ?? null),

  async getSessionUser() {
    const uid = await readSession();
    if (!uid) return null;
    return read((db) => {
      const u = db.users.find((x) => x.id === uid);
      return u ? toSessionUser(u) : null;
    });
  },

  async signUp({ email, password, fullName }) {
    const normalized = email.trim().toLowerCase();
    const result = await write<AuthResult>(async (db) => {
      if (db.users.some((u) => u.email === normalized)) return { ok: false, error: "An account with this email already exists." };
      const user: UserRow = {
        id: randomUUID(),
        email: normalized,
        ...(await hashPassword(password)),
        fullName: fullName.trim() || null,
        phone: null,
        role: "customer",
        createdAt: new Date().toISOString(),
      };
      db.users.push(user);
      return { ok: true, user: toSessionUser(user) };
    });
    if (result.ok) await setSession(result.user.id);
    return result;
  },

  async signIn({ email, password }) {
    const normalized = email.trim().toLowerCase();
    // write() so that DEMO_ADMIN_* changes are applied before checking.
    const user = await write((db) => db.users.find((u) => u.email === normalized) ?? null);
    if (!user || !(await verifyPassword(password, user))) return { ok: false, error: "Incorrect email or password." };
    await setSession(user.id);
    return { ok: true, user: toSessionUser(user) };
  },

  async signOut() {
    (await cookies()).delete(SESSION_COOKIE);
  },

  async requestPasswordReset(email, redirectTo) {
    const normalized = email.trim().toLowerCase();
    const token = randomBytes(24).toString("base64url");
    const found = await write((db) => {
      const u = db.users.find((x) => x.email === normalized);
      if (!u) return false;
      db.resetTokens = db.resetTokens.filter((t) => t.expiresAt > Date.now() && t.userId !== u.id);
      db.resetTokens.push({ tokenHash: sign(token, "reset"), userId: u.id, expiresAt: Date.now() + 30 * 60 * 1000 });
      return true;
    });
    // Demo mode has no email service: the link is surfaced on screen (clearly labelled).
    return found ? { demoResetUrl: `${redirectTo}?token=${token}` } : {};
  },

  async resetPassword({ password, token }) {
    if (!token) return { ok: false, error: "This reset link is invalid or has expired." };
    const res = await write<AuthResult>(async (db) => {
      const entry = db.resetTokens.find((t) => t.tokenHash === sign(token, "reset") && t.expiresAt > Date.now());
      const user = entry && db.users.find((u) => u.id === entry.userId);
      if (!entry || !user) return { ok: false, error: "This reset link is invalid or has expired." };
      Object.assign(user, await hashPassword(password));
      db.resetTokens = db.resetTokens.filter((t) => t !== entry);
      return { ok: true, user: toSessionUser(user) };
    });
    if (res.ok) await setSession(res.user.id);
    return res;
  },

  getProfile: (userId) => read((db) => {
    const u = db.users.find((x) => x.id === userId);
    return u ? toProfile(u) : null;
  }),

  updateProfile: (userId, input) =>
    write((db) => {
      const u = db.users.find((x) => x.id === userId);
      if (!u) throw new Error("Profile not found");
      u.fullName = input.fullName.trim() || null;
      u.phone = input.phone?.trim() || null;
      return toProfile(u);
    }),

  listAddresses: (userId) =>
    read((db) =>
      db.addresses
        .filter((a) => a.userId === userId)
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
        .map(({ userId: _u, createdAt: _c, ...a }) => (void _u, void _c, a)),
    ),

  saveAddress: (userId, input) =>
    write((db) => {
      const mine = db.addresses.filter((a) => a.userId === userId);
      const makeDefault = input.isDefault || mine.length === 0;
      if (makeDefault) mine.forEach((a) => (a.isDefault = false));
      const existing = input.id ? mine.find((a) => a.id === input.id) : undefined;
      if (input.id && !existing) throw new Error("Address not found");
      const record = {
        ...(existing ?? { id: randomUUID(), userId, createdAt: new Date().toISOString() }),
        label: input.label,
        fullName: input.fullName,
        phone: input.phone,
        line1: input.line1,
        line2: input.line2,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: "IN",
        isDefault: makeDefault,
      };
      if (existing) Object.assign(existing, record);
      else db.addresses.push(record);
      const { userId: _u, createdAt: _c, ...address } = record;
      void _u;
      void _c;
      return address;
    }),

  deleteAddress: (userId, addressId) =>
    write((db) => {
      db.addresses = db.addresses.filter((a) => !(a.userId === userId && a.id === addressId));
    }),

  getCart: (userId) => read((db) => db.carts[userId] ?? []),
  replaceCart: (userId, lines) =>
    write((db) => {
      db.carts[userId] = lines;
    }),
  getWishlist: (userId) => read((db) => db.wishlists[userId] ?? []),
  replaceWishlist: (userId, slugs) =>
    write((db) => {
      db.wishlists[userId] = slugs;
    }),

  findOrderByIdempotencyKey: (userId, key) =>
    read((db) => {
      const o = db.orders.find((x) => x.userId === userId && x.idempotencyKey === key);
      return o ? withPayments(db, o) : null;
    }),

  createOrder: (input) =>
    write((db) => {
      const now = new Date().toISOString();
      const { items, idempotencyKey, ...rest } = input;
      const order: DB["orders"][number] = {
        ...rest,
        id: randomUUID(),
        idempotencyKey,
        currency: "INR",
        status: "pending_payment",
        paymentStatus: "pending",
        createdAt: now,
        updatedAt: now,
        items: items.map((i) => ({ ...i, id: randomUUID() })),
      };
      db.orders.push(order);
      return withPayments(db, order);
    }),

  listOrdersForUser: (userId) =>
    read((db) =>
      db.orders
        .filter((o) => o.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((o) => withPayments(db, o)),
    ),

  getOrderForUser: (userId, orderId) =>
    read((db) => {
      const o = db.orders.find((x) => x.id === orderId && x.userId === userId);
      return o ? withPayments(db, o) : null;
    }),

  cancelPendingOrder: (userId, orderId) =>
    write((db) => {
      const o = db.orders.find((x) => x.id === orderId && x.userId === userId);
      if (!o || o.status !== "pending_payment" || o.paymentStatus === "paid") return false;
      o.status = "cancelled";
      o.updatedAt = new Date().toISOString();
      return true;
    }),

  addPayment: (input) =>
    write((db) => {
      const now = new Date().toISOString();
      const payment: Payment = {
        id: randomUUID(),
        orderId: input.orderId,
        provider: input.provider,
        providerOrderId: input.providerOrderId,
        providerPaymentId: null,
        amount: input.amount,
        currency: "INR",
        status: input.status,
        errorCode: null,
        errorDescription: null,
        createdAt: now,
      };
      db.payments.push(payment);
      return payment;
    }),

  getPaymentByProviderOrderId: (providerOrderId) => read((db) => db.payments.find((p) => p.providerOrderId === providerOrderId) ?? null),

  getOrderById: (orderId) =>
    read((db) => {
      const o = db.orders.find((x) => x.id === orderId);
      return o ? withPayments(db, o) : null;
    }),

  markPaymentFailed: (paymentId, input) =>
    write((db) => {
      const p = db.payments.find((x) => x.id === paymentId);
      if (!p || p.status === "captured") return;
      p.status = "failed";
      p.providerPaymentId = input.providerPaymentId ?? p.providerPaymentId;
      p.errorCode = input.errorCode ?? null;
      p.errorDescription = input.errorDescription ?? null;
      const o = db.orders.find((x) => x.id === p.orderId);
      if (o && o.paymentStatus === "pending") {
        o.paymentStatus = "failed";
        o.updatedAt = new Date().toISOString();
      }
    }),

  finalizeOrder: (orderId, input) =>
    write((db) => {
      const o = db.orders.find((x) => x.id === orderId);
      if (!o) throw new Error("Order not found");
      if (o.paymentStatus === "paid" || o.paymentStatus === "demo_not_charged") return "already_finalized" as const;
      const payment = db.payments.find((p) => p.id === input.paymentId && p.orderId === orderId);
      if (payment) {
        payment.status = input.recordStatus;
        payment.providerPaymentId = input.providerPaymentId ?? payment.providerPaymentId;
      }
      // Check every line first, then decrement (all-or-nothing).
      const needs = new Map<string, number>();
      for (const item of o.items) if (item.variantId) needs.set(item.variantId, (needs.get(item.variantId) ?? 0) + item.quantity);
      for (const [variantId, qty] of needs) {
        const v = db.variants.find((x) => x.id === variantId);
        if (!v || v.stock < qty) return "insufficient_stock" as const;
      }
      for (const [variantId, qty] of needs) {
        const v = db.variants.find((x) => x.id === variantId);
        if (v) v.stock -= qty;
      }
      if (o.discountCode) {
        const d = db.discountCodes.find((x) => x.code === o.discountCode);
        if (d) d.redemptions += 1;
      }
      o.paymentStatus = input.paymentStatus;
      o.status = "processing";
      o.updatedAt = new Date().toISOString();
      if (o.userId) db.carts[o.userId] = [];
      return "finalized" as const;
    }),

  subscribeNewsletter: (email, source) =>
    write((db) => {
      const normalized = email.trim().toLowerCase();
      const existing = db.newsletter.find((n) => n.email === normalized);
      if (existing && existing.status === "subscribed") return "already_subscribed" as const;
      if (existing) existing.status = "subscribed";
      else db.newsletter.push({ email: normalized, status: "subscribed", source, createdAt: new Date().toISOString() });
      return "subscribed" as const;
    }),

  admin: {
    stats: () =>
      read((db): AdminStats => {
        const lowStock = db.variants
          .filter((v) => v.isActive && v.stock <= v.lowStockThreshold)
          .map((v) => {
            const p = db.products.find((x) => x.id === v.productId);
            return { productName: p?.name ?? "Unknown", slug: p?.slug ?? "", variantLabel: v.label, variantId: v.id, stock: v.stock, threshold: v.lowStockThreshold };
          })
          .sort((a, b) => a.stock - b.stock);
        return {
          totalProducts: db.products.length,
          activeProducts: db.products.filter((p) => p.isActive).length,
          totalOrders: db.orders.length,
          pendingOrders: db.orders.filter((o) => o.status === "pending_payment" || o.status === "processing").length,
          verifiedRevenue: db.orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.total, 0),
          demoOrders: db.orders.filter((o) => o.paymentStatus === "demo_not_charged").length,
          lowStock,
          customers: db.users.filter((u) => u.role === "customer").length,
          newsletterSubscribers: db.newsletter.filter((n) => n.status === "subscribed").length,
        };
      }),

    listOrders: ({ query, status, payment }) =>
      read((db) => {
        const q = query?.trim().toLowerCase();
        return db.orders
          .filter((o) => !status || status === "all" || o.status === status)
          .filter((o) => !payment || payment === "all" || o.paymentStatus === payment)
          .filter((o) => !q || o.orderNumber.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.fullName.toLowerCase().includes(q))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((o) => withPayments(db, o));
      }),

    getOrder: (orderId) =>
      read((db) => {
        const o = db.orders.find((x) => x.id === orderId);
        return o ? withPayments(db, o) : null;
      }),

    updateOrderStatus: (orderId, status) =>
      write((db) => {
        const o = db.orders.find((x) => x.id === orderId);
        if (!o) throw new Error("Order not found");
        o.status = status;
        o.updatedAt = new Date().toISOString();
      }),

    listCustomers: () =>
      read((db) => db.users.map((u) => customerSummary(db, u)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),

    getCustomer: (userId) =>
      read((db) => {
        const u = db.users.find((x) => x.id === userId);
        if (!u) return null;
        return {
          customer: customerSummary(db, u),
          orders: db.orders.filter((o) => o.userId === userId).map((o) => withPayments(db, o)),
          addresses: db.addresses.filter((a) => a.userId === userId).map(({ userId: _u, createdAt: _c, ...a }) => (void _u, void _c, a)),
        };
      }),

    upsertProduct: (input) =>
      write((db) => {
        const slugTaken = db.products.find((p) => p.slug === input.slug && p.id !== input.id);
        if (slugTaken) throw new Error(`The URL slug "${input.slug}" is already used by another product.`);
        const existing = input.id ? db.products.find((p) => p.id === input.id) : undefined;
        if (input.id && !existing) throw new Error("Product not found");
        const id = existing?.id ?? `prod_${randomUUID()}`;
        const row: ProductRow = {
          id,
          slug: input.slug,
          name: input.name,
          botanical: input.botanical,
          categoryIds: input.categoryIds,
          tags: input.tags,
          light: input.light,
          care: input.care,
          size: input.size,
          height: input.height,
          water: input.water,
          petFriendly: input.petFriendly,
          allowsPlanter: input.allowsPlanter,
          shortDescription: input.shortDescription,
          description: input.description,
          careNotes: input.careNotes,
          isActive: input.isActive,
          position: existing?.position ?? db.products.length,
          images: input.images.map((img, i) => ({ url: img.url, alt: img.alt, storagePath: img.storagePath ?? null, position: i })),
        };
        if (existing) Object.assign(existing, row);
        else db.products.push(row);

        const keep = new Set<string>();
        input.variants.forEach((v, i) => {
          const current = v.id ? db.variants.find((x) => x.id === v.id && x.productId === id) : undefined;
          const codeClash = db.variants.find((x) => x.productId === id && x.code === v.code && x.id !== current?.id);
          if (codeClash) throw new Error(`Two variants share the code "${v.code}".`);
          const record = {
            id: current?.id ?? `var_${randomUUID()}`,
            productId: id,
            code: v.code,
            sku: `PS-${input.slug.toUpperCase()}-${v.code.toUpperCase()}`,
            label: v.label,
            detail: v.detail,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
            isDefault: i === 0,
            isActive: v.isActive,
            position: i,
          };
          keep.add(record.id);
          if (current) Object.assign(current, record);
          else db.variants.push(record);
        });
        db.variants = db.variants.filter((v) => v.productId !== id || keep.has(v.id));
        return { id, slug: input.slug };
      }),

    deleteProduct: (productId) =>
      write((db) => {
        db.products = db.products.filter((p) => p.id !== productId);
        db.variants = db.variants.filter((v) => v.productId !== productId);
      }),

    setStock: (variantId, quantity) =>
      write((db) => {
        const v = db.variants.find((x) => x.id === variantId);
        if (!v) throw new Error("Variant not found");
        v.stock = Math.max(0, Math.floor(quantity));
      }),

    upsertCategory: (input) =>
      write((db) => {
        const existing = db.categories.find((c) => c.id === input.id);
        const record = { ...input, position: input.position ?? existing?.position ?? db.categories.length };
        if (existing) Object.assign(existing, record);
        else db.categories.push(record);
      }),

    deleteCategory: (categoryId) =>
      write((db) => {
        db.categories = db.categories.filter((c) => c.id !== categoryId);
        db.products.forEach((p) => (p.categoryIds = p.categoryIds.filter((c) => c !== categoryId)));
      }),

    async uploadProductImage(file) {
      if (isReadOnlyPreview()) throw new PreviewReadOnlyError();
      const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const name = `${randomUUID()}.${ext || "jpg"}`;
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
      return { url: `/api/demo-uploads/${name}`, storagePath: name };
    },

    listNewsletter: () => read((db) => [...db.newsletter].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
  },
};

/** Used by the demo upload route to stream stored files safely. */
export async function readDemoUpload(name: string) {
  if (!/^[a-f0-9-]{36}\.[a-z0-9]{2,5}$/.test(name)) return null;
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}
