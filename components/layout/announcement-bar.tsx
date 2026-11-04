"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { announcements } from "@/lib/content";

/** Rotating promo strip — messages crossfade every 5s (0.5s fade), pausing on hover/focus. */
export function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (paused || reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % announcements.length), 5000);
    return () => window.clearInterval(id);
  }, [paused, reduce]);

  const message = announcements[index];

  return (
    <div
      className="bg-clay text-ivory"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-page relative flex h-9 items-center justify-center overflow-hidden text-center text-[0.74rem] font-semibold tracking-[0.04em]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="truncate"
          >
            <Link href={message.href} className="underline-offset-4 hover:underline">
              {message.label}
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
