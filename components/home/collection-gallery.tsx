"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { unsplash } from "@/lib/products";
import { cn } from "@/lib/format";

const collections = [
  { title: "Statement plants", sub: "Big leaves, bold silhouettes", href: "/shop?tags=statement", image: "photo-1545241047-6083a3684587", alt: "A monstera on a wooden stool beside a white chair", shape: "tall" },
  { title: "Low-light heroes", sub: "For the quieter corners", href: "/shop?tags=low-light", image: "photo-1604762524889-3e2fcc145683", alt: "Snake plants and ZZ plants on a sideboard", shape: "wide" },
  { title: "Succulents & cacti", sub: "Sun-lovers, low fuss", href: "/shop?category=succulents", image: "photo-1558603668-6570496b66f8", alt: "A tall cactus in a woven basket in a boho living room", shape: "tall" },
  { title: "Hanging & trailing", sub: "Shelves, ledges, macramé", href: "/shop?category=hanging", image: "photo-1530968464165-7a1861cbaf9f", alt: "Shelves of houseplants with trailing vines", shape: "square" },
  { title: "Bonsai", sub: "Patience, potted", href: "/shop?category=bonsai", image: "photo-1617576683096-00fc8eecb3af", alt: "Hands pruning a small plant with secateurs", shape: "tall" },
  { title: "Herbs & edibles", sub: "Grow it, cook it", href: "/shop?category=herbs", image: "photo-1523348837708-15d4a09cfac2", alt: "Young seedlings growing in small pots", shape: "wide" },
  { title: "Outdoor & balcony", sub: "Hardy greens for open air", href: "/shop?category=outdoor", image: "photo-1557429287-b2e26467fc2b", alt: "A cottage garden full of flowering shrubs", shape: "tall" },
  { title: "Seeds & kits", sub: "Start something small", href: "/shop?category=kits", image: "photo-1625758476104-f2ed6c81248f", alt: "A hand holding a young seedling in soil", shape: "square" },
] as const;

const ENHANCED_QUERY = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const shapeClass = {
  tall: "w-[72vw] sm:w-[19rem] lg:w-auto lg:h-[min(52svh,30rem)] aspect-[3/4]",
  wide: "w-[84vw] sm:w-[26rem] lg:w-auto lg:h-[min(40svh,23rem)] aspect-[4/3]",
  square: "w-[72vw] sm:w-[20rem] lg:w-auto lg:h-[min(44svh,25rem)] aspect-square",
};

/**
 * Visual collection gallery. Desktop (≥1024px, motion allowed): GSAP
 * ScrollTrigger pins the section and scrubs the track horizontally (scrub 0.8s)
 * while each image drifts inside its frame (containerAnimation parallax) and a
 * progress line fills. Mobile and reduced motion: a native swipeable snap row.
 */
export function CollectionGallery() {
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const enhanced = useMediaQuery(ENHANCED_QUERY);

  useEffect(() => {
    if (!enhanced) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      const pin = pinRef.current;
      const track = trackRef.current;
      if (!pin || !track) return;
      const distance = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: pin,
          pin: true,
          start: "top top",
          end: () => `+=${distance()}`,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });

      gsap.fromTo(
        progressRef.current,
        { scaleX: 0 },
        { scaleX: 1, ease: "none", scrollTrigger: { trigger: pin, start: "top top", end: () => `+=${distance()}`, scrub: true, invalidateOnRefresh: true } },
      );

      gsap.utils.toArray<HTMLElement>("[data-gallery-img]", track).forEach((img) => {
        gsap.fromTo(
          img,
          { xPercent: -7 },
          {
            xPercent: 7,
            ease: "none",
            scrollTrigger: { trigger: img.parentElement, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
          },
        );
      });
    }, pinRef);
    // Layout above may settle after fonts load.
    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => {});
    return () => ctx.revert();
  }, [enhanced]);

  return (
    <section aria-labelledby="gallery-title" className="relative z-10 -mt-8 rounded-t-[2.5rem] bg-forest-900 text-ivory sm:-mt-10 sm:rounded-t-[3.5rem]">
      <div ref={pinRef} className={cn("relative overflow-hidden", enhanced ? "flex h-svh flex-col justify-center pt-20" : "py-16 sm:py-24")}>
        <div className="container-page mb-8 flex flex-col gap-4 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow text-leaf">Explore by mood</p>
            <h2 id="gallery-title" className="display-heavy mt-3 text-[clamp(2.2rem,5vw,4.4rem)]">
              Shop the <span className="text-leaf italic">collections</span>
            </h2>
          </div>
          <p className="max-w-sm text-[0.95rem] leading-relaxed text-sage-200">
            {enhanced ? "Keep scrolling to wander the collections." : "Swipe through the collections and find your corner of green."}
          </p>
        </div>

        <div
          ref={trackRef}
          className={cn(
            "flex items-end gap-4 sm:gap-6",
            enhanced
              ? "w-max px-[max(1.25rem,calc((100vw-88rem)/2+3rem))] will-change-transform"
              : "no-scrollbar snap-x snap-mandatory overflow-x-auto scroll-px-5 px-5 pb-2 sm:scroll-px-8 sm:px-8 xl:scroll-px-12 xl:px-12",
          )}
        >
          {collections.map((c, i) => (
            <Link key={c.href} href={c.href} className={cn("group shrink-0 snap-start", shapeClass[c.shape])}>
              <span className="relative block h-full overflow-hidden rounded-[1.5rem] bg-forest-800">
                <span data-gallery-img className="absolute -inset-x-[10%] inset-y-0 block">
                  <Image
                    src={unsplash(c.image)}
                    alt={c.alt}
                    fill
                    sizes="(min-width: 1024px) 32rem, 84vw"
                    className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.06]"
                  />
                </span>
                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-transparent" />
                <span className="absolute top-4 left-4 font-display text-sm text-ivory/80 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-ivory/15 text-ivory backdrop-blur transition-colors group-hover:bg-leaf group-hover:text-forest-900">
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
                <span className="absolute inset-x-0 bottom-0 p-5">
                  <span className="display-heavy block text-[1.7rem] leading-none sm:text-[2rem]">{c.title}</span>
                  <span className="mt-1.5 block text-sm text-sage-200">{c.sub}</span>
                </span>
              </span>
            </Link>
          ))}
          <Link
            href="/shop"
            className="group grid aspect-[3/4] w-[60vw] shrink-0 snap-start place-items-center rounded-[1.5rem] border border-ivory/20 p-6 text-center transition-colors hover:border-leaf sm:w-[16rem] lg:h-[min(40svh,23rem)] lg:w-auto"
          >
            <span>
              <span className="display-heavy block text-[2rem] leading-none">Every plant, pot & kit</span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-leaf">
                Shop all <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </span>
          </Link>
        </div>

        <div className="container-page mt-8" aria-hidden>
          <span className="block h-px w-full bg-ivory/15">
            <span ref={progressRef} className={cn("block h-full origin-left bg-leaf", enhanced ? "scale-x-0" : "scale-x-100 opacity-0")} />
          </span>
        </div>
      </div>
    </section>
  );
}
