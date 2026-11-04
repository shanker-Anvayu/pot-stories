"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, PawPrint } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { useCatalog } from "@/components/providers/catalog-provider";
import { MaskReveal, Parallax, revealChild, revealParent } from "@/components/motion/scroll-media";
import { SplitWords } from "@/components/motion/text-reveal";
import { unsplash } from "@/lib/products";

/**
 * Pet-friendly edit: a tall editorial image panel (mask wipe from the left +
 * scroll parallax) beside a swipeable row of non-toxic plants.
 */
export function PetFriendly() {
  const { byTag } = useCatalog();
  const picks = byTag("pet-friendly").slice(0, 5);
  if (picks.length === 0) return null;

  return (
    <section aria-labelledby="pet-title" className="bg-sage-100 py-16 sm:py-24">
      <div className="container-page grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-10">
        <div className="relative min-h-[28rem] overflow-hidden rounded-[1.75rem] bg-forest-800 lg:min-h-full">
          <MaskReveal from="left" className="absolute inset-0">
          <Parallax amount={16}>
            <Image
              src={unsplash("photo-1491147334573-44cbb4602074")}
              alt="Patterned calathea leaves in soft green and cream"
              fill
              sizes="(min-width: 1024px) 32vw, 100vw"
              className="object-cover"
            />
          </Parallax>
          </MaskReveal>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-forest-950/85 via-forest-950/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-ivory sm:p-8">
            <span className="grid size-12 place-items-center rounded-full bg-leaf text-forest-900">
              <PawPrint className="size-5" aria-hidden />
            </span>
            <SplitWords
              as="h2"
              id="pet-title"
              text="Safe around paws."
              accent={[2]}
              accentClassName="italic text-leaf"
              className="display-heavy mt-4 text-[clamp(2.2rem,3.6vw,3.2rem)]"
            />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ivory/85">
              Plants listed as non-toxic to cats and dogs by the ASPCA — still best enjoyed by humans, not nibbled.
            </p>
            <Link href="/shop?tags=pet-friendly" className="btn btn-leaf group mt-5">
              Shop pet-friendly
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
        </div>

        <motion.ul
          variants={revealParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          aria-label="Pet-friendly plants"
          className="rail items-stretch lg:mx-0 lg:gap-4 lg:px-0 lg:pb-2"
        >
          {picks.map((p) => (
            <motion.li key={p.slug} variants={revealChild} className="w-[44%] sm:w-[31%] lg:w-[calc((100%-2rem)/3)]">
              <ProductCard product={p} sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 44vw" />
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
