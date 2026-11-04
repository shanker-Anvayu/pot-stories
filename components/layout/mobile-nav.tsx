"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Heart, LifeBuoy, User } from "lucide-react";
import { useState } from "react";
import { navLinks, navMenus } from "@/lib/content";
import { useStore } from "@/lib/store";
import { useSession } from "@/components/providers/session-provider";

const curve = [0.165, 0.84, 0.44, 1] as const;

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

/** Animated hamburger that morphs into a close icon. */
export function MenuIcon({ open }: { open: boolean }) {
  const t = { duration: 0.3, ease: curve };
  return (
    <span className="relative block h-3.5 w-5" aria-hidden>
      <motion.span className="absolute left-0 h-[2px] w-5 rounded-full bg-current" initial={false} animate={open ? { top: 6, rotate: 45 } : { top: 0, rotate: 0 }} transition={t} />
      <motion.span className="absolute top-[6px] left-0 h-[2px] w-5 rounded-full bg-current" initial={false} animate={{ opacity: open ? 0 : 1, scaleX: open ? 0.3 : 1 }} transition={{ duration: 0.2 }} />
      <motion.span className="absolute left-0 h-[2px] w-5 rounded-full bg-current" initial={false} animate={open ? { top: 6, rotate: -45 } : { top: 12, rotate: 0 }} transition={t} />
    </span>
  );
}

/**
 * Mobile menu: drops down beneath the sticky header (height 0.25s), the list
 * fades/rises in after 150ms, and sub-menus slide in horizontally.
 */
export function MobileNav({ open, onClose }: MobileNavProps) {
  const [submenu, setSubmenu] = useState<string | null>(null);
  const { wishlist } = useStore();
  const { user } = useSession();
  const active = navMenus.find((m) => m.id === submenu);

  return (
    <AnimatePresence onExitComplete={() => setSubmenu(null)}>
      {open && (
          <motion.nav
            key="panel"
            id="mobile-nav"
            aria-label="Mobile"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0, transition: { duration: 0.25, ease: curve, delay: 0.05 } }}
            transition={{ duration: 0.3, ease: curve }}
            className="absolute inset-x-0 top-full overflow-hidden border-t border-forest-900/10 bg-ivory shadow-[0_24px_40px_-24px_rgba(14,29,21,0.5)] lg:hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0, transition: { opacity: { duration: 0.3, delay: 0.15 }, y: { duration: 0.25, delay: 0.15, ease: curve } } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="max-h-[calc(100svh-7rem)] overflow-y-auto p-3"
            >
              <div className="relative overflow-hidden rounded-[14px] bg-card">
                <AnimatePresence initial={false} mode="popLayout">
                  {!active ? (
                    <motion.ul
                      key="root"
                      initial={{ x: "-30%", opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: "-30%", opacity: 0 }}
                      transition={{ duration: 0.25, ease: curve }}
                      className="py-2"
                    >
                      {navMenus.map((menu) => (
                        <li key={menu.id}>
                          <button
                            type="button"
                            onClick={() => setSubmenu(menu.id)}
                            className="flex w-full items-center justify-between px-4 py-3.5 text-[0.98rem] font-semibold text-forest-900 active:bg-sage-100"
                          >
                            {menu.label}
                            <ChevronRight className="size-4" aria-hidden />
                          </button>
                        </li>
                      ))}
                      {navLinks.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={onClose}
                            className="flex items-center justify-between px-4 py-3.5 text-[0.98rem] font-semibold text-forest-900 active:bg-sage-100"
                          >
                            {link.label}
                            <ChevronRight className="size-4 opacity-40" aria-hidden />
                          </Link>
                        </li>
                      ))}
                      <li className="mx-4 my-2 border-t border-forest-900/10" aria-hidden />
                      <li>
                        <Link href="/wishlist" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-[0.92rem] text-forest-900">
                          <Heart className="size-4" aria-hidden /> Wishlist {wishlist.length > 0 && <span className="text-moss">({wishlist.length})</span>}
                        </Link>
                      </li>
                      <li>
                        <Link href="/account" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-[0.92rem] text-forest-900">
                          <User className="size-4" aria-hidden /> {user ? "Account" : "Sign in"}
                          {user && <span className="truncate text-moss">({user.fullName || user.email})</span>}
                        </Link>
                      </li>
                      <li>
                        <Link href="/help" onClick={onClose} className="flex items-center gap-3 px-4 py-3 text-[0.92rem] text-forest-900">
                          <LifeBuoy className="size-4" aria-hidden /> Help &amp; FAQ
                        </Link>
                      </li>
                    </motion.ul>
                  ) : (
                    <motion.div
                      key={active.id}
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ duration: 0.25, ease: curve }}
                      className="py-2"
                    >
                      <button
                        type="button"
                        onClick={() => setSubmenu(null)}
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-bold text-forest-900"
                      >
                        <ChevronLeft className="size-4" aria-hidden /> {active.label}
                      </button>
                      {active.columns.map((col) => (
                        <div key={col.title} className="border-t border-forest-900/8 px-4 py-3">
                          <p className="nav-caps mb-2 text-moss">{col.title}</p>
                          <ul>
                            {col.links.map((link) => (
                              <li key={link.href}>
                                <Link href={link.href} onClick={onClose} className="block py-2 text-[0.95rem] text-forest-900">
                                  {link.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.nav>
      )}
    </AnimatePresence>
  );
}

/** Dims the page while the mobile menu is open (rendered outside the header). */
export function MobileNavScrim({ open, onClose }: MobileNavProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          aria-hidden
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-30 bg-forest-950/40 lg:hidden"
        />
      )}
    </AnimatePresence>
  );
}
