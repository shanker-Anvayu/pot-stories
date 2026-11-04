"use client";

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/format";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

interface MarqueeProps {
  children: ReactNode;
  /** Constant speed in CSS pixels per second (same on every screen width). */
  speed?: number;
  /** Gap between items and between copies, in px — keeps the seam identical. */
  gap?: number;
  pauseOnHover?: boolean;
  className?: string;
  /** Accessible label for the strip; duplicate copies are hidden from AT. */
  label?: string;
}

/**
 * Seamless, constant-speed marquee.
 *
 * One copy of the content is measured; enough copies are rendered to cover the
 * viewport plus one, and the track translates by exactly one copy width. The
 * duration is `copyWidth / speed`, so perceived speed is a fixed px/s on any
 * screen. Runs as a compositor-only CSS animation, pauses off-screen
 * (IntersectionObserver) and is static for prefers-reduced-motion.
 */
export function Marquee({ children, speed = 100, gap = 48, pauseOnHover = true, className, label }: MarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const reduce = usePrefersReducedMotion();
  const [metrics, setMetrics] = useState<{ width: number; copies: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const copy = copyRef.current;
    if (!root || !copy) return;
    const measure = () => {
      const width = copy.getBoundingClientRect().width;
      if (!width) return;
      const copies = Math.max(2, Math.ceil(root.clientWidth / width) + 1);
      setMetrics((m) => (m && Math.abs(m.width - width) < 0.5 && m.copies === copies ? m : { width, copies }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(copy);
    // Web fonts can change the measured width after first paint.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px 0px" });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const copies = reduce ? 1 : (metrics?.copies ?? 2);
  const style = metrics
    ? ({ "--marquee-shift": `${metrics.width}px`, "--marquee-duration": `${metrics.width / speed}s` } as CSSProperties)
    : undefined;

  return (
    <div
      ref={rootRef}
      className={cn("ps-marquee relative overflow-hidden", reduce && "overflow-x-auto no-scrollbar", className)}
      data-running={!reduce && !!metrics && visible}
      data-hover-pause={pauseOnHover}
      data-speed={speed}
      role={label ? "region" : undefined}
      aria-label={label}
    >
      <div className="ps-marquee-track flex w-max" style={style}>
        {Array.from({ length: copies }, (_, i) => (
          <div
            key={i}
            ref={i === 0 ? copyRef : undefined}
            aria-hidden={i > 0 || undefined}
            inert={i > 0 || undefined}
            className="flex shrink-0 items-center"
            style={{ gap, paddingRight: gap }}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
