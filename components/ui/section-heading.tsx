import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "./reveal";
import { cn } from "@/lib/format";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  link?: { href: string; label: string };
  align?: "left" | "center";
  tone?: "dark" | "light";
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  link,
  align = "left",
  tone = "dark",
  id,
}: SectionHeadingProps) {
  const light = tone === "light";
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-6",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        <p className={cn("eyebrow mb-4", light ? "text-sage-300" : "text-clay")}>{eyebrow}</p>
        <h2
          id={id}
          className={cn(
            "font-display text-[clamp(2.1rem,4.4vw,3.6rem)] leading-[1.02] tracking-[-0.02em]",
            light ? "text-ivory" : "text-forest-900",
          )}
        >
          {title}
        </h2>
        {description && (
          <p className={cn("mt-5 max-w-xl text-[1.02rem] leading-relaxed", light ? "text-sage-200" : "text-moss", align === "center" && "mx-auto")}>
            {description}
          </p>
        )}
      </div>
      {link && (
        <Link
          href={link.href}
          className={cn(
            "group inline-flex shrink-0 items-center gap-2 text-sm font-semibold",
            light ? "text-ivory" : "text-forest-800",
          )}
        >
          <span className="link-underline pb-0.5">{link.label}</span>
          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
        </Link>
      )}
    </Reveal>
  );
}
