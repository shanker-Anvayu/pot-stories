"use client";

import { motion, type Variants } from "framer-motion";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
import { Fragment } from "react";
import { cn } from "@/lib/format";

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const tags = { h1: motion.h1, h2: motion.h2, h3: motion.h3, p: motion.p, span: motion.span };

interface SplitWordsProps {
  text: string;
  /** Indexes of words to render with `accentClassName`. */
  accent?: number[];
  accentClassName?: string;
  className?: string;
  as?: keyof typeof tags;
  id?: string;
  /** Seconds before the first word starts. */
  delay?: number;
  /** Seconds between words. */
  stagger?: number;
  /** "mount" animates immediately (hero); "view" waits for the viewport. */
  trigger?: "mount" | "view";
}

/**
 * Masked word-by-word headline reveal: every word sits in an overflow-hidden
 * line box and rises from 110% below its mask (0.9s expo-out, 60ms stagger).
 * The full sentence stays in the accessibility tree as one string.
 */
export function SplitWords({
  text,
  accent = [],
  accentClassName,
  className,
  as = "span",
  id,
  delay = 0,
  stagger = 0.06,
  trigger = "view",
}: SplitWordsProps) {
  const reduce = usePrefersReducedMotion();
  const words = text.split(" ");
  const parent: Variants = { hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } };
  const child: Variants = reduce
    ? { hidden: { opacity: 0, y: "0%" }, show: { opacity: 1, y: "0%", transition: { duration: 0.4 } } }
    : { hidden: { y: "110%" }, show: { y: "0%", transition: { duration: 0.9, ease: easeOutExpo } } };
  const MotionTag = tags[as];
  const viewProps =
    trigger === "view"
      ? { initial: "hidden", whileInView: "show", viewport: { once: true, margin: "0px 0px -10% 0px" } }
      : { initial: "hidden", animate: "show" };

  return (
    <MotionTag id={id} className={className} aria-label={text} variants={parent} {...viewProps}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom -mb-[0.08em]">
            <motion.span variants={child} className={cn("inline-block", accent.includes(i) && accentClassName)}>
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </MotionTag>
  );
}
