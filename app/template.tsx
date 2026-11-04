"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/** Set after the first page has hydrated; later templates are client-side navigations. */
let hydrated = false;

/**
 * Quick opacity fade between routes (opacity only, so sticky/fixed children are
 * unaffected). The first page load is NOT faded: server HTML must be visible
 * immediately, and the hero runs its own entrance animation.
 */
export default function Template({ children }: { children: ReactNode }) {
  const [animate] = useState(() => hydrated);
  useEffect(() => {
    hydrated = true;
  }, []);
  return (
    <motion.div initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
