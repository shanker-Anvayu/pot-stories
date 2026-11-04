"use client";

import { motion, useInView, useScroll, useTransform, type MotionValue } from "framer-motion";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { easeOutExpo } from "./text-reveal";

type From = "bottom" | "top" | "left" | "right";

const insetFrom: Record<From, string> = {
  bottom: "inset(100% 0% 0% 0%)",
  top: "inset(0% 0% 100% 0%)",
  left: "inset(0% 100% 0% 0%)",
  right: "inset(0% 0% 0% 100%)",
};

interface MaskRevealProps {
  children: ReactNode;
  className?: string;
  from?: From;
  delay?: number;
  /** Seconds for the wipe (default 1.1). */
  duration?: number;
}

/**
 * Image mask reveal: a clip-path inset wipe (1.1s expo-out) while the media
 * inside settles from 1.18× to 1×. Plays once when 15% of it is visible.
 */
export function MaskReveal({ children, className, from = "bottom", delay = 0, duration = 1.1 }: MaskRevealProps) {
  // Observe an unclipped wrapper: IntersectionObserver ignores fully clipped targets.
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const reduce = usePrefersReducedMotion();
  if (reduce) return <div className={cn("overflow-hidden", className)}>{children}</div>;
  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      <motion.div
        className="absolute inset-0"
        initial={{ clipPath: insetFrom[from] }}
        animate={inView ? { clipPath: "inset(0% 0% 0% 0%)" } : undefined}
        transition={{ duration, delay, ease: easeOutExpo }}
      >
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.18 }}
          animate={inView ? { scale: 1 } : undefined}
          transition={{ duration: duration + 0.5, delay, ease: easeOutExpo }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}

interface ParallaxProps {
  children: ReactNode;
  className?: string;
  /** Total vertical travel as a % of the element height (default 14). */
  amount?: number;
  /** Scale while the element travels through the viewport [enter, leave]. */
  scale?: [number, number];
}

/**
 * Scroll-linked parallax for media inside an overflow-hidden frame: the
 * layer drifts against the scroll and (optionally) eases its scale. Uses
 * framer's scroll-driven motion values — no work happens while not scrolling.
 */
export function Parallax({ children, className, amount = 14, scale }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`-${amount / 2}%`, `${amount / 2}%`]);
  const s = useTransform(scrollYProgress, [0, 1], scale ?? [1, 1]);
  return (
    <div ref={ref} className={cn("absolute inset-0 overflow-hidden", className)}>
      <motion.div
        className="absolute inset-x-0"
        style={
          reduce
            ? { top: 0, bottom: 0 }
            : { top: `-${amount / 2}%`, bottom: `-${amount / 2}%`, y, scale: s as MotionValue<number> }
        }
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Stagger container + child variants for card/text entrances. */
export const revealParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
export const revealChild = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { opacity: { duration: 0.6 }, y: { duration: 0.9, ease: easeOutExpo } } },
};
