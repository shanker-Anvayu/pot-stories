"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

interface RevealProps extends HTMLMotionProps<"div"> {
  delay?: number;
  y?: number;
}

const rise = [0.26, 0.54, 0.32, 1] as const;

/** Subtle "rise-up" reveal: 10px lift + fade as content enters the viewport. */
export function Reveal({ delay = 0, y = 10, children, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ opacity: { duration: 0.5, delay }, y: { duration: 0.7, delay, ease: rise } }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export const staggerParent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerChild = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { opacity: { duration: 0.5 }, y: { duration: 0.7, ease: rise } } },
};
