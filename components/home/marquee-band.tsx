"use client";

import { Marquee } from "@/components/motion/marquee";
import { LeafShape } from "@/components/ui/botanical";

const phrases = [
  { text: "Rooted in care", italic: false },
  { text: "Easy-care greens", italic: true },
  { text: "Pet-friendly picks", italic: false },
  { text: "Living gifts", italic: true },
  { text: "Low-light heroes", italic: false },
  { text: "Care notes with every plant", italic: true },
  { text: "Planters & grow kits", italic: false },
];

/**
 * Brand band between the hero and the shop: a fast, constant-speed marquee
 * (110 px/s on every screen — duration derived from the measured width).
 */
export function MarqueeBand() {
  return (
    <section aria-label="What Pot Stories is about" className="relative z-10 border-y border-forest-800 bg-forest-900 py-4 text-ivory sm:py-5">
      <Marquee speed={110} gap={36} label="Pot Stories highlights">
        {phrases.map((p, i) => (
          <span key={p.text} className="flex items-center gap-9">
            <span
              className={
                p.italic
                  ? "font-display text-[clamp(1.35rem,2.6vw,2.2rem)] leading-none whitespace-nowrap text-leaf italic"
                  : "display-heavy text-[clamp(1.35rem,2.6vw,2.2rem)] leading-none whitespace-nowrap"
              }
            >
              {p.text}
            </span>
            <LeafShape variant={(i % 3) as 0 | 1 | 2} className="size-6 shrink-0 text-sage-300/70 sm:size-7" />
          </span>
        ))}
      </Marquee>
    </section>
  );
}
