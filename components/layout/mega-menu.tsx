"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { NavMenu } from "@/lib/content";

const drop = [0.165, 0.84, 0.44, 1] as const;

interface MegaMenuProps {
  menu: NavMenu | null;
  onNavigate: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

/**
 * Full-width dropdown panel: fades in (0.3s, 50ms delay) while dropping 10px
 * (0.25s). Switching between menus glides the panel height (0.35s) and
 * cascades the new columns in (40ms stagger).
 */
export function MegaMenu({
  menu,
  onNavigate,
  onPointerEnter,
  onPointerLeave,
}: MegaMenuProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [menu]);
  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          key="mega"
          id="mega-menu"
          initial={{ opacity: 0, y: -10 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: {
              opacity: { duration: 0.3, delay: 0.05 },
              y: { duration: 0.25, delay: 0.05, ease: drop },
            },
          }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          onMouseEnter={onPointerEnter}
          onMouseLeave={onPointerLeave}
          className="absolute inset-x-0 top-full hidden border-t border-forest-900/10 bg-card shadow-[0_24px_40px_-28px_rgba(20,40,29,0.45)] lg:block"
        >
          <motion.div
            className="overflow-hidden"
            initial={false}
            animate={{ height }}
            transition={{ duration: 0.35, ease: drop }}
          >
            <div ref={contentRef}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={menu.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="container-page flex gap-12 py-9"
                >
                  <div className="grid flex-1 grid-cols-5 gap-8">
                    {menu.columns.map((col, i) => (
                      <motion.div
                        key={col.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.06 + i * 0.04,
                          ease: drop,
                        }}
                      >
                        <p className="mb-3 text-[0.9rem] font-bold text-forest-900">
                          {col.title}
                        </p>
                        <ul className="space-y-2">
                          {col.links.map((link) => (
                            <li key={link.href}>
                              <Link
                                href={link.href}
                                onClick={onNavigate}
                                className="text-[0.86rem] text-forest-800/85 underline-offset-4 transition-colors hover:text-forest-900 hover:underline"
                              >
                                {link.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    ))}
                  </div>
                  {menu.feature && (
                    <motion.div
                      className="shrink-0"
                      initial={{
                        opacity: 0,
                        clipPath: "inset(0 0 100% 0 round 14px)",
                      }}
                      animate={{
                        opacity: 1,
                        clipPath: "inset(0 0 0% 0 round 14px)",
                      }}
                      transition={{ duration: 0.6, delay: 0.12, ease: drop }}
                    >
                      <Link
                        href={menu.feature.href}
                        onClick={onNavigate}
                        className="group relative block h-56 w-[22rem] shrink-0 overflow-hidden rounded-[14px] bg-forest-800"
                      >
                        <Image
                          src={menu.feature.image}
                          alt={menu.feature.alt}
                          fill
                          sizes="352px"
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-forest-950/75 to-transparent" />
                        <span className="absolute inset-x-5 bottom-5 text-ivory">
                          <span className="nav-caps block text-leaf">
                            {menu.feature.eyebrow}
                          </span>
                          <span className="mt-1 flex items-center gap-2 font-display text-xl font-semibold">
                            {menu.feature.title}
                            <ArrowRight
                              className="size-4 transition-transform group-hover:translate-x-1"
                              aria-hidden
                            />
                          </span>
                        </span>
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
