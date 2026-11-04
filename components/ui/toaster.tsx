"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, X } from "lucide-react";
import { useUI } from "@/components/providers/ui-provider";

export function Toaster() {
  const { toasts, dismissToast } = useUI();
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.2 } }}
            transition={{ duration: 0.45 }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-forest-900 py-3 pr-2 pl-4 text-sm text-ivory shadow-[0_20px_50px_-20px_rgba(14,29,21,0.6)]"
          >
            <CircleCheck className="size-4 shrink-0 text-sage-300" aria-hidden />
            <span className="flex-1">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  dismissToast(toast.id);
                }}
                className="rounded-full px-3 py-1.5 font-semibold text-sage-200 underline-offset-4 hover:underline"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
              className="grid size-8 place-items-center rounded-full text-sage-300 hover:bg-white/10"
            >
              <X className="size-4" aria-hidden />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
