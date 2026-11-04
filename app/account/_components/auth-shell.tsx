import type { ReactNode } from "react";
import { FloatingLeaf, LeafShape } from "@/components/ui/botanical";
import { PreviewNotice } from "@/components/ui/preview-notice";
import { Reveal } from "@/components/ui/reveal";

/** Split layout for sign-in / sign-up / password pages: editorial panel + form card. */
export function AuthShell({ eyebrow, title, intro, aside, children }: { eyebrow: string; title: ReactNode; intro?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="container-page py-8 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[22px] bg-card shadow-[0_30px_60px_-40px_rgba(14,29,21,0.45)] lg:grid-cols-[1fr_1.1fr]">
        <div className="grain relative hidden overflow-hidden bg-forest-900 p-10 text-ivory lg:flex lg:flex-col lg:justify-between">
          <FloatingLeaf variant={2} className="-top-6 -right-8 size-52 text-sage-300/25" duration={11} />
          <FloatingLeaf variant={0} className="bottom-10 -left-10 size-40 text-leaf/20" duration={9} delay={0.6} />
          <p className="nav-caps relative text-sage-300">Pot Stories</p>
          <div className="relative">
            <LeafShape variant={1} className="mb-6 size-12 text-leaf" />
            <p className="display-heavy text-[2.4rem] leading-[1.05]">
              A greener home,
              <br />
              <em className="text-leaf">one pot at a time.</em>
            </p>
            {aside && <div className="mt-6 text-sm leading-relaxed text-sage-200/90">{aside}</div>}
          </div>
          <p className="relative text-xs text-sage-300/80">Track orders, save addresses and keep your bag in sync across devices.</p>
        </div>
        <div className="p-6 sm:p-10 lg:p-12">
          <Reveal>
            <p className="nav-caps text-forest-700">{eyebrow}</p>
            <h1 className="display-heavy mt-3 text-[clamp(2rem,4.5vw,2.8rem)] text-forest-900">{title}</h1>
            {intro && <p className="mt-3 text-[0.95rem] leading-relaxed text-moss">{intro}</p>}
          </Reveal>
          <div className="mt-8">
            <PreviewNotice />
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function FormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div aria-hidden className="space-y-5">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <div className="h-3.5 w-24 rounded-full bg-cream" />
          <div className="mt-2 h-12 animate-pulse rounded-[12px] bg-cream/70" />
        </div>
      ))}
      <div className="h-12 animate-pulse rounded-full bg-cream" />
    </div>
  );
}
