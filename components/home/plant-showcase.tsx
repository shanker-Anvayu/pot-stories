"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { ArrowRight, Check, Droplets, Pause, Play, ShoppingBag, Sprout, Sun } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAddToCart } from "@/components/product/use-add-to-cart";
import { firstAvailableVariantCode, stockState, useCatalog } from "@/components/providers/catalog-provider";
import { easeOutExpo } from "@/components/motion/text-reveal";
import { LeafShape } from "@/components/ui/botanical";
import { showcaseSlugs } from "@/lib/content";
import { careLabel, hasPriceRange, lightLabel } from "@/lib/products";
import type { CatalogProduct } from "@/lib/domain";
import { cn, formatPrice } from "@/lib/format";

/** Seconds each plant stays on stage while rotating. */
const SLIDE_SECONDS = 6;

const shortName = (p: CatalogProduct) => p.name.split(/[\s‘]/)[0];
const firstSentence = (text: string) => {
  const s = text.split(". ")[0];
  return s.endsWith(".") ? s : `${s}.`;
};

/**
 * Signature plant showcase — one fixed scene (arched alcove, plinth, floor
 * shadow) where only the plant changes.
 * - Plants crossfade with a soft blur/scale (1.1s) and float gently (6.5s loop).
 * - Name rises through a mask; price, persona, description and the
 *   light / water / care cards swap with staggered slides.
 * - Rotates every 6s with filling progress bars; pauses off-screen, on
 *   pause, on keyboard focus, and never autoplays for reduced motion.
 * - Prices and stock come from the live catalogue; add-to-bag uses the first
 *   in-stock variant.
 */
export function PlantShowcase() {
  const { bySlug } = useCatalog();
  const items = useMemo(
    () =>
      showcaseSlugs.flatMap((s) => {
        const product = bySlug(s.slug);
        return product && product.isActive !== false ? [{ ...s, product }] : [];
      }),
    [bySlug],
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [focused, setFocused] = useState(false);
  const [added, setAdded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const addedTimer = useRef<number | undefined>(undefined);
  const inView = useInView(sectionRef, { amount: 0.35 });
  const reduce = usePrefersReducedMotion();
  const addToCart = useAddToCart();
  const autoplay = playing && inView && !reduce && !focused;

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  if (items.length === 0) return null;
  const safeIndex = index % items.length;
  const active = items[safeIndex];
  const product = active.product;
  const stock = stockState(product.stock);
  const soldOut = product.stock <= 0;

  const goTo = (next: number) => {
    setAdded(false);
    setIndex((next + items.length) % items.length);
  };

  const add = () => {
    if (soldOut) return;
    if (addToCart(product.slug, { variant: firstAvailableVariantCode(product), planter: null, quantity: 1 })) {
      setAdded(true);
      window.clearTimeout(addedTimer.current);
      addedTimer.current = window.setTimeout(() => setAdded(false), 1400);
    }
  };

  const facts = [
    { icon: Sun, label: "Light", value: lightLabel[product.light].replace(/ light$/i, "") },
    { icon: Sprout, label: "Care", value: careLabel[product.care].replace(/ care$/i, "") },
    { icon: Droplets, label: "Water", value: product.water, wide: true },
  ];

  return (
    <section
      ref={sectionRef}
      id="plant-showcase"
      aria-labelledby="showcase-title"
      aria-roledescription="carousel"
      className="grain relative z-10 -mt-8 scroll-mt-24 overflow-hidden rounded-t-[2.5rem] bg-cream pt-16 pb-20 sm:-mt-10 sm:rounded-t-[3.5rem] sm:pt-24 sm:pb-28"
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setFocused(true);
      }}
      onBlur={() => setFocused(false)}
    >
      <div className="container-page">
        <div className="mb-10 flex flex-col gap-3 sm:mb-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-clay">The Pot Stories line-up</p>
            <h2 id="showcase-title" className="display-heavy mt-3 text-[clamp(2.2rem,5vw,4.2rem)] text-forest-900">
              Find your plant <span className="text-forest-600 italic">personality</span>
            </h2>
          </div>
          <p className="max-w-sm text-[0.95rem] leading-relaxed text-moss">
            One stage, five characters. Watch them rotate, or pick the one that suits your room.
          </p>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          {/* Stage — composition stays fixed, only the plant changes */}
          <div className="relative mx-auto w-full max-w-[34rem]">
            <div className="relative aspect-[4/5]">
              <div aria-hidden className="absolute inset-x-0 top-[2%] z-0 overflow-hidden text-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.p
                    key={active.slug}
                    initial={{ opacity: 0, y: 60 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -60 }}
                    transition={{ duration: 0.9, ease: easeOutExpo }}
                    className="display-heavy text-[clamp(4.5rem,15vw,10rem)] leading-none text-forest-900/[0.07]"
                  >
                    {shortName(product)}
                  </motion.p>
                </AnimatePresence>
              </div>
              {/* arch — the plants live inside it so multiply blends them into the tone */}
              <motion.div
                className="absolute inset-x-[9%] top-[8%] bottom-[12%] isolate overflow-hidden rounded-t-[999px] rounded-b-[1.5rem] shadow-[inset_0_-60px_90px_-50px_rgba(20,40,29,0.35)]"
                animate={{ backgroundColor: active.tone }}
                transition={{ duration: 1.2, ease: easeOutExpo }}
              >
                {items.map((item, i) => {
                  const isActive = i === safeIndex;
                  return (
                    <motion.div
                      key={item.slug}
                      aria-hidden={!isActive}
                      className="absolute inset-0 mix-blend-multiply"
                      initial={false}
                      animate={
                        isActive
                          ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
                          : { opacity: 0, scale: 0.94, y: 18, filter: "blur(6px)" }
                      }
                      transition={{ duration: reduce ? 0.3 : 1.1, ease: easeOutExpo }}
                    >
                      <div className="ps-float absolute inset-x-0 -top-3 bottom-0">
                        <Image
                          src={item.product.image}
                          alt={isActive ? item.product.imageAlt : ""}
                          fill
                          sizes="(min-width: 1024px) 28rem, 76vw"
                          quality={85}
                          className="object-cover object-[50%_60%]"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
              {/* plinth + breathing floor shadow */}
              <div aria-hidden className="absolute inset-x-[4%] bottom-[8%] h-[5%] rounded-[50%] bg-sand shadow-[inset_0_-6px_12px_rgba(20,40,29,0.12)]" />
              <div aria-hidden className="ps-shadow-breathe absolute inset-x-[18%] bottom-[4%] h-6 rounded-[50%] bg-forest-900/20 blur-xl" />

              {/* floating chips */}
              <div className="absolute top-[22%] -left-1 z-10 sm:-left-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active.slug}
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.55, delay: 0.25, ease: easeOutExpo }}
                    className="max-w-[11rem] rounded-2xl bg-ivory/95 px-4 py-3 shadow-[0_18px_40px_-20px_rgba(14,29,21,0.45)] backdrop-blur"
                  >
                    <p className="text-[0.6rem] font-bold tracking-[0.16em] text-moss uppercase">Botanical name</p>
                    <p className="mt-0.5 font-display text-sm text-forest-900 italic">{product.botanical}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="absolute right-0 bottom-[20%] z-10 sm:-right-5">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active.slug}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.55, delay: 0.35, ease: easeOutExpo }}
                    className="rounded-2xl bg-forest-900 px-4 py-3 text-ivory shadow-[0_18px_40px_-20px_rgba(14,29,21,0.6)]"
                  >
                    <p className="text-[0.6rem] font-bold tracking-[0.16em] text-sage-300 uppercase">Grows to</p>
                    <p className="mt-0.5 text-sm font-semibold">{product.height}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
              <LeafShape className="ps-float pointer-events-none absolute top-[4%] right-[4%] size-14 text-forest-700/25" variant={2} />
              <LeafShape className="pointer-events-none absolute bottom-[26%] left-[3%] size-10 text-clay/35" variant={1} />
            </div>
          </div>

          {/* Copy */}
          <div>
            <div aria-live={autoplay ? "off" : "polite"} aria-atomic="true">
              <p className="nav-caps flex items-center gap-2 text-moss">
                <span className="tabular-nums">{String(safeIndex + 1).padStart(2, "0")}</span>
                <span aria-hidden className="h-px w-8 bg-moss/40" />
                <span className="tabular-nums">{String(items.length).padStart(2, "0")}</span>
              </p>
              <h3 className="mt-3 font-display text-[clamp(2.4rem,4.6vw,4rem)] leading-[1] tracking-[-0.02em] text-forest-900">
                <span className="relative block h-[1.1em] overflow-hidden">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={active.slug}
                      className="absolute inset-x-0 top-0 block truncate"
                      initial={{ y: "105%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "-105%" }}
                      transition={{ duration: 0.7, ease: easeOutExpo }}
                    >
                      {product.name}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </h3>
              <div className="relative mt-4 min-h-[6rem] sm:min-h-[6.5rem]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active.slug}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: 0.55, delay: 0.12, ease: easeOutExpo } }}
                    exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
                  >
                    <p className="font-display text-xl text-clay italic">{active.persona}</p>
                    <p className="mt-3 max-w-md leading-relaxed text-moss">{firstSentence(product.shortDescription || product.description)}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <dl className="mt-6 grid max-w-lg grid-cols-2 gap-2.5 sm:gap-3">
              {facts.map(({ icon: Icon, label, value, wide }, i) => (
                <div key={label} className={cn("overflow-hidden rounded-2xl border border-forest-900/10 bg-ivory/70 p-3 sm:p-4", wide && "col-span-2")}>
                  <dt className="flex items-center gap-1.5 text-[0.64rem] font-bold tracking-[0.14em] text-moss uppercase">
                    <Icon className="size-3.5" aria-hidden /> {label}
                  </dt>
                  <dd className="relative mt-2 h-[1.5em] overflow-hidden font-display text-[1.02rem] text-forest-900 sm:text-lg">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={active.slug}
                        className="absolute inset-0 truncate"
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: "0%", opacity: 1 }}
                        exit={{ y: "-100%", opacity: 0 }}
                        transition={{ duration: 0.5, delay: 0.15 + i * 0.07, ease: easeOutExpo }}
                      >
                        {value}
                      </motion.span>
                    </AnimatePresence>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap items-end gap-x-6 gap-y-4">
              <div>
                <p className="text-[0.64rem] font-bold tracking-[0.14em] text-moss uppercase">{hasPriceRange(product) ? "From" : "Price"}</p>
                <p className="relative mt-1 h-[1.25em] min-w-[6ch] overflow-hidden font-display text-[2rem] leading-none text-forest-900">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={`${active.slug}-${product.price}`}
                      className="absolute inset-0 tabular-nums"
                      initial={{ y: "100%" }}
                      animate={{ y: "0%" }}
                      exit={{ y: "-100%" }}
                      transition={{ duration: 0.6, delay: 0.1, ease: easeOutExpo }}
                    >
                      {formatPrice(product.price)}
                    </motion.span>
                  </AnimatePresence>
                </p>
              </div>
              <p
                className={cn(
                  "mb-1 inline-flex items-center gap-1.5 text-xs font-semibold",
                  stock.tone === "out" ? "text-clay-dark" : stock.tone === "low" ? "text-clay" : "text-forest-700",
                )}
              >
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", stock.tone === "out" ? "bg-clay-dark" : stock.tone === "low" ? "bg-clay" : "bg-sage-500")}
                />
                {stock.label}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={add}
                disabled={soldOut}
                aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to bag, ${formatPrice(product.price)}`}
                className={cn(
                  "btn relative min-w-[11rem] overflow-hidden disabled:cursor-not-allowed disabled:opacity-50",
                  added ? "btn-leaf" : "btn-primary",
                )}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={added ? "added" : soldOut ? "sold" : "add"}
                    className="inline-flex items-center gap-2"
                    initial={{ y: 18, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -18, opacity: 0 }}
                    transition={{ duration: 0.3, ease: easeOutExpo }}
                  >
                    {added ? (
                      <>
                        <Check className="size-4" aria-hidden /> Added to bag
                      </>
                    ) : soldOut ? (
                      "Sold out"
                    ) : (
                      <>
                        <ShoppingBag className="size-4" aria-hidden /> Add to bag
                      </>
                    )}
                  </motion.span>
                </AnimatePresence>
              </button>
              <Link href={`/shop/${product.slug}`} className="btn btn-outline group text-forest-900">
                Discover the {shortName(product)}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>

            {/* Selector */}
            <div className="mt-10 flex items-center gap-3 sm:gap-4">
              <div className="flex flex-1 gap-2 sm:gap-3" role="group" aria-label="Choose a plant">
                {items.map((item, i) => {
                  const isActive = i === safeIndex;
                  return (
                    <button
                      key={item.slug}
                      type="button"
                      onClick={() => goTo(i)}
                      aria-current={isActive}
                      aria-label={`Show ${item.product.name}`}
                      className="group min-w-0 flex-1 text-left"
                    >
                      <span
                        className={cn(
                          "relative mx-auto mb-2.5 block aspect-square w-full max-w-14 overflow-hidden rounded-full border-2 bg-ivory transition-[border-color,transform,translate,scale] duration-300",
                          isActive ? "scale-100 border-forest-800" : "scale-90 border-transparent group-hover:scale-95",
                        )}
                      >
                        <Image src={item.product.image} alt="" fill sizes="56px" className="object-cover mix-blend-multiply" />
                      </span>
                      <span className="relative block h-[3px] overflow-hidden rounded-full bg-forest-900/12">
                        {i < safeIndex && <span className="absolute inset-0 bg-forest-900/35" />}
                        {isActive && (
                          <span
                            key={`${safeIndex}-${reduce ? "r" : "a"}`}
                            className="ps-progress absolute inset-0 bg-forest-800"
                            style={{ "--progress-duration": `${SLIDE_SECONDS}s`, animationPlayState: autoplay ? "running" : "paused" } as CSSProperties}
                            onAnimationEnd={() => goTo(safeIndex + 1)}
                          />
                        )}
                      </span>
                      <span
                        className={cn(
                          "mt-2 hidden truncate text-xs font-semibold tracking-wide transition-colors sm:block",
                          isActive ? "text-forest-900" : "text-moss/70 group-hover:text-forest-900",
                        )}
                      >
                        {shortName(item.product)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!reduce && (
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? "Pause plant rotation" : "Play plant rotation"}
                  aria-pressed={!playing}
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-forest-900/20 text-forest-900 transition-colors hover:bg-ivory"
                >
                  {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
