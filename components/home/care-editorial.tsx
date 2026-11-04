"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { MaskReveal, revealChild, revealParent } from "@/components/motion/scroll-media";
import { SplitWords } from "@/components/motion/text-reveal";
import { articles } from "@/lib/content";

/**
 * Plant care journal as a magazine spread: a large lead story (mask wipe)
 * beside a numbered index of further guides that stagger in.
 */
export function CareEditorial() {
  const [lead, ...rest] = articles;
  if (!lead) return null;
  const more = rest.slice(0, 3);

  return (
    <section aria-labelledby="care-title" className="bg-ivory py-16 sm:py-24">
      <div className="container-page">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow text-clay">The Plant Journal</p>
            <SplitWords
              as="h2"
              id="care-title"
              text="Plant care, made simple"
              accent={[2, 3]}
              accentClassName="italic text-forest-600"
              className="display-heavy mt-3 text-[clamp(2.2rem,5vw,4.2rem)] text-forest-900"
            />
          </div>
          <Link href="/journal" className="group inline-flex items-center gap-1.5 text-sm font-bold text-forest-900">
            <span className="link-underline pb-0.5">Read the journal</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          <article>
            <Link href={`/journal/${lead.slug}`} className="group block">
              <MaskReveal from="bottom" className="relative aspect-[4/3] rounded-[2rem] bg-cream lg:aspect-[16/11]">
                <Image
                  src={lead.image}
                  alt={lead.imageAlt}
                  fill
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]"
                />
              </MaskReveal>
              <p className="nav-caps mt-6 text-clay">
                {lead.category} · {lead.readTime}
              </p>
              <h3 className="mt-2 font-display text-[clamp(1.7rem,2.8vw,2.4rem)] leading-tight text-forest-900 group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {lead.title}
              </h3>
              <p className="mt-3 max-w-xl leading-relaxed text-moss">{lead.excerpt}</p>
            </Link>
          </article>

          <motion.ol
            variants={revealParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            className="flex flex-col divide-y divide-forest-900/10 border-y border-forest-900/10"
          >
            {more.map((a, i) => (
              <motion.li key={a.slug} variants={revealChild}>
                <Link href={`/journal/${a.slug}`} className="group flex gap-4 py-5 sm:gap-5">
                  <span className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-2xl bg-cream sm:w-28">
                    <Image
                      src={a.image}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="nav-caps flex items-center gap-2 text-clay">
                      <span className="font-display text-sm text-forest-900/40 tabular-nums">{String(i + 2).padStart(2, "0")}</span>
                      {a.category} · {a.readTime}
                    </span>
                    <span className="mt-1.5 block text-[1.05rem] leading-snug font-bold text-forest-900 group-hover:underline group-hover:underline-offset-2">
                      {a.title}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-moss">{a.excerpt}</span>
                  </span>
                  <ArrowUpRight
                    className="mt-1 size-5 shrink-0 text-forest-900/40 transition-[transform,translate,scale,color] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-forest-900"
                    aria-hidden
                  />
                </Link>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
