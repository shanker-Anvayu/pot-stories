"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { HandHeart, Leaf, Package, Sprout } from "lucide-react";
import { Reveal, staggerChild, staggerParent } from "@/components/ui/reveal";
import { unsplash } from "@/lib/products";

const pillars = [
  {
    icon: Sprout,
    title: "Chosen, not churned",
    body: "Every plant is selected for healthy roots, good structure and the right size for its pot — never just pulled from a shelf.",
  },
  {
    icon: Leaf,
    title: "Care, made clear",
    body: "Each plant comes with simple, specific guidance on light, water and feeding, so you know exactly what it needs.",
  },
  {
    icon: Package,
    title: "Packed with intention",
    body: "Plants travel snugly in paper-first packaging designed to protect leaves and keep soil where it belongs.",
  },
  {
    icon: HandHeart,
    title: "Here after delivery",
    body: "Yellowing leaf? Mystery spots? Our plant journal and help centre are here for the life of your plant, not just the first week.",
  },
];

export function WhyChoose() {
  return (
    <section aria-labelledby="why-title" className="py-24 sm:py-32">
      <div className="container-page grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <p className="eyebrow text-clay">Why Pot Stories</p>
            <h2 id="why-title" className="mt-4 font-display text-[clamp(2.1rem,4.4vw,3.6rem)] leading-[1.02] tracking-[-0.02em] text-forest-900">
              Every plant has a story. <em className="text-forest-600">We help write the good ones.</em>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-moss">
              We believe a plant should feel like a companion, not a chore. So we focus on the things that help it settle
              in and thrive in your home.
            </p>
          </Reveal>
          <Reveal delay={0.15} className="relative mt-10 aspect-[5/4] overflow-hidden rounded-[1.75rem]">
            <Image
              src={unsplash("photo-1625758476104-f2ed6c81248f")}
              alt="A gardener's hand lifting a young plant with healthy roots"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </Reveal>
        </div>

        <motion.ul
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          className="grid gap-4 sm:grid-cols-2 lg:mt-24"
        >
          {pillars.map(({ icon: Icon, title, body }, i) => (
            <motion.li
              key={title}
              variants={staggerChild}
              className={`group rounded-[1.75rem] border border-forest-900/10 bg-cream/60 p-8 transition-colors duration-500 hover:bg-sage-100 ${i % 2 === 1 ? "sm:translate-y-12" : ""}`}
            >
              <span className="grid size-14 place-items-center rounded-2xl bg-forest-800 text-sage-200 transition-transform duration-500 group-hover:-rotate-6">
                <Icon className="size-6" strokeWidth={1.6} aria-hidden />
              </span>
              <h3 className="mt-8 font-display text-2xl text-forest-900">{title}</h3>
              <p className="mt-3 leading-relaxed text-moss">{body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
