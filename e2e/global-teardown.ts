import fs from "node:fs";
import { USERS_FILE, readUsers, serviceClient } from "./env";

/** Removes everything the run created: test products, uploaded images, orders and users. */
export default async function globalTeardown() {
  if (!fs.existsSync(USERS_FILE)) return;
  const users = readUsers();
  const sb = serviceClient();
  const { data: prods } = await sb.from("products").select("id, product_images(storage_path)").like("slug", `e2e-${users.runId}%`);
  const paths = (prods ?? []).flatMap((p) => (p.product_images ?? []).map((i: { storage_path: string | null }) => i.storage_path)).filter(Boolean) as string[];
  if (paths.length) await sb.storage.from("product-images").remove(paths);
  if (prods?.length) await sb.from("products").delete().in("id", prods.map((p) => p.id));
  // Uploads from this run that never got attached to a product (e.g. a failed test).
  const { data: files } = await sb.storage.from("product-images").list("products", { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
  const { data: used } = await sb.from("product_images").select("storage_path").not("storage_path", "is", null);
  const usedSet = new Set((used ?? []).map((u) => u.storage_path));
  const orphans = (files ?? []).filter((f) => f.created_at && f.created_at >= users.startedAt).map((f) => `products/${f.name}`).filter((p) => !usedSet.has(p));
  if (orphans.length) await sb.storage.from("product-images").remove(orphans);
  for (const u of [users.admin, users.alice, users.bob]) {
    // Give back stock taken by finalised demo orders before deleting them.
    const { data: orders } = await sb.from("orders").select("id, status, order_items(variant_id, quantity)").eq("user_id", u.id);
    for (const o of orders ?? []) {
      if (o.status !== "processing") continue;
      for (const it of (o.order_items ?? []) as { variant_id: string | null; quantity: number }[]) {
        if (!it.variant_id) continue;
        const { data: inv } = await sb.from("inventory").select("quantity").eq("variant_id", it.variant_id).maybeSingle();
        if (inv) await sb.from("inventory").update({ quantity: inv.quantity + it.quantity }).eq("variant_id", it.variant_id);
      }
    }
    await sb.from("orders").delete().eq("user_id", u.id);
    await sb.auth.admin.deleteUser(u.id);
  }
  fs.rmSync(USERS_FILE);
}
