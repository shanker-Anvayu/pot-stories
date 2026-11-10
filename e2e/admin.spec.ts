import { test, expect } from "@playwright/test";
import { readUsers, serviceClient } from "./env";
import { login } from "./helpers";

// 1×1 PNG (valid magic bytes; the server sniffs file content).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaPhfDwAEhgGAqgaN8wAAAABJRU5ErkJggg==", "base64");

test.describe.serial("Admin product management", () => {
  const users = readUsers();
  const sb = serviceClient();
  const slug = `e2e-${users.runId}-fern`;
  let productId = "";

  test("create product with price, stock and two uploaded images", async ({ page }) => {
    await login(page, users.admin, "/admin");
    await page.goto("/admin/products/new");
    await page.getByRole("textbox", { name: "Name", exact: true }).fill(`E2E Fern ${users.runId}`);
    await page.getByRole("textbox", { name: "URL slug" }).fill(slug);
    await page.getByRole("textbox", { name: "Short description" }).fill("A test fern created by the e2e suite.");
    await page.getByRole("textbox", { name: "Description", exact: true }).fill("Created by automated tests; removed at the end of the run.");

    const upload = page.locator('input[type="file"]');
    for (const name of ["one.png", "two.png"]) {
      await upload.setInputFiles({ name, mimeType: "image/png", buffer: PNG });
      await expect(page.getByText("Uploading…")).toHaveCount(0, { timeout: 30_000 });
    }
    await expect(page.getByRole("textbox", { name: "Image 2 URL" })).toHaveValue(/supabase\.co\/storage\/v1\/object\/public\/product-images\//);
    await page.getByRole("textbox", { name: "Image 2 alt text" }).fill("Second test photo");

    await page.getByRole("spinbutton", { name: "Price ₹" }).first().fill("749");
    await page.getByRole("spinbutton", { name: "Stock", exact: true }).first().fill("12");
    await page.getByRole("checkbox", { name: "Indoor Plants" }).check();
    await page.getByRole("checkbox", { name: /^Active/ }).check();
    await page.getByRole("button", { name: "Create product" }).click();
    await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}/, { timeout: 30_000 });
    productId = page.url().match(/products\/([0-9a-f-]{36})/)![1];

    const { data } = await sb.from("products").select("slug, product_images(storage_path, position), product_variants(price, inventory(quantity))").eq("id", productId).single();
    expect(data!.slug).toBe(slug);
    expect(data!.product_images).toHaveLength(2);
    expect(data!.product_images.every((i: { storage_path: string | null }) => i.storage_path?.startsWith("products/"))).toBe(true);
    expect(data!.product_variants[0].price).toBe(749);
    expect((data!.product_variants[0].inventory as unknown as { quantity: number }).quantity).toBe(12);
  });

  test("new product appears on the storefront", async ({ page }) => {
    await expect.poll(async () => (await page.goto(`/shop/${slug}`))?.status(), { timeout: 90_000, intervals: [3000] }).toBe(200);
    await expect(page.getByRole("heading", { name: `E2E Fern ${users.runId}` })).toBeVisible();
    await expect(page.getByText("₹749").first()).toBeVisible();
  });

  test("edit price and stock", async ({ page }) => {
    await login(page, users.admin, `/admin/products/${productId}`);
    await page.goto(`/admin/products/${productId}`);
    await page.getByRole("spinbutton", { name: "Price ₹" }).first().fill("899");
    await page.getByRole("spinbutton", { name: "Stock", exact: true }).first().fill("3");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 30_000 });
    const { data } = await sb.from("product_variants").select("price, inventory(quantity)").eq("product_id", productId).single();
    expect(data!.price).toBe(899);
    expect((data!.inventory as unknown as { quantity: number }).quantity).toBe(3);
  });

  test("admin dashboard, orders and customers load", async ({ page }) => {
    await login(page, users.admin, "/admin");
    for (const p of ["/admin", "/admin/orders", "/admin/customers", "/admin/products", "/admin/categories", "/admin/newsletter"]) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBe(200);
      await expect(page.getByRole("alert").filter({ hasText: /failed|error/i })).toHaveCount(0);
    }
    await page.goto("/admin/customers");
    await expect(page.getByText(users.alice.email).first()).toBeVisible();
  });
});
