"use client";

import Image from "next/image";
import Link from "next/link";
import { useInView } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { ChevronLeft, ChevronRight, Info, Pause, Play, Quote } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/reveal";
import { sampleTestimonials } from "@/lib/content";
import { useCatalog } from "@/components/providers/catalog-provider";
import { cn } from "@/lib/format";

/** Seconds between gentle auto-advances. */
const ADVANCE_SECONDS = 4.5;

/**
 * Social-proof strip (SAMPLE content, labelled): swipeable row of review
 * cards with photo, quote and product link; dots track the scroll position.
 * Gently auto-advances one card every 4.5s (smooth scroll, loops to start)
 * while on screen; pauses on hover, focus, touch/drag, via the pause button,
 * and never for prefers-reduced-motion.
 */
export function Testimonials() {
  const trackRef = useRef<HTMLUListElement>(null);
  const { bySlug: productBySlug } = useCatalog();
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hold, setHold] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.4 });
  const reduce = usePrefersReducedMotion();
  const total = sampleTestimonials.length;
  const autoplay = playing && !hold && inView && !reduce;

  const onScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    if (!card) return;
    const step = card.offsetWidth + 16;
    setActive(Math.min(total - 1, Math.round(el.scrollLeft / step)));
  }, [total]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const scrollTo = useCallback((i: number) => {
    const el = trackRef.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft || "0"), behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => {
      const el = trackRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      scrollTo(atEnd ? 0 : active + 1);
    }, ADVANCE_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [autoplay, active, scrollTo]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="reviews-title"
      className="overflow-hidden bg-sage-100 py-14 sm:py-20"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setHold(true);
      }}
      onBlur={() => setHold(false)}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") setHold(true);
      }}
      onTouchEnd={() => window.setTimeout(() => setHold(false), 6000)}
    >
      <div className="container-page">
        <Reveal className="text-center">
          <h2 id="reviews-title" className="display-heavy text-[clamp(2rem,4vw,3.2rem)] text-forest-900">
            Notes from a <span className="text-forest-600 italic">growing</span> community
          </h2>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs text-moss">
            <Info className="size-3.5" aria-hidden />
            Sample reviews — illustrative content for this design preview
          </p>
        </Reveal>

        <div className="relative mt-8">
          <ul ref={trackRef} className="rail gap-4 py-3" aria-label="Sample reviews">
            {sampleTestimonials.map((t, i) => {
              const product = productBySlug(t.product);
              return (
                <li key={i} className="w-[72%] sm:w-[42%] md:w-[30%] lg:w-[calc((100%-4rem)/5)]">
                  <figure className="flex h-full flex-col overflow-hidden rounded-[14px] bg-card shadow-[0_2px_0_rgba(20,40,29,0.04)] transition-[transform,translate,scale,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_18px_30px_-20px_rgba(20,40,29,0.45)]">
                    {product && (
                      <Link href={`/shop/${product.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-cream" tabIndex={-1} aria-hidden>
                        <Image src={product.image} alt="" fill sizes="(min-width: 1024px) 18vw, 70vw" className="object-cover" />
                      </Link>
                    )}
                    <div className="flex flex-1 flex-col p-4">
                      <Quote className="size-4 text-clay" aria-hidden />
                      <blockquote className="mt-2 line-clamp-4 text-[0.86rem] leading-relaxed text-forest-900">{t.quote}</blockquote>
                      <figcaption className="mt-auto pt-4 text-xs text-moss">
                        <span className="font-bold text-forest-900">{t.name}</span> ·{" "}
                        {product ? (
                          <Link href={`/shop/${product.slug}`} className="underline-offset-2 hover:underline">
                            {t.detail}
                          </Link>
                        ) : (
                          t.detail
                        )}
                      </figcaption>
                    </div>
                  </figure>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => scrollTo(Math.max(0, active - 1))}
            aria-label="Previous review"
            className="grid size-11 place-items-center rounded-full border border-forest-900/20 bg-card text-forest-900 hover:border-forest-900"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <div className="flex gap-1.5">
            {sampleTestimonials.map((_, i) => (
              <button key={i} type="button" onClick={() => scrollTo(i)} aria-label={`Go to review ${i + 1}`} aria-current={i === active} className="grid h-8 min-w-5 place-items-center">
                <span className={cn("block h-1.5 rounded-full transition-all duration-300", i === active ? "w-5 bg-forest-900" : "w-1.5 bg-forest-900/25")} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollTo(Math.min(total - 1, active + 1))}
            aria-label="Next review"
            className="grid size-11 place-items-center rounded-full border border-forest-900/20 bg-card text-forest-900 hover:border-forest-900"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          {!reduce && (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause automatic scrolling" : "Play automatic scrolling"}
              aria-pressed={!playing}
              className="grid size-11 place-items-center rounded-full border border-forest-900/20 bg-card text-forest-900 hover:border-forest-900"
            >
              {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
