/**
 * Domain types shared by server and client code.
 * Money is integer rupees (INR). See docs/backend/data-model.md.
 */
import type { Category, Product } from "./products";

export type BackendMode = "demo" | "supabase";
export type PaymentMode = "demo" | "razorpay";
export type Role = "customer" | "admin";

export interface Variant {
  id: string;
  /** Stable per-product code, e.g. "medium" or "standard". Used by carts. */
  code: string;
  sku: string;
  label: string;
  detail: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  isDefault: boolean;
  isActive: boolean;
  position: number;
}

export interface Planter {
  id: string;
  label: string;
  note: string;
  price: number;
  swatch: string;
  position: number;
  isActive: boolean;
}

/**
 * Storefront product: the editorial Product shape the UI already uses, with
 * price/sizes derived from database variants, plus stock.
 */
export interface CatalogProduct extends Product {
  id: string;
  variants: Variant[];
  /** Sum of active variant stock. */
  stock: number;
  isActive: boolean;
}

export interface Catalog {
  products: CatalogProduct[];
  categories: Category[];
  planters: Planter[];
  /** ISO timestamp of when this snapshot was read. */
  generatedAt: string;
}

/** What the browser sends: identifiers only, never prices. */
export interface CartLineInput {
  slug: string;
  variant: string;
  planter: string | null;
  quantity: number;
}

export interface PricedLine extends CartLineInput {
  productId: string;
  variantId: string;
  name: string;
  variantLabel: string;
  planterLabel: string | null;
  image: string;
  unitPrice: number;
  lineTotal: number;
  available: number;
}

export interface QuoteIssue {
  slug: string;
  variant: string;
  kind: "unavailable" | "out_of_stock" | "insufficient_stock" | "planter_unavailable";
  message: string;
  available?: number;
}

export interface Quote {
  lines: PricedLine[];
  issues: QuoteIssue[];
  subtotal: number;
  discount: number;
  discountCode: string | null;
  discountMessage: string | null;
  deliveryFee: number;
  total: number;
  currency: "INR";
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: Role;
  createdAt: string;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export type AddressInput = Omit<Address, "id" | "country"> & { id?: string };

export type OrderStatus = "pending_payment" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "demo_not_charged";
export type PaymentRecordStatus = "created" | "authorized" | "captured" | "failed" | "refunded" | "demo_not_charged";

export interface OrderItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  planterId: string | null;
  productSlug: string;
  productName: string;
  variantLabel: string;
  planterLabel: string | null;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentMode;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  amount: number;
  currency: string;
  status: PaymentRecordStatus;
  errorCode: string | null;
  errorDescription: string | null;
  createdAt: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  email: string;
  phone: string;
  fullName: string;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMode;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  currency: string;
  discountCode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: Payment[];
}

export interface DiscountCode {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  maxRedemptions: number | null;
  redemptions: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  description: string;
}

export const ORDER_STATUSES: OrderStatus[] = ["pending_payment", "processing", "shipped", "delivered", "cancelled"];

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid (verified)",
  failed: "Failed",
  refunded: "Refunded",
  demo_not_charged: "Demo — not charged",
};

/** Result type for server actions: never throw raw errors to the client. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };
