"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleProductActive } from "@/app/actions/admin";
import { cn } from "@/lib/format";

/** Switch that publishes/unpublishes a product from the storefront. */
export function ActiveToggle({ productId, active, name }: { productId: string; active: boolean; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(active);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-label={`${name} visible in store`}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            setOptimistic(!optimistic);
            const res = await toggleProductActive(productId, !optimistic);
            if (!res.ok) setError(res.error);
            router.refresh();
          })
        }
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
          optimistic ? "bg-forest-700" : "bg-oat",
        )}
      >
        <span className={cn("inline-block size-4 rounded-full bg-ivory shadow transition-transform", optimistic ? "translate-x-4.5" : "translate-x-0.5")} />
      </button>
      <span className={cn("text-xs font-semibold", optimistic ? "text-forest-800" : "text-moss")}>{optimistic ? "Active" : "Hidden"}</span>
      {error && (
        <span role="alert" className="text-xs text-clay-dark">
          {error}
        </span>
      )}
    </span>
  );
}
