"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/format";

/** Hand-drawn style leaf outlines used as subtle decorative elements. */
export function LeafShape({ className, variant = 0 }: { className?: string; variant?: 0 | 1 | 2 }) {
  const paths = [
    "M50 4C22 26 12 56 22 92c4 0 8-1 12-3C30 62 36 36 50 4Zm0 0c26 24 34 54 24 88-14 6-28 6-40 0",
    "M10 90C14 50 40 18 92 8c-6 46-34 76-82 82Zm0 0L70 30",
    "M50 96V40M50 40C30 34 18 20 16 4c18 2 30 14 34 36Zm0 0c20-6 32-20 34-36-18 2-30 14-34 36Zm0 20c-16-4-28-14-32-28 16 0 28 10 32 28Zm0 0c16-4 28-14 32-28-16 0-28 10-32 28Z",
  ];
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden className={className}>
      <path d={paths[variant]} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface FloatingLeafProps {
  className?: string;
  variant?: 0 | 1 | 2;
  duration?: number;
  delay?: number;
  drift?: number;
  rotate?: number;
}

export function FloatingLeaf({ className, variant = 0, duration = 9, delay = 0, drift = 14, rotate = 8 }: FloatingLeafProps) {
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, y: [0, -drift, 0], rotate: [0, rotate, 0] }}
      transition={{
        opacity: { duration: 1.6, delay },
        y: { duration, repeat: Infinity, ease: "easeInOut", delay },
        rotate: { duration: duration * 1.3, repeat: Infinity, ease: "easeInOut", delay },
      }}
    >
      <LeafShape variant={variant} className="h-full w-full" />
    </motion.div>
  );
}
