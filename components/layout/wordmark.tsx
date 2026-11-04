import { cn } from "@/lib/format";

/** Temporary text wordmark until the final logo is supplied. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-[1.35rem] font-medium tracking-[0.16em] whitespace-nowrap", className)}>
      POT
      <span className="mx-[0.28em] inline-block size-[0.32em] translate-y-[-0.18em] rounded-full bg-clay align-middle" aria-hidden />
      STORIES
    </span>
  );
}
