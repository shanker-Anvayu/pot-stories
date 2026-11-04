"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { subscribeNewsletter } from "@/app/actions/newsletter";
import { useSession } from "@/components/providers/session-provider";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Status = "idle" | "error" | "submitting" | "success";

/**
 * Shared newsletter signup state: client-side validation, then the
 * `subscribeNewsletter` server action (Supabase or the local demo store).
 */
export function useNewsletterSignup(source: string) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [already, setAlready] = useState(false);
  const { backend } = useSession();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();
    const message = !value
      ? "Please enter your email address."
      : !EMAIL_PATTERN.test(value)
        ? "That doesn't look like a valid email — please check it."
        : "";
    if (message) {
      setError(message);
      setStatus("error");
      return;
    }
    setError("");
    setStatus("submitting");
    const res = await subscribeNewsletter(value, source).catch(() => null);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "We couldn't save your subscription. Please try again.");
      setStatus("error");
      return;
    }
    setAlready(res.data.status === "already_subscribed");
    setStatus("success");
  }

  return {
    email,
    status,
    error,
    already,
    demo: backend === "demo",
    onSubmit,
    onEmailChange: (value: string) => {
      setEmail(value);
      if (status === "error") setStatus("idle");
    },
    reset: () => {
      setEmail("");
      setStatus("idle");
    },
  };
}

/** Footer newsletter signup with inline validation and success feedback (demo only). */
export function FooterNewsletter() {
  const { email, status, error, already, demo, onSubmit, onEmailChange, reset } = useNewsletterSignup("footer");
  const inputId = useId();
  const errorId = useId();

  return (
    <div className="mt-5 max-w-md">
      <AnimatePresence mode="wait" initial={false}>
        {status === "success" ? (
          <motion.div
            key="ok"
            role="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 rounded-[14px] bg-forest-800 p-4"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.1 }}
              className="grid size-8 shrink-0 place-items-center rounded-full bg-leaf text-forest-900"
            >
              <Check className="size-4" aria-hidden />
            </motion.span>
            <div>
              <p className="font-semibold text-ivory">{already ? "You're already on the list." : "You're on the list."}</p>
              <p className="mt-0.5 text-xs text-sage-300">
                {demo ? "Saved in the local demo database — no emails are sent from this preview." : "Thanks — we'll be in touch with seasonal care notes."}
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-2 text-xs font-semibold text-leaf underline-offset-4 hover:underline"
              >
                Use a different email
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" noValidate onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <label htmlFor={inputId} className="sr-only">
              Email address
            </label>
            <div className="flex gap-2">
              <input
                id={inputId}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                aria-invalid={status === "error"}
                aria-describedby={status === "error" ? errorId : undefined}
                className="h-12 min-w-0 flex-1 rounded-full border border-sage-300/40 bg-forest-950/40 px-5 text-sm text-ivory placeholder:text-sage-300/70 focus:border-leaf focus:outline-none"
              />
              <button type="submit" disabled={status === "submitting"} className="btn btn-leaf h-12 shrink-0 px-5">
                {status === "submitting" ? <Loader2 className="size-4 animate-spin" aria-label="Submitting" /> : "Submit"}
              </button>
            </div>
            <AnimatePresence>
              {status === "error" && (
                <motion.p
                  id={errorId}
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-2 pl-4 text-xs font-semibold text-[#f3b79a]"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
