"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { setStock } from "@/app/actions/admin";
import { cn } from "@/lib/format";
import { smallBtn } from "./ui";

/** Inline stock editor for a single variant. The server re-validates everything. */
export function StockEditor({ variantId, stock, label }: { variantId: string; stock: number; label: string }) {
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState(String(stock));
  const [saved, setSaved] = useState(stock);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const dirty = value !== String(saved);

  const submit = () =>
    start(async () => {
      setError(null);
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0 || n > 100000) {
        setError("0–100,000");
        return;
      }
      const res = await setStock(variantId, n);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(res.data.stock);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
      router.refresh();
    });

  return (
    <form
      className="flex items-center justify-end gap-1.5 md:justify-start"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Stock for {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={100000}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className="w-20 rounded-lg border border-oat bg-ivory px-2 py-1 text-sm tabular-nums aria-[invalid=true]:border-clay"
      />
      <button type="submit" disabled={!dirty || pending} className={cn(smallBtn, "bg-forest-800 text-ivory hover:bg-forest-950")}>
        {pending ? "Saving…" : done ? <Check className="size-3.5" aria-label="Saved" /> : "Update"}
      </button>
      {error && (
        <span id={`${id}-err`} role="alert" className="text-xs text-clay-dark">
          {error}
        </span>
      )}
    </form>
  );
}
