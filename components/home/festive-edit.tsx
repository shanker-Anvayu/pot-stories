"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { ProductCard } from "@/components/product/product-card";
import { useCatalog } from "@/components/providers/catalog-provider";
import { Parallax, revealChild, revealParent } from "@/components/motion/scroll-media";
import { SplitWords } from "@/components/motion/text-reveal";
import { unsplash } from "@/lib/products";

/**
 * Seasonal campaign: the section's background hands off from ivory to a warm
 * festive sand as it scrolls in; a large sticky image (scroll-linked scale
 * 1.18 → 1 and parallax) sits beside a 2×2 grid of festive picks.
 */
export function FestiveEdit() {
  const { byTag } = useCatalog();
  const picks = byTag("festive").slice(0, 4);
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.35"] });
  const bg = useTransform(scrollYProgress, [0, 1], ["#f6f2e7", "#f1e2cf"]);
  if (picks.length === 0) return null;

  return (
    <motion.section
      ref={ref}
      aria-labelledby="festive-title"
      className="relative py-16 sm:py-24"
      style={{ backgroundColor: reduce ? "#f1e2cf" : bg }}
    >
      <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-clay/20 sm:aspect-[5/5] lg:aspect-auto lg:h-[min(78svh,46rem)]">
            <Parallax amount={18} scale={[1.18, 1]}>
              <Image
                src={unsplash("photo-1466781783364-36c955e42a7f")}
                alt="Eucalyptus stems arranged in a clear glass vase on a sunny table"
                fill
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
            </Parallax>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-clay-dark/80 via-clay-dark/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-ivory sm:p-10">
              <p className="nav-caps text-ivory/85">Seasonal collection</p>
              <SplitWords
                as="h2"
                id="festive-title"
                text="The Festive Edit"
                accent={[1]}
                accentClassName="italic"
                className="display-heavy mt-3 text-[clamp(2.8rem,6vw,5.4rem)] leading-[0.92]"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.8 }}
            className="max-w-md"
          >
            <p className="font-display text-[1.6rem] leading-snug text-forest-900 italic">Living gifts and lucky greens for the season.</p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-moss">
              Lucky bamboo for new beginnings, bonsai for the patient, and peace lilies for the people you&apos;d like to
              see bloom. Gifts that last longer than the celebrations.
            </p>
          </motion.div>
          <motion.ul
            variants={revealParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "0px 0px -8% 0px" }}
            className="mt-8 grid grid-cols-2 gap-3 sm:gap-4"
            aria-label="Festive picks"
          >
            {picks.map((p) => (
              <motion.li key={p.slug} variants={revealChild}>
                <ProductCard product={p} badge="Festive pick" sizes="(min-width: 1024px) 22vw, 46vw" />
              </motion.li>
            ))}
          </motion.ul>
          <Link href="/shop?tags=festive" className="btn btn-primary group mt-8 self-start">
            Shop the Festive Edit
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
