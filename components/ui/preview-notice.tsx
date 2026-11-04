"use client";

import { Info } from "lucide-react";
import { useSession } from "@/components/providers/session-provider";

/**
 * Shown on account / checkout entry points when the site runs as a browse-only
 * online preview (no database or payments connected). Renders nothing otherwise.
 */
export function PreviewNotice({ className }: { className?: string }) {
  const { readOnly } = useSession();
  if (!readOnly) return null;
  return (
    <div role="note" className={`mb-6 flex gap-3 rounded-[14px] border border-clay/30 bg-clay/10 p-4 text-sm leading-relaxed text-forest-900 ${className ?? ""}`}>
      <Info className="mt-0.5 size-4 shrink-0 text-clay" aria-hidden />
      <p>
        <strong className="font-semibold">Online preview — browse only.</strong> Accounts, checkout and admin are switched off until the store&apos;s
        database and payments are connected. Your bag and wishlist are kept in this browser; no orders or payments are taken.
      </p>
    </div>
  );
}
