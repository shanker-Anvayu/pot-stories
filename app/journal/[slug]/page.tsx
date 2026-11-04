import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RelatedProducts } from "@/components/product/related-products";
import { articleBySlug, articles } from "@/lib/content";
import { getCatalog } from "@/lib/server/catalog";

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = articleBySlug(slug);
  return article ? { title: article.title, description: article.excerpt } : { title: "Article not found" };
}

async function ArticleContent({ params }: { params: PageProps<"/journal/[slug]">["params"] }) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) notFound();
  const { products } = await getCatalog();
  const featured = products.filter((p) => article.relatedProducts.includes(p.slug));
  const more = articles.filter((a) => a.slug !== article.slug).slice(0, 2);

  return (
    <>
      <article>
        <header className="container-page pt-10 sm:pt-14">
          <Link href="/journal" className="inline-flex items-center gap-2 text-sm font-semibold text-forest-800 hover:text-clay">
            <ArrowLeft className="size-4" aria-hidden /> All journal entries
          </Link>
          <div className="mx-auto mt-10 max-w-3xl text-center">
            <p className="text-sm text-moss">
              <span className="font-semibold text-clay">{article.category}</span> · {article.readTime}
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.4rem,6vw,4.6rem)] leading-[1] tracking-[-0.03em] text-forest-900">
              {article.title}
            </h1>
          </div>
          <div className="relative mt-12 aspect-[16/9] overflow-hidden rounded-[2rem] bg-cream">
            <Image src={article.image} alt={article.imageAlt} fill preload sizes="(min-width: 1408px) 1312px, 100vw" className="object-cover" />
          </div>
        </header>

        <div className="container-page py-16 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <p className="font-display text-2xl leading-relaxed text-forest-900 first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.8] first-letter:text-clay">
              {article.intro}
            </p>
            {article.sections.map((section) => (
              <section key={section.heading} className="mt-12">
                <h2 className="font-display text-3xl text-forest-900">{section.heading}</h2>
                {section.body.map((para, i) => (
                  <p key={i} className="mt-4 text-[1.06rem] leading-[1.8] text-forest-800/85">
                    {para}
                  </p>
                ))}
              </section>
            ))}

            {more.length > 0 && (
              <aside className="mt-16 rounded-[1.75rem] bg-cream p-8">
                <p className="eyebrow text-moss">Keep reading</p>
                <ul className="mt-4 space-y-3">
                  {more.map((a) => (
                    <li key={a.slug}>
                      <Link href={`/journal/${a.slug}`} className="font-display text-xl text-forest-900 hover:text-clay">
                        {a.title} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </div>
      </article>
      <RelatedProducts products={featured} eyebrow="Mentioned in this guide" title="Plants from this story" />
    </>
  );
}

/** Params are read inside Suspense so the route's App Shell stays instant and URL-independent. */
export default function Page({ params }: PageProps<"/journal/[slug]">) {
  return (
    <Suspense fallback={<div aria-hidden className="container-page py-10"><div className="aspect-[5/7] max-w-xl animate-pulse rounded-[14px] bg-card sm:aspect-[16/9] sm:max-w-none" /></div>}>
      <ArticleContent params={params} />
    </Suspense>
  );
}
