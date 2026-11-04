import Link from "next/link";
import { FooterNewsletter } from "@/components/home/newsletter";
import { Wordmark } from "./wordmark";

const columns = [
  {
    title: "Shop",
    links: [
      { label: "All plants", href: "/shop" },
      { label: "Bestsellers", href: "/shop?tags=bestseller" },
      { label: "New arrivals", href: "/shop?tags=new" },
      { label: "Gifts", href: "/shop?tags=gift" },
      { label: "Pet friendly", href: "/shop?tags=pet-friendly" },
      { label: "Seeds & kits", href: "/shop?category=kits" },
    ],
  },
  {
    title: "Helpful links",
    links: [
      { label: "FAQ", href: "/help#faq" },
      { label: "Delivery", href: "/help#delivery" },
      { label: "Returns & plant support", href: "/help#returns" },
      { label: "Plant care journal", href: "/journal" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Wishlist", href: "/wishlist" },
      { label: "About this preview", href: "/help#demo" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-forest-900 text-sage-100">
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-12 py-14 lg:grid-cols-[1.35fr_2fr_auto] lg:gap-16 lg:py-16">
        <div id="newsletter" className="min-w-0 scroll-mt-40">
          <p className="text-[0.95rem] font-semibold text-ivory">Get seasonal care notes by email</p>
          <p className="mt-2 max-w-sm text-sm text-sage-300">
            What your plants need this season, new arrivals and the occasional story from the greenhouse.
          </p>
          <FooterNewsletter />
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="mb-4 text-[0.95rem] font-bold text-ivory">{col.title}</h2>
              <ul className="space-y-2.5 text-[0.86rem]">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sage-200 underline-offset-4 hover:text-ivory hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="lg:text-right">
          <Link href="/" aria-label="Pot Stories — home" className="text-ivory">
            <Wordmark className="text-[1.5rem]" />
          </Link>
          <p className="mt-2 text-sm text-sage-300">Plants, potted with care.</p>
          <p className="mt-6 text-[0.95rem] font-bold text-ivory">Get in touch</p>
          <Link href="/help" className="mt-2 inline-block text-sm text-sage-200 underline underline-offset-4 hover:text-ivory">
            Visit the help centre
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-sage-400 sm:flex-row sm:justify-between">
          <p>© 2026 Pot Stories · Design preview — products, prices and testimonials are sample content.</p>
          <p>Photography via Unsplash, for demonstration only.</p>
        </div>
      </div>
    </footer>
  );
}
