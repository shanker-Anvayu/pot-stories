"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, FlaskConical, Loader2 } from "lucide-react";
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/format";

export const inputClass =
  "block w-full rounded-[12px] border border-forest-900/20 bg-card px-4 py-3 text-[0.95rem] text-forest-900 placeholder:text-moss/60 transition-colors outline-none focus:border-forest-700 focus:ring-2 focus:ring-forest-700/20 focus-visible:outline-none disabled:opacity-60 aria-[invalid=true]:border-clay aria-[invalid=true]:ring-clay/15";

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

function FieldShell({ label, error, hint, optional, className, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-[0.82rem] font-bold text-forest-900">
        {label}
        {optional && <span className="text-[0.72rem] font-medium text-moss">Optional</span>}
      </label>
      {children({ id, describedBy, invalid: !!error })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-moss">
          {hint}
        </p>
      )}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={errId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 flex items-start gap-1.5 overflow-hidden text-xs font-medium text-clay-dark"
          >
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

type Common = { label: string; error?: string; hint?: ReactNode; optional?: boolean; className?: string };

export function TextField({ label, error, hint, optional, className, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} required={!optional} className={inputClass} {...props} />
      )}
    </FieldShell>
  );
}

export function SelectField({ label, error, hint, optional, className, children, ...props }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} required={!optional} className={cn(inputClass, "appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10")} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2314281d' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function TextAreaField({ label, error, hint, optional, className, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} error={error} hint={hint} optional={optional} className={className}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} required={!optional} className={cn(inputClass, "min-h-24 resize-y")} {...props} />
      )}
    </FieldShell>
  );
}

/** Live region for form-level errors and success messages. Always mounted so screen readers announce changes. */
export function FormMessage({ error, success, className }: { error?: string | null; success?: string | null; className?: string }) {
  return (
    <div aria-live="polite" role="status" className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p
            key={`e-${error}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-[12px] border border-clay/30 bg-clay/8 px-4 py-3 text-sm text-clay-dark"
          >
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </motion.p>
        ) : success ? (
          <motion.p
            key={`s-${success}`}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 rounded-[12px] border border-forest-700/20 bg-sage-100 px-4 py-3 text-sm text-forest-800"
          >
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{success}</span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SubmitButton({ pending, children, pendingLabel, className, disabled, ...props }: { pending: boolean; pendingLabel?: string; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={cn("btn btn-primary disabled:cursor-not-allowed disabled:opacity-60", className)}
      {...props}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

/** Small, honest label for preview-only behaviour. */
export function DemoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 rounded-[12px] border border-dashed border-forest-700/30 bg-sage-50 px-3.5 py-2.5 text-xs leading-relaxed text-forest-700", className)}>
      <FlaskConical className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
