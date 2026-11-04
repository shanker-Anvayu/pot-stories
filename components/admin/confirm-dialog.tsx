"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Accessible confirmation built on the native <dialog> element (focus trap,
 * Escape to close and inert background come for free).
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
      aria-labelledby={titleId}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-sand bg-card p-0 text-ink shadow-2xl backdrop:bg-forest-950/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-5">
        <h2 id={titleId} className="font-display text-lg font-semibold text-forest-900">
          {title}
        </h2>
        <div className="mt-2 text-sm text-moss">{children}</div>
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay-dark">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="rounded-full px-4 py-2 text-sm font-bold text-forest-800 hover:bg-sage-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            autoFocus
            className="rounded-full bg-clay px-4 py-2 text-sm font-bold text-ivory hover:bg-clay-dark disabled:opacity-60"
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
