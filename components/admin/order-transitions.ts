import type { OrderStatus } from "@/lib/domain";

/**
 * Order status changes an admin may make. Payment state is never changed from
 * admin — only verified payment flows mark an order as paid.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
