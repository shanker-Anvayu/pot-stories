import Link from "next/link";
import { LeafShape } from "@/components/ui/botanical";

export default function NotFound() {
  return (
    <section className="container-page flex min-h-[70svh] flex-col items-center justify-center py-24 text-center">
      <LeafShape variant={2} className="size-24 text-sage-500" />
      <p className="eyebrow mt-8 text-clay">404 · Page not found</p>
      <h1 className="mt-4 max-w-2xl font-display text-[clamp(2.4rem,6vw,4.4rem)] leading-[1] tracking-[-0.03em] text-forest-900">
        This page hasn&apos;t <em className="text-forest-600">sprouted</em> yet.
      </h1>
      <p className="mt-5 max-w-md text-moss">The link may be old, or the plant may have found a new home. Let&apos;s get you back on the path.</p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary">
          Back to home
        </Link>
        <Link href="/shop" className="btn btn-outline text-forest-900">
          Shop plants
        </Link>
      </div>
    </section>
  );
}
