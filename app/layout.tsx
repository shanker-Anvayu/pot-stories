import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { UIProvider } from "@/components/providers/ui-provider";
import { CatalogProvider } from "@/components/providers/catalog-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { getCatalog } from "@/lib/server/catalog";
import { isReadOnlyPreview } from "@/lib/server/env";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { QuickView } from "@/components/product/quick-view";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pot Stories — Plants, potted with care",
    template: "%s · Pot Stories",
  },
  description:
    "Pot Stories is a botanical store for indoor and outdoor plants, succulents, bonsai, gifts and thoughtful plant care guides.",
  // The browse-only online preview (demo content, no live store) must not be indexed.
  ...(isReadOnlyPreview() ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#14281d",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Cached ('use cache' + tag), so this stays part of the static shell.
  const catalog = await getCatalog();
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CatalogProvider catalog={catalog}>
        <SessionProvider>
        <UIProvider>
          <a
            href="#main"
            className="sr-only z-[80] rounded-full bg-forest-900 px-5 py-3 text-ivory focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <CartDrawer />
          <QuickView />
          <Toaster />
        </UIProvider>
        </SessionProvider>
        </CatalogProvider>
      </body>
    </html>
  );
}
