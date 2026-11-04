"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Gift } from "lucide-react";
import { useCatalog } from "@/components/providers/catalog-provider";
import { MaskReveal, Parallax, revealChild, revealParent } from "@/components/motion/scroll-media";
import { SplitWords } from "@/components/motion/text-reveal";
import { unsplash } from "@/lib/products";
import { formatPrice } from "@/lib/format";

/**
 * Gift collections as an asymmetric editorial composition: one tall hero
 * tile (mask wipe + parallax), a landscape "under ₹500" tile, and a deep-green
 * panel of ready-to-gift picks pulled live from the catalogue.
 */
export function GiftCollections() {
  const { byTag, bySlugs } = useCatalog();
  const featured = bySlugs(["succulent-trio", "ficus-ginseng-bonsai", "peace-lily"]);
  const picks = (featured.length >= 2 ? featured : byTag("gift")).filter((p) => p.stock > 0).slice(0, 3);

  return (
    <section aria-labelledby="gift-title" className="py-16 sm:py-24">
      <div className="container-page">
        <div className="mb-8 flex flex-col gap-4 sm:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-clay">Gifting, made thoughtful</p>
            <SplitWords
              as="h2"
              id="gift-title"
              text="Gift collections"
              accent={[1]}
              accentClassName="italic text-forest-600"
              className="display-heavy mt-3 text-[clamp(2.2rem,5vw,4.2rem)] text-forest-900"
            />
          </div>
          <Link href="/shop?tags=gift" className="group inline-flex items-center gap-1.5 text-sm font-bold text-forest-900">
            <span className="link-underline pb-0.5">Shop all gifts</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:gap-5 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Tall hero tile */}
          <Link
            href="/shop?tags=gift"
            className="group relative block min-h-[30rem] overflow-hidden rounded-[2rem] bg-forest-800 text-ivory lg:col-span-7 lg:row-span-2 lg:min-h-[44rem]"
          >
            <MaskReveal from="bottom" className="absolute inset-0">
              <Parallax amount={14}>
                <Image
                  src={unsplash("photo-1512428813834-c702c7702b78")}
                  alt="A ficus ginseng bonsai in a small white pot"
                  fill
                  sizes="(min-width: 1024px) 56vw, 100vw"
                  className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]"
                />
              </Parallax>
            </MaskReveal>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-forest-950/20 to-transparent" />
            <span className="absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-full bg-ivory/90 px-3 py-1.5 text-[0.68rem] font-bold tracking-[0.1em] text-forest-900 uppercase backdrop-blur">
              <Gift className="size-3.5" aria-hidden /> Ready to gift
            </span>
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
              <p className="display-heavy max-w-md text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[0.95]">
                Give something <span className="text-leaf italic">that grows.</span>
              </p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ivory/85 sm:text-[0.95rem]">
                Easy-going plants, ready-to-gift trios and grow-your-own kits — loved long after the wrapping comes off.
              </p>
              <span className="btn btn-leaf mt-6">
                Explore gifts <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </span>
            </div>
          </Link>

          {/* Landscape tile */}
          <Link
            href="/shop?tags=gift&price=under-500"
            className="group relative block min-h-[16rem] overflow-hidden rounded-[2rem] bg-cream lg:col-span-5"
          >
            <MaskReveal from="right" delay={0.1} className="absolute inset-0">
              <Image
                src={unsplash("photo-1459156212016-c812468e2115")}
                alt="Small succulents in terracotta pots seen from above"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.05]"
              />
            </MaskReveal>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-forest-950/70 via-forest-950/25 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-end p-6 text-ivory sm:p-8">
              <p className="nav-caps text-leaf">Small but mighty</p>
              <p className="display-heavy mt-2 text-[clamp(1.9rem,3vw,2.6rem)]">Gifts under ₹500</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold">
                <span className="link-underline pb-0.5">Shop the edit</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </div>
          </Link>

          {/* Picks panel */}
          <div className="rounded-[2rem] bg-forest-900 p-5 text-ivory sm:p-7 lg:col-span-5">
            <p className="nav-caps text-sage-300">Ready-to-gift picks</p>
            <motion.ul
              variants={revealParent}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "0px 0px -8% 0px" }}
              className="mt-4 divide-y divide-ivory/10"
            >
              {picks.map((p) => (
                <motion.li key={p.slug} variants={revealChild}>
                  <Link href={`/shop/${p.slug}`} className="group flex items-center gap-4 py-3">
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-card sm:size-[4.5rem]">
                      <Image
                        src={p.image}
                        alt=""
                        fill
                        sizes="72px"
                        className="object-cover mix-blend-multiply transition-transform duration-500 group-hover:scale-110"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold group-hover:underline group-hover:underline-offset-4">{p.name}</span>
                      <span className="block truncate text-xs text-sage-300 italic">{p.botanical}</span>
                    </span>
                    <span className="shrink-0 font-display text-lg text-leaf">{formatPrice(p.price)}</span>
                    <ArrowRight className="size-4 shrink-0 text-sage-300 transition-transform group-hover:translate-x-1" aria-hidden />
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>
    </section>
  );
}
