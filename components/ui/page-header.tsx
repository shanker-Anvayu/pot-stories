import type { ReactNode } from "react";
import { Reveal } from "./reveal";

/** Shared header for secondary pages (wishlist, journal, about, help). */
export function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: ReactNode; description?: string }) {
  return (
    <section className="border-b border-forest-900/10 bg-sage-100">
      <div className="container-page py-10 text-center sm:py-14">
        <Reveal>
          <p className="nav-caps text-forest-700">{eyebrow}</p>
          <h1 className="display-heavy mx-auto mt-3 max-w-3xl text-[clamp(2.2rem,5vw,3.8rem)] text-forest-900">{title}</h1>
          {description && <p className="mx-auto mt-4 max-w-xl text-[0.98rem] leading-relaxed text-forest-800/80">{description}</p>}
        </Reveal>
      </div>
    </section>
  );
}
