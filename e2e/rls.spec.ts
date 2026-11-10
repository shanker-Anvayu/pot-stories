import { test, expect } from "@playwright/test";
import { anonClient, readUsers, serviceClient, userClient } from "./env";

/** Row level security checked directly against the Supabase Data API. */
test.describe("RLS", () => {
  const users = readUsers();

  test.beforeAll(async () => {
    const sb = serviceClient();
    await sb.from("addresses").insert({ user_id: users.bob.id, label: "Home", full_name: "Bob", phone: "9876543210", line1: "1 Test St", city: "Pune", state: "Maharashtra", postal_code: "411001" });
  });

  test("anonymous: catalogue readable, private tables not", async () => {
    const sb = anonClient();
    const { data: products } = await sb.from("products").select("id").limit(1);
    expect(products?.length).toBe(1);
    for (const t of ["profiles", "orders", "payments", "addresses", "discount_codes", "newsletter_subscribers"]) {
      const { data, error } = await sb.from(t).select("*").limit(1);
      expect(error ?? (data?.length === 0 ? "empty" : null), t).toBeTruthy();
    }
    const ins = await sb.from("products").insert({ slug: "x", name: "x", short_description: "x", description: "x" });
    expect(ins.error).toBeTruthy();
    const nl = await sb.from("newsletter_subscribers").insert({ email: "anon@example.com" });
    expect(nl.error).toBeTruthy();
  });

  test("customer cannot read another customer's data", async () => {
    const sb = await userClient(users.alice);
    const addr = await sb.from("addresses").select("*").eq("user_id", users.bob.id);
    expect(addr.data ?? []).toHaveLength(0);
    const prof = await sb.from("profiles").select("*");
    expect((prof.data ?? []).map((p) => p.id)).toEqual([users.alice.id]);
    const ord = await sb.from("orders").select("id").neq("user_id", users.alice.id);
    expect(ord.data ?? []).toHaveLength(0);
  });

  test("customer cannot escalate or write server-only tables", async () => {
    const sb = await userClient(users.alice);
    const role = await sb.from("profiles").update({ role: "admin" }).eq("id", users.alice.id);
    expect(role.error?.code).toBe("42501");
    const order = await sb.from("orders").insert({ order_number: "PS-HACK", email: users.alice.email, full_name: "x", shipping_address: {}, status: "processing", payment_status: "paid", payment_method: "demo", subtotal: 1, discount: 0, delivery_fee: 0, total: 1, idempotency_key: "hack", user_id: users.alice.id });
    expect(order.error).toBeTruthy();
    const { data: v } = await sb.from("inventory").select("variant_id, quantity").limit(1).single();
    const inv = await sb.from("inventory").update({ quantity: 9999 }).eq("variant_id", v!.variant_id).select();
    expect(inv.data ?? []).toHaveLength(0);
    const rpc = await sb.rpc("finalize_order", { p_order_id: crypto.randomUUID(), p_payment: { payment_status: "paid" } });
    expect(rpc.error).toBeTruthy();
    const upload = await sb.storage.from("product-images").upload(`products/hack-${Date.now()}.png`, new Uint8Array([137, 80, 78, 71]), { contentType: "image/png" });
    expect(upload.error).toBeTruthy();
    const disc = await sb.from("discount_codes").select("*");
    expect(disc.data ?? []).toHaveLength(0);
  });

  test("customer can manage own address", async () => {
    const sb = await userClient(users.alice);
    const ins = await sb.from("addresses").insert({ user_id: users.alice.id, label: "Home", full_name: "Alice", phone: "9876543210", line1: "2 Test St", city: "Pune", state: "Maharashtra", postal_code: "411001" }).select().single();
    expect(ins.error).toBeNull();
    const spoof = await sb.from("addresses").insert({ user_id: users.bob.id, label: "x", full_name: "x", phone: "9876543210", line1: "x", city: "x", state: "x", postal_code: "411001" });
    expect(spoof.error).toBeTruthy();
    await sb.from("addresses").delete().eq("id", ins.data!.id);
  });

  test("admin can read across customers", async () => {
    const sb = await userClient(users.admin);
    const prof = await sb.from("profiles").select("id").in("id", [users.alice.id, users.bob.id]);
    expect(prof.data ?? []).toHaveLength(2);
    const disc = await sb.from("discount_codes").select("code");
    expect((disc.data ?? []).length).toBeGreaterThan(0);
  });
});
