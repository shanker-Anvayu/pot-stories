"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { staggerChild, staggerParent } from "@/components/ui/reveal";
import { unsplash } from "@/lib/products";

const tiles = [
  {
    title: "Statement plants",
    sub: "Big leaves, bold silhouettes",
    href: "/shop?tags=statement",
    image: unsplash("photo-1545241047-6083a3684587"),
    alt: "A monstera on a wooden stool beside a white chair",
  },
  {
    title: "Pet friendly",
    sub: "Non-toxic picks for cats & dogs",
    href: "/shop?tags=pet-friendly",
    image: unsplash("photo-1572688484438-313a6e50c333"),
    alt: "A spider plant on a slim console table",
  },
  {
    title: "Outdoor & balcony",
    sub: "Hardy greens for open air",
    href: "/shop?category=outdoor",
    image: unsplash("photo-1557429287-b2e26467fc2b"),
    alt: "A cottage garden full of flowering shrubs",
  },
  {
    title: "All plants",
    sub: "Every plant, pot and kit",
    href: "/shop",
    image: unsplash("photo-1530968464165-7a1861cbaf9f"),
    alt: "Shelves of houseplants and trailing vines in a sunny room",
  },
];

/** Four rounded collection tiles with title + subtitle; images ease-zoom on hover, press scales down. */
export function CollectionTiles() {
  return (
    <section aria-label="Shop collections" className="py-10 sm:py-14">
      <div className="container-page">
        <motion.ul
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 lg:grid-cols-4"
        >
          {tiles.map((t) => (
            <motion.li key={t.href} variants={staggerChild}>
              <Link href={t.href} className="group block text-center transition-transform duration-75 ease-out active:scale-[0.98]">
                <span className="relative block aspect-square overflow-hidden rounded-[16px] bg-cream">
                  <Image
                    src={t.image}
                    alt={t.alt}
                    fill
                    sizes="(min-width: 1024px) 23vw, 46vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(.26,.54,.32,1)] group-hover:scale-[1.05]"
                  />
                </span>
                <span className="mt-3 block text-[1rem] font-bold text-forest-900 group-hover:underline group-hover:underline-offset-4">{t.title}</span>
                <span className="mt-0.5 block text-xs text-moss sm:text-sm">{t.sub}</span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
