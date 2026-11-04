"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { staggerChild, staggerParent } from "@/components/ui/reveal";
import { categories, productsInCategory } from "@/lib/products";
import { cn } from "@/lib/format";

const featured = ["indoor", "outdoor", "succulents", "hanging", "bonsai", "herbs"] as const;
const layout: Record<(typeof featured)[number], string> = {
  indoor: "col-span-2 row-span-2",
  outdoor: "col-span-1 md:col-span-2",
  succulents: "col-span-1",
  hanging: "col-span-1",
  bonsai: "col-span-1 md:col-span-2",
  herbs: "col-span-2",
};

export function CategoryGrid() {
  const tiles = featured.flatMap((id) => {
    const c = categories.find((cat) => cat.id === id);
    return c ? [c] : [];
  });

  return (
    <section aria-labelledby="categories-title" className="py-24 sm:py-32">
      <div className="container-page">
        <SectionHeading
          id="categories-title"
          eyebrow="Shop by category"
          title={
            <>
              A plant for every <em className="text-forest-600">corner</em> of your world
            </>
          }
          link={{ href: "/shop", label: "View all plants" }}
        />

        <motion.ul
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          className="mt-14 grid auto-rows-[15rem] grid-cols-2 gap-3 sm:auto-rows-[17rem] sm:gap-4 md:grid-cols-6 lg:auto-rows-[19rem]"
        >
          {tiles.map((cat) => {
            const count = productsInCategory(cat.id).length;
            const big = cat.id === "indoor";
            return (
              <motion.li
                key={cat.id}
                variants={staggerChild}
                className={layout[cat.id as (typeof featured)[number]]}
              >
                <Link
                  href={`/shop?category=${cat.id}`}
                  className="group relative block h-full overflow-hidden rounded-[1.5rem] bg-forest-800"
                >
                  <Image
                    src={cat.image}
                    alt={cat.imageAlt}
                    fill
                    sizes={big ? "(min-width: 768px) 34vw, 100vw" : "(min-width: 768px) 34vw, 50vw"}
                    className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.07]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-forest-950/15 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
                  <span className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-ivory/90 text-forest-900 transition-transform duration-500 group-hover:rotate-45 sm:top-4 sm:right-4 sm:size-11">
                    <ArrowUpRight className="size-4" aria-hidden />
                  </span>
                  <div className="absolute inset-x-4 bottom-4 text-ivory sm:inset-x-6 sm:bottom-6">
                    <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-sage-200 uppercase">
                      {count} {count === 1 ? "plant" : "plants"}
                    </p>
                    <h3 className={cn("mt-1 font-display leading-tight", big ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl")}>
                      {cat.name}
                    </h3>
                    {big && <p className="mt-2 hidden max-w-xs text-sm text-sage-100/90 sm:block">{cat.description}</p>}
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
