import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { FaqList } from "@/components/help/faq-list";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description: "Answers to common plant care questions, plus information about this design preview.",
};

const faqs = [
  {
    q: "How do I know when to water my plant?",
    a: "Push a finger into the soil up to the second knuckle. For most leafy plants, water when it feels dry at your fingertip; succulents and cacti prefer the soil to dry out completely. Each product page lists specific guidance.",
  },
  {
    q: "What does “low-light tolerant” mean?",
    a: "These plants cope in spots that see the sky but not direct sun — a few metres from a window, or near a north-facing one. They grow more slowly in low light, so water less often too.",
  },
  {
    q: "Which plants are safe around cats and dogs?",
    a: "Look for the “Pet friendly” label or use the filter in the shop. These plants are listed as non-toxic to cats and dogs by the ASPCA. It's still best to discourage pets from chewing any plant.",
  },
  {
    q: "Should I repot my plant as soon as it arrives?",
    a: "No — give it two to three weeks to adjust to its new home first. Plants are supplied in a grower pot that fits inside decorative pots, so you can display it straight away.",
  },
  {
    q: "Why are the leaves on my new plant yellowing?",
    a: "A leaf or two yellowing after a move is normal as the plant adjusts. If several leaves yellow, check whether the soil is staying wet for too long — overwatering is the most common cause.",
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHeader
        eyebrow="Help centre"
        title={
          <>
            How can we <em className="text-forest-600">help?</em>
          </>
        }
        description="Plant care answers and information about this preview."
      />
      <div className="container-page grid gap-16 py-16 sm:py-24 lg:grid-cols-[1fr_1.6fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="Help topics">
            <ul className="space-y-3 font-display text-xl text-forest-900">
              <li>
                <a href="#demo" className="hover:text-clay">About this preview</a>
              </li>
              <li>
                <a href="#faq" className="hover:text-clay">Plant care FAQ</a>
              </li>
              <li>
                <a href="#delivery" className="hover:text-clay">Delivery</a>
              </li>
              <li>
                <a href="#returns" className="hover:text-clay">Returns & plant care support</a>
              </li>
            </ul>
          </nav>
        </aside>

        <div className="space-y-20">
          <section id="demo" aria-labelledby="demo-title" className="scroll-mt-28 rounded-[1.75rem] bg-sage-100 p-8 sm:p-10">
            <Info className="size-6 text-forest-700" aria-hidden />
            <h2 id="demo-title" className="mt-4 font-display text-3xl text-forest-900">
              About this preview
            </h2>
            <p className="mt-4 leading-relaxed text-forest-800/85">
              This site is a frontend design preview for Pot Stories. Products, prices, availability and testimonials are
              sample content for demonstration. Your bag and wishlist are saved only in this browser, checkout is not
              connected, and the newsletter form does not store or send your email.
            </p>
          </section>

          <section id="faq" aria-labelledby="faq-title" className="scroll-mt-28">
            <h2 id="faq-title" className="font-display text-4xl text-forest-900">
              Plant care FAQ
            </h2>
            <FaqList items={faqs} />
          </section>

          <section id="delivery" aria-labelledby="delivery-title" className="scroll-mt-28">
            <h2 id="delivery-title" className="font-display text-4xl text-forest-900">
              Delivery
            </h2>
            <p className="mt-5 leading-relaxed text-moss">
              Delivery areas, timelines and charges will be published here before launch. In this preview no orders are
              placed or dispatched.
            </p>
          </section>

          <section id="returns" aria-labelledby="returns-title" className="scroll-mt-28">
            <h2 id="returns-title" className="font-display text-4xl text-forest-900">
              Returns & plant care support
            </h2>
            <p className="mt-5 leading-relaxed text-moss">
              The returns policy will be confirmed before launch. In the meantime, our{" "}
              <Link href="/journal" className="font-semibold text-forest-800 underline underline-offset-4 hover:text-clay">
                Plant Journal
              </Link>{" "}
              covers light, watering, repotting and pruning in detail.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
