"use client";

import Image, { type ImageProps } from "next/image";
import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

/** next/image that fades in once the file has actually loaded (no pop-in). */
export function FadeImage({ className, onLoad, alt, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      {...props}
      alt={alt}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={cn("transition-opacity duration-500 ease-in-out motion-reduce:transition-none", loaded ? "opacity-100" : "opacity-0", className)}
    />
  );
}

/**
 * Zoom-fade reveal for banner media: scales from 1.1 → 1 while fading in
 * (1s) the first time it scrolls into view.
 */
export function ZoomReveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 1.1 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 1, ease: [0.26, 0.54, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}
