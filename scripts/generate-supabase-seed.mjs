// Regenerates supabase/seed.sql from lib/products.ts.
// Usage: node scripts/generate-supabase-seed.mjs supabase/seed.sql   (Node 22.18+ strips TS types natively)
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { categories, potOptions, products } from "../lib/products.ts";

// RFC 4122 v5
const NS_URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
function v5(name, ns) {
  const nsBytes = Buffer.from(ns.replace(/-/g, ""), "hex");
  const h = createHash("sha1").update(Buffer.concat([nsBytes, Buffer.from(name, "utf8")])).digest();
  const b = h.subarray(0, 16);
  b[6] = (b[6] & 0x0f) | 0x50;
  b[8] = (b[8] & 0x3f) | 0x80;
  const x = b.toString("hex");
  return `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`;
}
const NS = v5("https://potstories.in/seed", NS_URL);
const q = (s) => s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`;
const arr = (a) => a.length ? `array[${a.map(q).join(", ")}]::text[]` : `'{}'::text[]`;
const STOCK = { "monstera-deliciosa/large": 4, "fiddle-leaf-fig/tall": 2, "juniper-bonsai/standard": 3, "boxwood-topiary/standard": 0 };

const out = [];
const p = (s) => out.push(s);
p(`-- Pot Stories — demo seed (generated from lib/products.ts; safe to re-run)
-- DEMONSTRATION CATALOGUE: sample content, not live inventory or real offers.
--
-- Deterministic ids (RFC 4122 UUID v5):
--   namespace  = uuid_v5(NS_URL, 'https://potstories.in/seed') = '${NS}'
--   product    = uuid_v5(namespace, 'product:' || slug)
--   variant    = uuid_v5(namespace, 'variant:' || slug || ':' || code)
--   image      = uuid_v5(namespace, 'image:' || slug || ':' || position)
-- e.g. select extensions.uuid_generate_v5('${NS}', 'product:monstera-deliciosa');
--
-- Re-running refreshes catalogue content but never resets inventory
-- quantities or discount-code redemptions.

begin;
`);

p(`-- Categories`);
p(`insert into public.categories (id, name, short_name, description, image_url, image_alt, position) values`);
p(categories.map((c, i) => `  (${q(c.id)}, ${q(c.name)}, ${q(c.short)}, ${q(c.description)}, ${q(c.image)}, ${q(c.imageAlt)}, ${i})`).join(",\n"));
p(`on conflict (id) do update set
  name = excluded.name, short_name = excluded.short_name, description = excluded.description,
  image_url = excluded.image_url, image_alt = excluded.image_alt, position = excluded.position;
`);

p(`-- Planters`);
p(`insert into public.planters (id, label, note, price, swatch, position, is_active) values`);
p(potOptions.map((o, i) => `  (${q(o.id)}, ${q(o.label)}, ${q(o.note)}, ${o.price}, ${q(o.swatch)}, ${i}, true)`).join(",\n"));
p(`on conflict (id) do update set
  label = excluded.label, note = excluded.note, price = excluded.price,
  swatch = excluded.swatch, position = excluded.position;
`);

const pc = [], imgs = [], vars = [], inv = [];
const report = [];
p(`-- Products`);
p(`insert into public.products (id, slug, name, botanical, tags, light, care, size, height, water, pet_friendly, allows_planter, short_description, description, care_notes, is_active, position) values`);
p(products.map((pr, i) => {
  const id = v5(`product:${pr.slug}`, NS);
  pr.categories.forEach((c) => pc.push(`  (${q(id)}, ${q(c)})`));
  const images = [{ src: pr.image, alt: pr.imageAlt }, ...pr.gallery];
  images.forEach((im, pos) => imgs.push(`  (${q(v5(`image:${pr.slug}:${pos}`, NS))}, ${q(id)}, ${q(im.src)}, ${q(im.alt)}, null, ${pos})`));
  const opts = pr.sizeOptions?.length
    ? pr.sizeOptions.map((o) => ({ code: o.id, label: o.label, detail: o.detail, price: pr.price + o.priceDelta }))
    : [{ code: "standard", label: "Standard", detail: pr.height, price: pr.price }];
  const rep = [];
  opts.forEach((o, pos) => {
    const vid = v5(`variant:${pr.slug}:${o.code}`, NS);
    const def = pos === 0;
    const cap = def && pr.compareAtPrice != null ? pr.compareAtPrice : null;
    if (cap != null && !(cap > o.price)) throw new Error("compare_at_price check fails " + pr.slug);
    const sku = `PS-${pr.slug.toUpperCase()}-${o.code.toUpperCase()}`;
    vars.push(`  (${q(vid)}, ${q(id)}, ${q(o.code)}, ${q(sku)}, ${q(o.label)}, ${q(o.detail)}, ${o.price}, ${cap ?? "null"}, ${pos}, ${def}, true)`);
    const qty = STOCK[`${pr.slug}/${o.code}`] ?? 18;
    inv.push(`  (${q(vid)}, ${qty}, 5)`);
    rep.push(`${o.code}=${o.price}${cap ? `(cmp ${cap})` : ""}/qty ${qty}`);
  });
  report.push(`${i}. ${pr.slug}: ${opts.length} variant(s) — ${rep.join(", ")}`);
  return `  (${q(id)}, ${q(pr.slug)}, ${q(pr.name)}, ${q(pr.botanical)}, ${arr(pr.tags)}, ${q(pr.light)}, ${q(pr.care)}, ${q(pr.size)}, ${q(pr.height)}, ${q(pr.water)}, ${pr.petFriendly}, ${pr.potOptions}, ${q(pr.shortDescription)}, ${q(pr.description)}, ${arr(pr.careNotes)}, true, ${i})`;
}).join(",\n"));
p(`on conflict (id) do update set
  slug = excluded.slug, name = excluded.name, botanical = excluded.botanical, tags = excluded.tags,
  light = excluded.light, care = excluded.care, size = excluded.size, height = excluded.height,
  water = excluded.water, pet_friendly = excluded.pet_friendly, allows_planter = excluded.allows_planter,
  short_description = excluded.short_description, description = excluded.description,
  care_notes = excluded.care_notes, position = excluded.position;
`);

p(`-- Product categories`);
p(`insert into public.product_categories (product_id, category_id) values`);
p(pc.join(",\n"));
p(`on conflict do nothing;
`);

p(`-- Product images (position 0 = primary)`);
p(`insert into public.product_images (id, product_id, url, alt, storage_path, position) values`);
p(imgs.join(",\n"));
p(`on conflict (id) do update set
  url = excluded.url, alt = excluded.alt, position = excluded.position;
`);

p(`-- Product variants`);
p(`insert into public.product_variants (id, product_id, code, sku, label, detail, price, compare_at_price, position, is_default, is_active) values`);
p(vars.join(",\n"));
p(`on conflict (id) do update set
  code = excluded.code, sku = excluded.sku, label = excluded.label, detail = excluded.detail,
  price = excluded.price, compare_at_price = excluded.compare_at_price,
  position = excluded.position, is_default = excluded.is_default;
`);

p(`-- Inventory (initial stock only; existing quantities are left untouched)`);
p(`insert into public.inventory (variant_id, quantity, low_stock_threshold) values`);
p(inv.join(",\n"));
p(`on conflict (variant_id) do nothing;
`);

p(`-- Demo discount code
insert into public.discount_codes (code, kind, value, min_subtotal, description, is_active)
values ('DEMO10', 'percent', 10, 0, 'Demo code for this preview — 10% off', true)
on conflict (code) do nothing;

commit;
`);

writeFileSync(process.argv[2], out.join("\n"), "utf8");
console.log(`products=${products.length} categories=${categories.length} planters=${potOptions.length} pc=${pc.length} images=${imgs.length} variants=${vars.length} inventory=${inv.length}`);
console.log(report.join("\n"));
