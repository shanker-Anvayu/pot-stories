"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { InstagramIcon } from "@/components/ui/brand-icons";
import { socialGallery } from "@/lib/content";
import { productBySlug } from "@/lib/products";

const spans = ["col-span-2 row-span-2", "", "md:row-span-2", "", "md:col-span-2", "col-span-2"];

export function SocialGallery() {
  return (
    <section aria-labelledby="social-title" className="py-24 sm:py-32">
      <div className="container-page">
        <SectionHeading
          id="social-title"
          eyebrow="#PotStoriesAtHome"
          title={
            <>
              Little stories, <em className="text-forest-600">growing everywhere</em>
            </>
          }
          description="A glimpse of green spaces we love. Tap any photo to shop the plant that inspired it."
        />

        <ul className="mt-14 grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[14rem] sm:gap-4 md:grid-cols-4">
          {socialGallery.map((item, i) => {
            const product = productBySlug(item.product);
            if (!product) return null;
            return (
              <motion.li
                key={item.image}
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "0px 0px -8% 0px" }}
                transition={{ duration: 0.8, delay: (i % 4) * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className={spans[i]}
              >
                <Link
                  href={`/shop/${product.slug}`}
                  className="group relative block h-full overflow-hidden rounded-[1.4rem] bg-cream"
                  aria-label={`Shop ${product.name} — ${item.alt}`}
                >
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.08]"
                  />
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-forest-950/55 text-ivory opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ShoppingBag className="size-6" strokeWidth={1.5} aria-hidden />
                    <span className="text-sm font-semibold">Shop {product.name}</span>
                  </span>
                  <InstagramIcon className="absolute top-3 right-3 size-5 text-ivory drop-shadow" />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
