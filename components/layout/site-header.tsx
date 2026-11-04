"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ChevronDown, Heart, Search, ShoppingBag, User } from "lucide-react";
import { Suspense, useCallback, useRef, useState } from "react";
import { useUI } from "@/components/providers/ui-provider";
import { useSession } from "@/components/providers/session-provider";
import { useCartSummary, useStore } from "@/lib/store";
import { navLinks, navMenus } from "@/lib/content";
import { cn } from "@/lib/format";
import { AnnouncementBar } from "./announcement-bar";
import { MegaMenu } from "./mega-menu";
import { MenuIcon, MobileNav, MobileNavScrim } from "./mobile-nav";
import { DesktopSearch, MobileSearch, SearchScrim } from "./search-overlay";
import { Wordmark } from "./wordmark";

function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ type: "spring", stiffness: 520, damping: 18 }}
          className="absolute -top-1 -right-1.5 grid h-[1.1rem] min-w-[1.1rem] place-items-center rounded-full bg-clay px-1 text-[0.6rem] font-bold text-ivory"
        >
          {count}
          <span className="sr-only"> {label}</span>
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Nav label with the grow-from-left underline used for hover and active states. */
function Underline({ show }: { show: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-x-3 -bottom-px h-[2px] origin-left rounded-full bg-forest-900 transition-transform duration-300 ease-[cubic-bezier(.165,.84,.44,1)]",
        show ? "scale-x-100" : "scale-x-0 group-hover/nav:scale-x-100",
      )}
    />
  );
}

function NavLinkItems({ pathname, onEnter, onNavigate }: { pathname: string; onEnter: () => void; onNavigate: () => void }) {
  return (
    <>
      {navLinks.map((link) => {
        const current = pathname.startsWith(link.href);
        return (
          <li key={link.href} className="relative flex" onMouseEnter={onEnter}>
            <Link
              href={link.href}
              aria-current={current ? "page" : undefined}
              onClick={onNavigate}
              className="group/nav nav-caps relative flex items-center px-3 text-forest-900"
            >
              {link.label}
              <Underline show={current} />
            </Link>
          </li>
        );
      })}
    </>
  );
}

function ActiveNavLinks(props: { onEnter: () => void; onNavigate: () => void }) {
  return <NavLinkItems pathname={usePathname()} {...props} />;
}

export function SiteHeader() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const { openCart, searchOpen, openSearch, closeSearch } = useUI();
  const { count } = useCartSummary();
  const { wishlist } = useStore();
  const { user } = useSession();
  const initial = (user?.fullName?.trim() || user?.email || "").charAt(0).toUpperCase();

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 4));

  const openMenu = (id: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMenuId(id), menuId ? 0 : 90);
  };
  const scheduleClose = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMenuId(null), 160);
  };
  const keepOpen = () => window.clearTimeout(timer.current);
  const closeAll = useCallback(() => {
    window.clearTimeout(timer.current);
    setMenuId(null);
  }, []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const activeMenu = navMenus.find((m) => m.id === menuId) ?? null;

  return (
    <>
      <SearchScrim />
      <MobileNavScrim open={mobileOpen} onClose={closeMobile} />
      <header
        className={cn("sticky top-0 z-40 bg-card transition-shadow duration-300", scrolled && "shadow-[0_8px_24px_-18px_rgba(20,40,29,0.55)]")}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            closeAll();
            setMobileOpen(false);
          }
        }}
      >
        <AnnouncementBar />

        {/* Top row */}
        <div className="relative border-b border-forest-900/10 bg-card">
          <div className="container-page grid h-14 grid-cols-[auto_1fr_auto] min-[400px]:grid-cols-[1fr_auto_1fr] items-center gap-3 lg:flex lg:h-[4.25rem] lg:justify-between">
            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={() => {
                  closeSearch();
                  setMobileOpen((o) => !o);
                }}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                className="-ml-2 grid size-10 place-items-center rounded-full text-forest-900"
              >
                <MenuIcon open={mobileOpen} />
              </button>
            </div>

            <Link href="/" aria-label="Pot Stories — home" onClick={() => setMobileOpen(false)} className="justify-self-center text-forest-900">
              <Wordmark className="text-[0.95rem]! min-[360px]:text-[1.15rem]! lg:text-[1.45rem]!" />
            </Link>

            <div className="flex items-center justify-end gap-0 sm:gap-0.5 lg:gap-2">
              <div className="hidden lg:block">
                <DesktopSearch />
              </div>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  if (searchOpen) closeSearch();
                  else openSearch();
                }}
                aria-label="Search plants"
                aria-expanded={searchOpen}
                className="grid size-9 place-items-center rounded-full text-forest-900 sm:size-10 lg:hidden"
              >
                <Search className="size-[1.2rem]" aria-hidden />
              </button>
              <Link
                href="/wishlist"
                aria-label="Wishlist"
                className="relative grid size-9 place-items-center rounded-full text-forest-900 transition-colors hover:bg-sage-100 max-[359px]:hidden sm:size-10"
              >
                <Heart className="size-[1.2rem]" aria-hidden />
                <CountBadge count={wishlist.length} label="saved items" />
              </Link>
              <Link
                href="/account"
                aria-label={user ? "Account" : "Sign in"}
                className="relative hidden size-10 place-items-center rounded-full text-forest-900 transition-colors hover:bg-sage-100 sm:grid"
              >
                <User className="size-[1.2rem]" aria-hidden />
                {user && initial && (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1.5 grid size-[1.1rem] place-items-center rounded-full bg-forest-900 text-[0.6rem] font-bold text-ivory"
                  >
                    {initial}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openCart();
                }}
                aria-label="Open shopping bag"
                className="group/bag relative flex h-10 items-center gap-2 rounded-full px-1.5 text-forest-900 sm:px-2 transition-colors hover:bg-sage-100 lg:px-3"
              >
                <span className="relative">
                  <ShoppingBag className="size-[1.2rem]" aria-hidden />
                  <CountBadge count={count} label="items in bag" />
                </span>
                <span className="nav-caps hidden lg:inline">Bag</span>
              </button>
            </div>
          </div>

          <MobileSearch />
          <MobileNav open={mobileOpen} onClose={closeMobile} />
        </div>

        {/* Desktop navigation row */}
        <nav aria-label="Primary" className="relative hidden border-b border-forest-900/10 bg-card lg:block" onMouseLeave={scheduleClose}>
          <ul className="container-page flex h-11 items-stretch gap-1">
            {navMenus.map((menu) => {
              const open = menuId === menu.id;
              return (
                <li key={menu.id} className="relative flex" onMouseEnter={() => openMenu(menu.id)}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls="mega-menu"
                    onClick={() => setMenuId(open ? null : menu.id)}
                    className="group/nav nav-caps relative flex items-center gap-1 px-3 text-forest-900"
                  >
                    {menu.label}
                    <ChevronDown className={cn("size-3.5 transition-transform duration-300", open && "rotate-180")} aria-hidden />
                    <Underline show={open} />
                  </button>
                </li>
              );
            })}
            {/* usePathname suspends on routes with request-time params (e.g. /account/orders/[id]). */}
            <Suspense fallback={<NavLinkItems pathname="" onEnter={scheduleClose} onNavigate={closeAll} />}>
              <ActiveNavLinks onEnter={scheduleClose} onNavigate={closeAll} />
            </Suspense>
          </ul>
          <MegaMenu menu={activeMenu} onNavigate={closeAll} onPointerEnter={keepOpen} onPointerLeave={scheduleClose} />
        </nav>
      </header>
    </>
  );
}
