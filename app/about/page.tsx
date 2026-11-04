import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Reveal } from "@/components/ui/reveal";
import { unsplash } from "@/lib/products";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Pot Stories believes every plant has a story — and that the right care helps it become a good one.",
};

const values = [
  { title: "Slow, not seasonal", body: "We'd rather offer fewer plants that last for years than chase trends that wilt by the next season." },
  { title: "Honest guidance", body: "Clear, specific care advice — including telling you when a plant won't suit your space." },
  { title: "Beautiful, useful pots", body: "Pots chosen for good drainage and breathability first, with looks a very close second." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title={
          <>
            Every plant has a story. <em className="text-forest-600">Yours starts here.</em>
          </>
        }
        description="Pot Stories began with a simple idea: a plant should feel like a companion, not a chore."
      />

      <section className="container-page grid items-center gap-12 py-20 sm:py-28 lg:grid-cols-2 lg:gap-20">
        <Reveal className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-cream">
          <Image
            src={unsplash("photo-1592150621744-aca64f48394a")}
            alt="A bright room filled with potted houseplants of different sizes"
            fill
            preload
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-display text-[clamp(2rem,4vw,3.2rem)] leading-[1.05] text-forest-900">
            Grown with patience, <em className="text-forest-600">sent with care.</em>
          </h2>
          <div className="mt-6 space-y-5 text-[1.05rem] leading-relaxed text-moss">
            <p>
              We think the best homes have a little life in them — a trailing vine on the bookshelf, a sculptural snake
              plant in the hallway, basil on the kitchen sill.
            </p>
            <p>
              Pot Stories exists to make that easier. We choose plants for their health and character, pair them with
              pots that help them thrive, and share the kind of care advice we wish we&apos;d had when we started.
            </p>
            <p>The result, we hope, is a plant that grows with you — and a story worth telling.</p>
          </div>
          <Link href="/shop" className="btn btn-primary group mt-10">
            Explore the collection
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </Reveal>
      </section>

      <section className="bg-forest-900 py-20 text-ivory sm:py-28">
        <div className="container-page">
          <Reveal>
            <p className="eyebrow text-sage-300">What we believe</p>
          </Reveal>
          <ul className="mt-10 grid gap-10 md:grid-cols-3">
            {values.map((v, i) => (
              <li key={v.title}>
                <Reveal delay={i * 0.1} className="border-t border-white/15 pt-8">
                  <p className="font-display text-5xl text-sage-400/50">0{i + 1}</p>
                  <h3 className="mt-6 font-display text-2xl">{v.title}</h3>
                  <p className="mt-3 leading-relaxed text-sage-200">{v.body}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
