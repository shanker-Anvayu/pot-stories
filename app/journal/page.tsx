import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { articles } from "@/lib/content";

export const metadata: Metadata = {
  title: "Plant Journal",
  description: "Practical, honest plant care guides on light, watering, repotting and pruning.",
};

export default function JournalPage() {
  return (
    <>
      <PageHeader
        eyebrow="The Plant Journal"
        title={
          <>
            Grow with <em className="text-forest-600">confidence</em>
          </>
        }
        description="Practical guides to help your plants settle in, grow strong and stay beautiful."
      />
      <div className="container-page py-16 sm:py-24">
        <ul className="grid gap-x-8 gap-y-16 md:grid-cols-2">
          {articles.map((article, i) => (
            <li key={article.slug}>
              <Reveal delay={(i % 2) * 0.1}>
                <Link href={`/journal/${article.slug}`} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-cream">
                    <Image
                      src={article.image}
                      alt={article.imageAlt}
                      fill
                      preload={i < 2}
                      sizes="(min-width: 768px) 45vw, 100vw"
                      className="object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-6 flex items-start justify-between gap-6">
                    <div>
                      <p className="text-sm text-moss">
                        <span className="font-semibold text-clay">{article.category}</span> · {article.readTime}
                      </p>
                      <h2 className="mt-2 font-display text-3xl leading-tight text-forest-900">
                        <span className="link-underline">{article.title}</span>
                      </h2>
                      <p className="mt-3 leading-relaxed text-moss">{article.excerpt}</p>
                    </div>
                    <span className="mt-1 grid size-12 shrink-0 place-items-center rounded-full border border-forest-900/15 text-forest-900 transition-all duration-500 group-hover:rotate-45 group-hover:bg-forest-900 group-hover:text-ivory">
                      <ArrowUpRight className="size-5" aria-hidden />
                    </span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
