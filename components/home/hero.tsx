"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useScroll, useTransform } from "framer-motion";
import { usePrefersReducedMotion } from "@/components/motion/use-prefers-reduced-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useRef, useState, type CSSProperties } from "react";
import { SplitWords, easeOutExpo } from "@/components/motion/text-reveal";
import { unsplash } from "@/lib/products";
import { cn } from "@/lib/format";

/** Autoplay interval per slide (ms). */
const INTERVAL = 6500;

const slides = [
  {
    id: "wild",
    eyebrow: "New season greens",
    title: "Bring the glasshouse home.",
    accent: [3],
    body: "Lush, characterful houseplants — chosen for real rooms, packed with care notes that actually help.",
    image: unsplash("photo-1470058869958-2a77ade41c02"),
    alt: "A tall glasshouse overflowing with tropical palms and ferns",
    position: "50% 55%",
    ctas: [
      { label: "Shop all plants", href: "/shop", primary: true },
      { label: "Bestsellers", href: "/shop?tags=bestseller" },
    ],
  },
  {
    id: "starter",
    eyebrow: "Beginner-friendly picks",
    title: "Your starter shelf, sorted.",
    accent: [2],
    body: "Forgiving, good-looking plants that settle in fast — chosen for first-time plant parents.",
    image: unsplash("photo-1592150621744-aca64f48394a"),
    alt: "A bright room filled with easy-care houseplants in white pots",
    position: "50% 50%",
    ctas: [
      { label: "Shop easy-care", href: "/shop?tags=beginner", primary: true },
      { label: "Meet the plants", href: "#plant-showcase" },
    ],
  },
  {
    id: "festive",
    eyebrow: "The Festive Edit",
    title: "Gifts that keep on growing.",
    accent: [3, 4],
    body: "Living gifts for the festive season — lucky bamboo, bonsai, peace lilies and more.",
    image: unsplash("photo-1490750967868-88aa4486c946"),
    alt: "A burst of bright orange flowers against soft green foliage",
    position: "50% 45%",
    ctas: [
      { label: "Shop festive gifts", href: "/shop?tags=festive", primary: true },
      { label: "All gifts", href: "/shop?tags=gift" },
    ],
  },
  {
    id: "lowlight",
    eyebrow: "The Low-Light Edit",
    title: "Low light? Still lush.",
    accent: [3],
    body: "Resilient greenery for north-facing rooms, hallways and the quieter corners of home.",
    image: unsplash("photo-1513694203232-719a280e022f"),
    alt: "A calm living room with a potted tree beside a sofa",
    position: "50% 60%",
    ctas: [
      { label: "Shop low light", href: "/shop?tags=low-light", primary: true },
      { label: "Read the guide", href: "/journal/low-light-guide" },
    ],
  },
];

/**
 * Immersive full-bleed hero carousel.
 * - Images crossfade (1.2s) while the active one slowly zooms 1.0 → 1.08 over
 *   the slide's lifetime; the whole layer drifts with scroll (parallax 0 → 18%).
 * - Headlines reveal word by word from a mask (0.9s, 60ms stagger), body and
 *   CTAs follow in a stagger (0.55s / 0.7s / 0.82s).
 * - Autoplay every 6.5s with per-slide filling progress bars (CSS timer that
 *   truly pauses/resumes). Paused when off-screen, when a control has focus,
 *   by the pause button, and never started for prefers-reduced-motion.
 */
export function Hero() {
  const [index, setIndexState] = useState(0);
  // The very first slide paints immediately (no opacity fade = fast LCP) but
  // still zooms and reveals its copy; later slides crossfade in.
  const [changed, setChanged] = useState(false);
  const setIndex = useCallback((next: number | ((i: number) => number)) => {
    setChanged(true);
    setIndexState(next);
  }, []);
  const [paused, setPaused] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = usePrefersReducedMotion();
  const autoplay = !paused && !focusWithin && inView && !reduce;

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const copyY = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const go = useCallback((dir: number) => setIndex((i) => (i + dir + slides.length) % slides.length), [setIndex]);
  const slide = slides[index];

  return (
    <section
      ref={ref}
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative isolate overflow-hidden bg-forest-950 text-ivory"
      onFocus={(e) => {
        if (e.target.matches(":focus-visible")) setFocusWithin(true);
      }}
      onBlur={() => setFocusWithin(false)}
    >
      <h1 className="sr-only">Pot Stories — houseplants, planters and living gifts</h1>
      <div className="relative h-[calc(100svh-6.5rem)] max-h-[52rem] min-h-[34rem] lg:h-[88svh] lg:max-h-[60rem] lg:min-h-[38rem]">
        {/* Media */}
        <motion.div className="absolute inset-0" style={reduce ? undefined : { y: imageY }}>
          <AnimatePresence>
            <motion.div
              key={slide.id}
              className="absolute inset-0"
              initial={{ opacity: changed ? 0 : 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1 }}
                animate={{ scale: reduce ? 1 : 1.1 }}
                transition={{ duration: (INTERVAL + 1500) / 1000, ease: "linear" }}
              >
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  preload={slide.id === slides[0].id}
                  fetchPriority={slide.id === slides[0].id ? "high" : undefined}
                  quality={75}
                  sizes="100vw"
                  className="object-cover"
                  style={{ objectPosition: slide.position }}
                />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
        {/* Legibility washes */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-950/90 via-forest-950/35 to-forest-950/10" />
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-forest-950/60 via-forest-950/10 to-transparent lg:block" />

        {/* Copy */}
        <motion.div
          className="container-page relative flex h-full flex-col justify-end pb-28 sm:pb-32 lg:pb-36"
          style={reduce ? undefined : { y: copyY, opacity: copyOpacity }}
        >
          <div className="max-w-[46rem]" aria-live={autoplay ? "off" : "polite"} aria-atomic="true">
            <AnimatePresence mode="wait">
              <motion.div key={slide.id} exit={{ opacity: 0, y: -14, transition: { duration: 0.35, ease: "easeIn" } }}>
                <motion.p
                  className="nav-caps inline-flex items-center gap-2 text-leaf"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: easeOutExpo }}
                >
                  <span aria-hidden className="h-px w-8 bg-leaf" />
                  {slide.eyebrow}
                </motion.p>
                <SplitWords
                  as="h2"
                  trigger="mount"
                  text={slide.title}
                  accent={slide.accent}
                  accentClassName="italic text-leaf"
                  delay={0.18}
                  className="display-heavy mt-4 text-[clamp(2.75rem,7.4vw,6.6rem)] leading-[0.95] text-ivory"
                />
                <motion.p
                  className="mt-5 max-w-md text-[0.98rem] leading-relaxed text-ivory/85 sm:text-[1.05rem]"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.55, ease: easeOutExpo }}
                >
                  {slide.body}
                </motion.p>
                <div className="mt-7 flex flex-wrap gap-2.5">
                  {slide.ctas.map((cta, i) => (
                    <motion.div
                      key={cta.href}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.7 + i * 0.12, ease: easeOutExpo }}
                    >
                      <Link
                        href={cta.href}
                        className={cn("btn group", cta.primary ? "btn-leaf" : "btn-outline border-ivory/60 text-ivory hover:bg-ivory/10")}
                      >
                        {cta.label}
                        {cta.primary && <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="container-page flex items-center gap-3 pb-6 sm:gap-5 sm:pb-8">
            <span className="hidden font-display text-sm text-ivory/80 tabular-nums sm:block" aria-hidden>
              {String(index + 1).padStart(2, "0")} <span className="text-ivory/40">/ {String(slides.length).padStart(2, "0")}</span>
            </span>
            <div className="flex flex-1 gap-2" role="group" aria-label="Choose slide">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Slide ${i + 1} of ${slides.length}: ${s.eyebrow}`}
                  aria-current={i === index}
                  className="group flex-1 py-3 text-left"
                >
                  <span className="relative block h-[3px] overflow-hidden rounded-full bg-ivory/25">
                    {i < index && <span className="absolute inset-0 bg-ivory/70" />}
                    {i === index && (
                      <span
                        key={`${index}-${reduce ? "r" : "a"}`}
                        className="ps-progress absolute inset-0 bg-leaf"
                        style={
                          {
                            "--progress-duration": `${INTERVAL}ms`,
                            animationPlayState: autoplay ? "running" : "paused",
                          } as CSSProperties
                        }
                        onAnimationEnd={() => go(1)}
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "mt-2 hidden truncate text-[0.7rem] font-semibold tracking-[0.08em] uppercase transition-colors md:block",
                      i === index ? "text-ivory" : "text-ivory/50 group-hover:text-ivory/80",
                    )}
                  >
                    {s.eyebrow}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {!reduce && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Play slideshow" : "Pause slideshow"}
                aria-pressed={paused}
                className="grid size-11 place-items-center rounded-full border border-ivory/30 text-ivory backdrop-blur-sm transition-colors hover:border-ivory hover:bg-ivory/10"
              >
                {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
              </button>
              )}
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous slide"
                className="grid size-11 place-items-center rounded-full border border-ivory/30 text-ivory backdrop-blur-sm transition-colors hover:border-ivory hover:bg-ivory/10"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next slide"
                className="grid size-11 place-items-center rounded-full border border-ivory/30 text-ivory backdrop-blur-sm transition-colors hover:border-ivory hover:bg-ivory/10"
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
