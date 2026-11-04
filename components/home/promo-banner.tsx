"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, Package, Sprout } from "lucide-react";
import { MaskReveal, Parallax, revealChild, revealParent } from "@/components/motion/scroll-media";
import { SplitWords, easeOutExpo } from "@/components/motion/text-reveal";
import { unsplash } from "@/lib/products";

/**
 * Plant Club (subscription) promo — labelled "Coming soon". Full-width
 * cinematic banner: the photograph scales 1.2 → 1 and drifts as it scrolls
 * through, the card slides in from the left, the headline reveals by word.
 */
export function PlantClubPromo() {
  return (
    <section aria-labelledby="club-title" className="py-10 sm:py-14">
      <div className="mx-auto max-w-[96rem] px-3 sm:px-5">
        <div className="relative isolate min-h-[36rem] overflow-hidden rounded-[2rem] bg-forest-900 sm:min-h-[38rem] lg:min-h-[42rem] lg:rounded-[2.75rem]">
          <Parallax amount={20} scale={[1.2, 1]}>
            <Image
              src={unsplash("photo-1601985705806-5b9a71f6004f")}
              alt="Shelves of potted plants in a bright plant shop"
              fill
              sizes="100vw"
              className="object-cover"
            />
          </Parallax>
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/40 to-forest-950/0 lg:bg-gradient-to-r lg:from-forest-950/85 lg:via-forest-950/35" />
          <div className="relative flex min-h-[36rem] items-end p-6 sm:min-h-[38rem] sm:p-10 lg:min-h-[42rem] lg:items-center lg:p-16">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 1, ease: easeOutExpo }}
              className="max-w-xl text-ivory"
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-leaf/50 bg-forest-950/40 px-3 py-1.5 text-[0.7rem] font-bold tracking-[0.12em] text-leaf uppercase backdrop-blur">
                <span className="size-1.5 rounded-full bg-leaf" aria-hidden /> Coming soon · The Plant Club
              </p>
              <SplitWords
                as="h2"
                id="club-title"
                text="A new plant, every month."
                accent={[2]}
                accentClassName="italic text-leaf"
                className="display-heavy mt-5 text-[clamp(2.6rem,6vw,5.2rem)] leading-[0.95]"
              />
              <p className="mt-5 max-w-md text-[0.98rem] leading-relaxed text-sage-100">
                We&apos;re building a monthly plant subscription — a seasonal plant, a care card and a little story, delivered
                to your door. Join the list to hear first when it opens.
              </p>
              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
                <Link href="#join" className="btn btn-leaf group">
                  Join the waitlist
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
                <Link href="/shop?tags=beginner" className="btn btn-outline text-ivory">
                  Build a starter bundle
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

const promises = [
  { icon: Sprout, title: "Healthy on arrival", body: "Plants are checked for strong roots and clean leaves before they're packed." },
  { icon: Package, title: "Packed to travel", body: "Upright, paper-first packaging keeps soil in and leaves safe." },
  { icon: Leaf, title: "Care that sticks", body: "Every plant comes with clear, specific care guidance." },
];

/** Brand promise: editorial statement + layered images (mask wipes) + staggered promise list. */
export function PromiseSection() {
  return (
    <section aria-labelledby="promise-title" className="overflow-hidden py-16 sm:py-24">
      <div className="container-page grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <div className="relative pb-16 sm:pb-20">
          <MaskReveal from="bottom" className="relative aspect-[4/5] w-[82%] rounded-[2rem] bg-cream">
            <Image
              src={unsplash("photo-1530836369250-ef72a3f5cda8")}
              alt="Hands planting young seedlings into a seed tray"
              fill
              sizes="(min-width: 1024px) 40vw, 82vw"
              className="object-cover"
            />
          </MaskReveal>
          <MaskReveal
            from="right"
            delay={0.25}
            className="absolute right-0 bottom-0 aspect-square w-[48%] rounded-[1.5rem] bg-cream ring-8 ring-ivory"
          >
            <Image
              src={unsplash("photo-1515150144380-bca9f1650ed9")}
              alt="Watering a potted plant with a small can"
              fill
              sizes="(min-width: 1024px) 22vw, 48vw"
              className="object-cover"
            />
          </MaskReveal>
        </div>
        <div>
          <p className="eyebrow text-clay">Our promise</p>
          <SplitWords
            as="h2"
            id="promise-title"
            text="The Pot Stories promise"
            accent={[3]}
            accentClassName="italic text-forest-600"
            className="display-heavy mt-3 text-[clamp(2.3rem,4.6vw,4rem)] text-forest-900"
          />
          <p className="mt-5 max-w-lg leading-relaxed text-forest-800/85">
            We want every plant to arrive ready to thrive. If something isn&apos;t right when your plant arrives, we&apos;ll
            make it right — full terms will be published in our help centre before launch.
          </p>
          <motion.ol
            variants={revealParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            className="mt-9 divide-y divide-forest-900/10 border-y border-forest-900/10"
          >
            {promises.map(({ icon: Icon, title, body }, i) => (
              <motion.li key={title} variants={revealChild} className="flex gap-5 py-5">
                <span className="w-8 shrink-0 pt-0.5 font-display text-sm text-clay tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-[1.05rem] font-bold text-forest-900">
                    <Icon className="size-4 text-forest-600" strokeWidth={2} aria-hidden />
                    {title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-moss">{body}</span>
                </span>
              </motion.li>
            ))}
          </motion.ol>
          <Link href="/help#returns" className="group mt-8 inline-flex items-center gap-1.5 text-sm font-bold text-forest-900">
            <span className="link-underline pb-0.5">How plant support works</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
