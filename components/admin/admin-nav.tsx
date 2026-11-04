"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, FolderTree, Leaf, Mail, Package, Users } from "lucide-react";
import { cn } from "@/lib/format";

const ADMIN_LINKS = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/products", label: "Products", icon: Leaf },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
] as const;

const isActive = (pathname: string | null, href: string) =>
  href === "/admin" ? pathname === "/admin" : pathname === href || !!pathname?.startsWith(`${href}/`);

/** Desktop sidebar links. Pass `pathname={null}` for the static fallback. */
export function AdminSidebarNav({ static: isStatic = false }: { static?: boolean }) {
  return isStatic ? <SidebarList pathname={null} /> : <SidebarWithPath />;
}

function SidebarWithPath() {
  return <SidebarList pathname={usePathname()} />;
}

function SidebarList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="space-y-0.5">
      {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href} className="relative">
            {active && (
              <motion.span
                layoutId="admin-nav-active"
                className="absolute inset-0 rounded-xl bg-forest-800"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                aria-hidden
              />
            )}
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                active ? "text-ivory" : "text-forest-800 hover:bg-sage-100",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Mobile: horizontally scrolling tabs. */
export function AdminTabsNav({ static: isStatic = false }: { static?: boolean }) {
  return isStatic ? <TabsList pathname={null} /> : <TabsWithPath />;
}

function TabsWithPath() {
  return <TabsList pathname={usePathname()} />;
}

function TabsList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {ADMIN_LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors",
                active ? "border-forest-800 bg-forest-800 text-ivory" : "border-oat bg-card text-forest-800 hover:bg-sage-100",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
