"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * Hydration-safe `prefers-reduced-motion`: renders `false` on the server and
 * during hydration (so markup matches), then switches to the real preference.
 * Use instead of framer's `useReducedMotion`, which reads the media query on
 * the first client render and causes hydration mismatches.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
