import { test, expect } from "@playwright/test";
import { readUsers, serviceClient } from "./env";
import { login } from "./helpers";

const SLUG = "monstera-deliciosa";

test.describe.serial("Customer journey", () => {
  const users = readUsers();
  const sb = serviceClient();

  test("profile and address", async ({ page }) => {
    await login(page, users.alice);
    const details = page.locator("section", { has: page.getByRole("heading", { name: "Your details" }) });
    await details.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Full name").fill("Alice Tester");
    await page.getByLabel("Mobile number").fill("9876543210");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(details.getByRole("button", { name: "Edit" })).toBeVisible();

    const addresses = page.locator("section", { has: page.getByRole("heading", { name: "Addresses" }) });
    await addresses.getByRole("button", { name: "Add" }).click();
    await addresses.getByLabel("Recipient name").fill("Alice Tester");
    await addresses.getByLabel("Mobile number").fill("9876543210");
    await page.getByLabel("Flat / house no., building, street").fill("12 Garden Lane");
    await page.getByLabel("City").fill("Bengaluru");
    await page.getByLabel("PIN code").fill("560001");
    await page.getByLabel("State").selectOption("Karnataka");
    await page.getByRole("button", { name: "Save address" }).click();
    await expect(addresses.getByText("12 Garden Lane")).toBeVisible();

    const { data: prof } = await sb.from("profiles").select("full_name, phone").eq("id", users.alice.id).single();
    expect(prof).toEqual({ full_name: "Alice Tester", phone: "9876543210" });
    const { data: addr } = await sb.from("addresses").select("city, postal_code").eq("user_id", users.alice.id);
    expect(addr).toEqual([{ city: "Bengaluru", postal_code: "560001" }]);
  });

  test("cart and wishlist persist to the account", async ({ page }) => {
    await login(page, users.alice);
    await page.goto(`/shop/${SLUG}`);
    await page.getByRole("button", { name: /add .* to wishlist/i }).first().click();
    await page.getByRole("button", { name: /^add to bag ·/i }).click();
    await expect.poll(async () => {
      const { data } = await sb.from("carts").select("cart_items(quantity)").eq("user_id", users.alice.id).maybeSingle();
      return (data?.cart_items as { quantity: number }[] | undefined)?.length ?? 0;
    }, { timeout: 20_000 }).toBe(1);
    await expect.poll(async () => {
      const { data } = await sb.from("wishlists").select("wishlist_items(product_id)").eq("user_id", users.alice.id).maybeSingle();
      return (data?.wishlist_items as unknown[] | undefined)?.length ?? 0;
    }, { timeout: 20_000 }).toBe(1);

    // A fresh browser (no local storage) gets the cart back from Supabase.
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await login(page, users.alice);
    await page.goto("/wishlist");
    await expect(page.getByText(/monstera/i).first()).toBeVisible();
  });

  test("demo checkout creates an order, decrements stock once", async ({ page }) => {
    const { data: variant } = await sb.from("product_variants").select("id, products!inner(slug)").eq("products.slug", SLUG).eq("is_default", true).single();
    const stockOf = async () => (await sb.from("inventory").select("quantity").eq("variant_id", variant!.id).single()).data!.quantity;
    const before = await stockOf();

    await login(page, users.alice, "/checkout");
    await page.goto("/checkout");
    const place = page.getByRole("button", { name: /place demo order/i });
    await expect(place).toBeEnabled({ timeout: 30_000 });
    await place.click();
    await expect(page.getByRole("heading", { name: /thank you/i })).toBeVisible({ timeout: 30_000 });

    const { data: orders } = await sb.from("orders").select("id, status, payment_status, payment_method, total, order_items(quantity, variant_id), payments(status)").eq("user_id", users.alice.id);
    expect(orders).toHaveLength(1);
    const o = orders![0];
    expect(o).toMatchObject({ status: "processing", payment_status: "demo_not_charged", payment_method: "demo" });
    expect(o.payments).toEqual([{ status: "demo_not_charged" }]);
    const qty = (o.order_items as { quantity: number; variant_id: string }[]).find((i) => i.variant_id === variant!.id)!.quantity;
    expect(await stockOf()).toBe(before - qty);

    // Order history page
    await page.goto("/account");
    await page.getByRole("link", { name: /PS-/ }).first().click();
    await expect(page.getByText(/monstera/i).first()).toBeVisible();

    // Bob cannot open Alice's order
    await page.context().clearCookies();
    await login(page, users.bob);
    const res = await page.goto(`/account/orders/${o.id}`);
    expect(res?.status() === 404 || !(await page.getByText(/monstera/i).first().isVisible())).toBeTruthy();
  });
});
