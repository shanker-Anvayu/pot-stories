"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound, MailCheck } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { loginAction, registerAction, requestPasswordResetAction, resetPasswordAction } from "@/app/actions/auth";
import { safeNext } from "@/app/actions/validation";
import { useSession } from "@/components/providers/session-provider";
import { DemoNote, FormMessage, SubmitButton, TextField, inputClass } from "./form-ui";

type Errors = Record<string, string>;

function useNext() {
  const params = useSearchParams();
  return safeNext(params.get("next"));
}

function withNext(path: string, next: string) {
  return next === "/account" ? path : `${path}?next=${encodeURIComponent(next)}`;
}

function DemoAccountsNote() {
  const { backend } = useSession();
  if (backend !== "demo") return null;
  return <DemoNote className="mt-6">Demo accounts are stored locally in this preview — use any email; nothing is sent.</DemoNote>;
}

function PasswordField({ label, name, error, autoComplete, hint, value, onChange }: { label: string; name: string; error?: string; autoComplete: string; hint?: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <TextField
        label={label}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        error={error}
        hint={hint}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={name === "current" ? undefined : 8}
        maxLength={128}
        className="[&_input]:pr-12"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute top-[1.85rem] right-1.5 grid size-10 place-items-center rounded-full text-moss hover:bg-sage-100 hover:text-forest-900"
      >
        {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

function SignedInNotice() {
  const { user } = useSession();
  if (!user) return null;
  return (
    <p className="mb-6 rounded-[12px] bg-sage-100 px-4 py-3 text-sm text-forest-800">
      You&apos;re signed in as <strong>{user.email}</strong>.{" "}
      <Link href="/account" className="font-bold underline underline-offset-2">
        Go to your account
      </Link>
    </p>
  );
}

/* ------------------------------------------------------------------ */

export function LoginForm() {
  const router = useRouter();
  const next = useNext();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    start(async () => {
      const res = await loginAction({ email, password, next });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setError(res.error);
        return;
      }
      setErrors({});
      await refresh();
      router.push(res.data.next);
    });
  };

  return (
    <>
      <SignedInNotice />
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <PasswordField label="Password" name="current" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password} />
        <div className="flex justify-end">
          <Link href="/account/forgot-password" className="text-sm font-semibold text-forest-700 underline-offset-2 hover:underline">
            Forgot password?
          </Link>
        </div>
        <FormMessage error={error} />
        <SubmitButton pending={pending} pendingLabel="Signing in…" className="w-full">
          Sign in
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-moss">
        New to Pot Stories?{" "}
        <Link href={withNext("/account/register", next)} className="font-bold text-forest-900 underline underline-offset-2">
          Create an account
        </Link>
      </p>
      <DemoAccountsNote />
    </>
  );
}

/* ------------------------------------------------------------------ */

export function RegisterForm() {
  const router = useRouter();
  const next = useNext();
  const { refresh } = useSession();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    start(async () => {
      const res = await registerAction({ ...form, next });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setError(res.error);
        return;
      }
      setErrors({});
      if (res.data.needsConfirmation) {
        setConfirmSent(true);
        return;
      }
      await refresh();
      router.push(res.data.next);
    });
  };

  if (confirmSent) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[16px] bg-sage-100 p-6 text-center" role="status">
        <MailCheck className="mx-auto size-8 text-forest-700" aria-hidden />
        <p className="mt-3 font-display text-xl font-semibold text-forest-900">Check your inbox</p>
        <p className="mt-2 text-sm text-moss">We sent a confirmation link to {form.email}. Follow it, then sign in.</p>
        <Link href={withNext("/account/login", next)} className="btn btn-primary mt-5">
          Go to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <>
      <SignedInNotice />
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField label="Full name" name="fullName" autoComplete="name" maxLength={80} value={form.fullName} onChange={(e) => set("fullName")(e.target.value)} error={errors.fullName} />
        <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => set("email")(e.target.value)} error={errors.email} />
        <PasswordField label="Password" name="new" autoComplete="new-password" hint="At least 8 characters." value={form.password} onChange={set("password")} error={errors.password} />
        <FormMessage error={error} />
        <SubmitButton pending={pending} pendingLabel="Creating account…" className="w-full">
          Create account
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-moss">
        Already have an account?{" "}
        <Link href={withNext("/account/login", next)} className="font-bold text-forest-900 underline underline-offset-2">
          Sign in
        </Link>
      </p>
      <DemoAccountsNote />
    </>
  );
}

/* ------------------------------------------------------------------ */

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ demoResetUrl?: string } | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    start(async () => {
      const res = await requestPasswordResetAction({ email });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setError(res.error);
        return;
      }
      setErrors({});
      setSent(res.data);
    });
  };

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} role="status" aria-live="polite">
        <div className="rounded-[16px] bg-sage-100 p-6">
          <MailCheck className="size-7 text-forest-700" aria-hidden />
          <p className="mt-3 font-display text-xl font-semibold text-forest-900">Check your email</p>
          <p className="mt-2 text-sm leading-relaxed text-moss">If an account exists for {email}, we&apos;ve sent a link to reset your password. It expires in 30 minutes.</p>
        </div>
        {sent.demoResetUrl && (
          <div className="mt-5 rounded-[16px] border-2 border-dashed border-clay/50 bg-clay/5 p-5">
            <p className="nav-caps text-clay-dark">Demo mode: no email service — use this link</p>
            <p className="mt-2 text-xs text-moss">In the live store this link is emailed. It is shown here only because this preview has no email provider.</p>
            <Link href={sent.demoResetUrl} className="btn btn-outline mt-4 text-forest-900">
              <KeyRound className="size-4" aria-hidden /> Open reset link
            </Link>
          </div>
        )}
        <p className="mt-6 text-center text-sm">
          <Link href="/account/login" className="font-bold text-forest-900 underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField label="Email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <FormMessage error={error} />
        <SubmitButton pending={pending} pendingLabel="Sending…" className="w-full">
          Send reset link
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-moss">
        Remembered it?{" "}
        <Link href="/account/login" className="font-bold text-forest-900 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? undefined;
  const { refresh, backend, loading } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    start(async () => {
      const res = await resetPasswordAction({ password, confirm, token });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setError(res.error);
        return;
      }
      setErrors({});
      setDone(true);
      await refresh();
      router.push(res.data.next);
    });
  };

  if (!loading && backend === "demo" && !token) {
    return (
      <div className="space-y-5">
        <FormMessage error="This reset link is missing its token. Request a new one." />
        <Link href="/account/forgot-password" className="btn btn-primary w-full">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <PasswordField label="New password" name="new" autoComplete="new-password" hint="At least 8 characters." value={password} onChange={setPassword} error={errors.password} />
      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-[0.82rem] font-bold text-forest-900">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={!!errors.confirm || undefined}
          aria-describedby={errors.confirm ? "confirm-err" : undefined}
          className={inputClass}
        />
        {errors.confirm && (
          <p id="confirm-err" className="mt-1.5 text-xs font-medium text-clay-dark">
            {errors.confirm}
          </p>
        )}
      </div>
      <FormMessage error={error} success={done ? "Password updated — signing you in…" : null} />
      <SubmitButton pending={pending || done} pendingLabel="Saving…" className="w-full">
        Set new password
      </SubmitButton>
    </form>
  );
}
