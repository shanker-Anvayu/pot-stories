"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Droplets, Leaf, Minus, PawPrint, Plus, Ruler, ShoppingBag, Sprout, Sun } from "lucide-react";
import { useState } from "react";
import { WishlistButton } from "./wishlist-button";
import { VariantPicker } from "./variant-picker";
import { useAddToCart } from "./use-add-to-cart";
import { MAX_QUANTITY, linePrice } from "@/lib/store";
import { careLabel, lightLabel, tagLabel } from "@/lib/products";
import type { CatalogProduct } from "@/lib/domain";
import { firstAvailableVariantCode, useCatalog, variantFor } from "@/components/providers/catalog-provider";
import { cn, formatPrice } from "@/lib/format";

export function ProductDetail({ product }: { product: CatalogProduct }) {
  const { planters } = useCatalog();
  const images = [{ src: product.image, alt: product.imageAlt }, ...product.gallery];
  const [active, setActive] = useState(0);
  const [variant, setVariant] = useState<string>(firstAvailableVariantCode(product));
  const [planter, setPlanter] = useState<string | null>(product.potOptions ? (planters[0]?.id ?? null) : null);
  const [quantity, setQuantity] = useState(1);
  const [openSection, setOpenSection] = useState<string | null>("care");
  const addToCart = useAddToCart();
  const unit = linePrice(product, variant, planter);
  const variantInfo = variantFor(product, variant);
  const soldOut = (variantInfo?.stock ?? 0) <= 0;
  const maxQty = Math.max(1, Math.min(MAX_QUANTITY, variantInfo?.stock ?? 1));

  const facts = [
    { icon: Sun, label: "Light", value: lightLabel[product.light] },
    { icon: Droplets, label: "Water", value: product.water },
    { icon: Sprout, label: "Care", value: careLabel[product.care] },
    { icon: Ruler, label: "Size", value: variantInfo?.detail ?? product.height },
    { icon: PawPrint, label: "Pets", value: product.petFriendly ? "Non-toxic to cats & dogs" : "Keep away from pets" },
  ];

  const sections = [
    {
      id: "care",
      title: "Care guide",
      content: (
        <ul className="space-y-2.5">
          {product.careNotes.map((note) => (
            <li key={note} className="flex gap-3">
              <Leaf className="mt-1 size-4 shrink-0 text-sage-600" aria-hidden />
              {note}
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "about",
      title: "About this plant",
      content: <p>{product.description}</p>,
    },
    {
      id: "delivery",
      title: "Delivery & packaging",
      content: (
        <p>
          Plants are packed upright in paper-first packaging to protect leaves and soil. This is a design preview, so no
          orders are dispatched — delivery details will be confirmed before launch.
        </p>
      ),
    },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      {/* Gallery */}
      <div className="lg:sticky lg:top-40 lg:self-start">
        <div className="grid gap-3 sm:grid-cols-[4.5rem_1fr]">
          {images.length > 1 && (
            <div className="order-2 flex gap-2.5 sm:order-1 sm:flex-col" role="group" aria-label="Product images">
              {images.map((img, i) => (
                <button
                  key={img.src}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show image ${i + 1}: ${img.alt}`}
                  aria-current={i === active}
                  className={cn(
                    "relative aspect-[5/7] w-16 overflow-hidden rounded-[8px] bg-card transition-all sm:w-full",
                    i === active ? "ring-2 ring-forest-900" : "opacity-60 hover:opacity-100",
                  )}
                >
                  <Image src={img.src} alt="" fill sizes="72px" className="object-cover mix-blend-multiply" />
                </button>
              ))}
            </div>
          )}
          <div className={cn("relative order-1 aspect-[5/7] overflow-hidden rounded-[14px] bg-card sm:order-2", images.length <= 1 && "sm:col-span-2")}>
            <AnimatePresence initial={false}>
              <motion.div
                key={images[active].src}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.26, 0.54, 0.32, 1] }}
              >
                <Image
                  src={images[active].src}
                  alt={images[active].alt}
                  fill
                  preload={active === 0}
                  quality={85}
                  sizes="(min-width: 1024px) 48vw, 100vw"
                  className="object-cover mix-blend-multiply"
                />
              </motion.div>
            </AnimatePresence>
            {product.compareAtPrice && (
              <span className="absolute top-3 right-3 rounded-full bg-clay px-3 py-1 text-[0.68rem] font-bold tracking-[0.06em] text-ivory uppercase">
                Sale
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div>
        <div className="flex flex-wrap gap-1.5">
          {product.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-sage-100 px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.04em] text-forest-800 uppercase">
              {tagLabel[t]}
            </span>
          ))}
        </div>
        <h1 className="display-heavy mt-4 text-[clamp(2.2rem,4.2vw,3.3rem)] text-forest-900">{product.name}</h1>
        <p className="mt-1.5 text-sm text-moss italic">{product.botanical}</p>

        <div className="mt-5 flex items-baseline gap-3">
          <motion.p key={unit} initial={{ opacity: 0.3, y: -3 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold text-forest-900">
            {formatPrice(unit)}
          </motion.p>
          {variantInfo?.compareAtPrice && (!planter || planter === "grower") && (
            <p className="text-moss line-through">
              <span className="sr-only">Was </span>
              {formatPrice(variantInfo.compareAtPrice)}
            </p>
          )}
        </div>
        <p className="mt-1 text-xs text-moss">Sample pricing for this design preview.</p>

        <p className="mt-6 leading-relaxed text-forest-800/85">{product.shortDescription}</p>

        <div className="mt-7">
          <VariantPicker
            product={product}
            variant={variant}
            onVariantChange={(code) => {
              setVariant(code);
              setQuantity(1);
            }}
            planter={planter}
            onPlanterChange={setPlanter}
            idPrefix="pdp"
          />
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full border border-forest-900/25 bg-card">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="grid size-12 place-items-center rounded-full text-forest-900 hover:bg-sage-100 disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-7 text-center font-semibold tabular-nums" aria-live="polite">
              <span className="sr-only">Quantity </span>
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty || soldOut}
              aria-label="Increase quantity"
              className="grid size-12 place-items-center rounded-full text-forest-900 hover:bg-sage-100 disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => {
              if (addToCart(product.slug, { variant, planter, quantity })) setQuantity(1);
            }}
            className="btn btn-primary min-w-0 flex-1 py-3.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="size-4" aria-hidden />
            {soldOut ? "Sold out" : <>Add to bag · {formatPrice(unit * quantity)}</>}
          </button>
          <WishlistButton slug={product.slug} name={product.name} variant="outline" />
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-[12px] bg-card p-3.5">
              <dt className="flex items-center gap-1.5 text-[0.66rem] font-bold tracking-[0.12em] text-moss uppercase">
                <Icon className="size-3.5" aria-hidden /> {label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-forest-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 border-t border-forest-900/15">
          {sections.map((section) => {
            const open = openSection === section.id;
            return (
              <div key={section.id} className="border-b border-forest-900/15">
                <h2>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`section-${section.id}`}
                    onClick={() => setOpenSection(open ? null : section.id)}
                    className="flex w-full items-center justify-between py-4 text-left text-[0.98rem] font-bold text-forest-900"
                  >
                    {section.title}
                    <Plus className={cn("size-4 transition-transform duration-300", open && "rotate-45")} aria-hidden />
                  </button>
                </h2>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={`section-${section.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.165, 0.84, 0.44, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pb-5 text-[0.93rem] leading-relaxed text-moss">{section.content}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
