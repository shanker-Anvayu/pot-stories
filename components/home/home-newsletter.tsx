"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useId } from "react";
import { Marquee } from "@/components/motion/marquee";
import { SplitWords, easeOutExpo } from "@/components/motion/text-reveal";
import { LeafShape } from "@/components/ui/botanical";
import { useNewsletterSignup } from "./newsletter";

/**
 * Homepage newsletter band (anchor #join, also the Plant Club waitlist).
 * Validates inline, submits via the `subscribeNewsletter` server action and
 * morphs into a success card; in demo mode it says the address is stored locally.
 */
export function HomeNewsletter() {
  const { email, status, error, already, demo, onSubmit, onEmailChange, reset } = useNewsletterSignup("homepage");
  const inputId = useId();
  const errorId = useId();
  const noteId = useId();

  return (
    <section id="join" aria-labelledby="join-title" className="relative scroll-mt-32 overflow-hidden bg-leaf text-forest-900">
      <div aria-hidden className="border-b border-forest-900/15 py-3">
        <Marquee speed={75} gap={28} pauseOnHover={false}>
          {["Seasonal care notes", "New arrivals first", "Plant Club news", "Journal stories"].map((t) => (
            <span key={t} className="flex items-center gap-7 text-[0.78rem] font-bold tracking-[0.14em] whitespace-nowrap uppercase">
              {t}
              <LeafShape variant={0} className="size-4 text-forest-700" />
            </span>
          ))}
        </Marquee>
      </div>
      <div className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:gap-16">
        <div>
          <p className="eyebrow text-forest-700">The Pot Stories letter</p>
          <SplitWords
            as="h2"
            id="join-title"
            text="Grow along with us."
            accent={[2]}
            accentClassName="italic text-forest-600"
            className="display-heavy mt-3 text-[clamp(2.6rem,6vw,5.2rem)] leading-[0.95]"
          />
          <p className="mt-5 max-w-md text-[1rem] leading-relaxed text-forest-800">
            Seasonal care notes, new arrivals and first word when the Plant Club opens. No spam — unsubscribe whenever you
            like.
          </p>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            {status === "success" ? (
              <motion.div
                key="ok"
                role="status"
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: easeOutExpo }}
                className="flex items-start gap-4 rounded-[1.5rem] bg-forest-900 p-6 text-ivory"
              >
                <motion.span
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 16, delay: 0.1 }}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-leaf text-forest-900"
                >
                  <Check className="size-5" aria-hidden />
                </motion.span>
                <div>
                  <p className="font-display text-xl">{already ? "You're already on the list." : "You're on the list."}</p>
                  <p className="mt-1 text-sm text-sage-200">
                    {demo
                      ? "Saved locally in the demo database — no emails are sent from this preview."
                      : "Thanks — we'll be in touch with seasonal care notes."}
                  </p>
                  <button type="button" onClick={reset} className="mt-3 text-sm font-semibold text-leaf underline-offset-4 hover:underline">
                    Use a different email
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.form key="form" noValidate onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <label htmlFor={inputId} className="mb-2 block text-sm font-bold">
                  Email address
                </label>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <input
                    id={inputId}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    aria-invalid={status === "error"}
                    aria-describedby={status === "error" ? `${errorId} ${noteId}` : noteId}
                    className="h-14 min-w-0 flex-1 rounded-full border border-forest-900/30 bg-ivory/80 px-6 text-base text-forest-900 placeholder:text-forest-800/50 focus:border-forest-900 focus:bg-ivory focus:outline-none"
                  />
                  <button type="submit" disabled={status === "submitting"} className="btn btn-primary group h-14 shrink-0 px-7">
                    {status === "submitting" ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden /> Joining…
                      </>
                    ) : (
                      <>
                        Subscribe <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                      </>
                    )}
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
                      className="overflow-hidden pt-2.5 pl-5 text-sm font-semibold text-clay-dark"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
                <p id={noteId} className="mt-3 pl-5 text-xs text-forest-800/80">
                  {demo ? "Design preview: sign-ups are saved locally in the demo database." : "We'll only use your email for the Pot Stories letter."}
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
