import "server-only";
import type {
  Address,
  AddressInput,
  BackendMode,
  CartLineInput,
  Catalog,
  DiscountCode,
  Order,
  OrderStatus,
  Payment,
  PaymentMode,
  PaymentRecordStatus,
  Profile,
  SessionUser,
  ShippingAddress,
} from "@/lib/domain";
import type { Category } from "@/lib/products";

export type AuthResult = { ok: true; user: SessionUser } | { ok: false; error: string; needsConfirmation?: boolean };

export interface NewOrderInput {
  orderNumber: string;
  userId: string;
  email: string;
  phone: string;
  fullName: string;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMode;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  discountCode: string | null;
  idempotencyKey: string;
  notes: string | null;
  items: {
    productId: string;
    variantId: string;
    planterId: string | null;
    productSlug: string;
    productName: string;
    variantLabel: string;
    planterLabel: string | null;
    imageUrl: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
}

export interface NewPaymentInput {
  orderId: string;
  provider: PaymentMode;
  providerOrderId: string | null;
  amount: number;
  status: PaymentRecordStatus;
}

export type FinalizeResult = "finalized" | "already_finalized" | "insufficient_stock";

export interface AdminStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  /** Sum of totals for orders whose payment was verified (payment_status = paid). */
  verifiedRevenue: number;
  demoOrders: number;
  lowStock: { productName: string; slug: string; variantLabel: string; variantId: string; stock: number; threshold: number }[];
  customers: number;
  newsletterSubscribers: number;
}

export interface CustomerSummary {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: Profile["role"];
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

export interface ProductUpsertInput {
  id?: string;
  slug: string;
  name: string;
  botanical: string;
  categoryIds: string[];
  tags: string[];
  light: "low" | "medium" | "bright";
  care: "easy" | "moderate" | "expert";
  size: "small" | "medium" | "large";
  height: string;
  water: string;
  petFriendly: boolean;
  allowsPlanter: boolean;
  shortDescription: string;
  description: string;
  careNotes: string[];
  isActive: boolean;
  images: { url: string; alt: string; storagePath?: string | null }[];
  variants: {
    id?: string;
    code: string;
    label: string;
    detail: string;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    lowStockThreshold: number;
    isActive: boolean;
  }[];
}

export interface Backend {
  readonly mode: BackendMode;

  /* Catalogue (public) */
  getCatalog(options?: { includeInactive?: boolean }): Promise<Catalog>;
  getDiscountCode(code: string): Promise<DiscountCode | null>;

  /* Authentication (reads/writes the request's cookies) */
  getSessionUser(): Promise<SessionUser | null>;
  signUp(input: { email: string; password: string; fullName: string }): Promise<AuthResult>;
  signIn(input: { email: string; password: string }): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Sends (or, in demo mode, returns) a reset link. Never reveals whether the email exists. */
  requestPasswordReset(email: string, redirectTo: string): Promise<{ demoResetUrl?: string }>;
  /** Supabase: requires the recovery session from /auth/callback. Demo: requires a valid token. */
  resetPassword(input: { password: string; token?: string }): Promise<AuthResult>;

  /* Customer-scoped data — callers MUST pass the authenticated user's id. */
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, input: { fullName: string; phone: string | null }): Promise<Profile>;
  listAddresses(userId: string): Promise<Address[]>;
  saveAddress(userId: string, input: AddressInput): Promise<Address>;
  deleteAddress(userId: string, addressId: string): Promise<void>;

  getCart(userId: string): Promise<CartLineInput[]>;
  replaceCart(userId: string, lines: CartLineInput[]): Promise<void>;
  getWishlist(userId: string): Promise<string[]>;
  replaceWishlist(userId: string, slugs: string[]): Promise<void>;

  findOrderByIdempotencyKey(userId: string, key: string): Promise<Order | null>;
  createOrder(input: NewOrderInput): Promise<Order>;
  listOrdersForUser(userId: string): Promise<Order[]>;
  getOrderForUser(userId: string, orderId: string): Promise<Order | null>;
  cancelPendingOrder(userId: string, orderId: string): Promise<boolean>;

  /* Payments — server-side only. */
  addPayment(input: NewPaymentInput): Promise<Payment>;
  getPaymentByProviderOrderId(providerOrderId: string): Promise<Payment | null>;
  getOrderById(orderId: string): Promise<Order | null>;
  markPaymentFailed(paymentId: string, input: { providerPaymentId?: string | null; errorCode?: string | null; errorDescription?: string | null; raw?: unknown }): Promise<void>;
  finalizeOrder(
    orderId: string,
    input: { paymentId: string; paymentStatus: "paid" | "demo_not_charged"; providerPaymentId?: string | null; recordStatus: PaymentRecordStatus; raw?: unknown },
  ): Promise<FinalizeResult>;

  /* Newsletter */
  subscribeNewsletter(email: string, source: string): Promise<"subscribed" | "already_subscribed">;

  /* Admin — callers MUST verify the admin role first (lib/server/auth.ts requireAdmin). */
  admin: {
    stats(): Promise<AdminStats>;
    listOrders(filter: { query?: string; status?: OrderStatus | "all"; payment?: string }): Promise<Order[]>;
    getOrder(orderId: string): Promise<Order | null>;
    updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
    listCustomers(): Promise<CustomerSummary[]>;
    getCustomer(userId: string): Promise<{ customer: CustomerSummary; orders: Order[]; addresses: Address[] } | null>;
    upsertProduct(input: ProductUpsertInput): Promise<{ id: string; slug: string }>;
    deleteProduct(productId: string): Promise<void>;
    setStock(variantId: string, quantity: number): Promise<void>;
    upsertCategory(input: Category & { position?: number }): Promise<void>;
    deleteCategory(categoryId: string): Promise<void>;
    uploadProductImage(file: File): Promise<{ url: string; storagePath: string }>;
    listNewsletter(): Promise<{ email: string; status: string; source: string; createdAt: string }[]>;
  };
}
