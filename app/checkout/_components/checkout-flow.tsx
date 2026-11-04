"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CircleCheck, FlaskConical, Loader2, Lock, Plus, RefreshCw, ShieldCheck, ShoppingBag, Tag, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Address, Profile, Quote } from "@/lib/domain";
import { getCheckoutQuote, placeOrder, retryPayment } from "@/app/actions/checkout";
import { AddressFields, AddressLines, emptyAddress, type AddressDraft } from "@/app/account/_components/address-form";
import { FormMessage, TextAreaField, TextField } from "@/app/account/_components/form-ui";
import { useSession } from "@/components/providers/session-provider";
import { storeActions, storeSync, useCartSummary, useHydrated, useStore } from "@/lib/store";
import { cn, formatPrice } from "@/lib/format";
import { useRazorpay } from "./use-razorpay";

const curve = [0.165, 0.84, 0.44, 1] as const;
const IDEM_STORAGE = "pot-stories:checkout-key";

/** One idempotency key per cart contents: a resubmit of the same bag returns the same order. */
function idempotencyKeyFor(signature: string): string {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(IDEM_STORAGE) ?? "null") as { sig: string; key: string } | null;
    if (saved && saved.sig === signature && typeof saved.key === "string") return saved.key;
  } catch {
    /* ignore */
  }
  const key = crypto.randomUUID();
  try {
    window.sessionStorage.setItem(IDEM_STORAGE, JSON.stringify({ sig: signature, key }));
  } catch {
    /* storage unavailable — key lives for this attempt only */
  }
  return key;
}
function forgetIdempotencyKey() {
  try {
    window.sessionStorage.removeItem(IDEM_STORAGE);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */

function Step({ n, title, children, id }: { n: number; title: string; children: React.ReactNode; id: string }) {
  return (
    <motion.section
      aria-labelledby={id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: n * 0.06, duration: 0.45, ease: curve }}
      className="rounded-[18px] bg-card p-5 sm:p-7"
    >
      <h2 id={id} className="mb-5 flex items-center gap-3 font-display text-[1.3rem] font-semibold text-forest-900">
        <span className="grid size-7 place-items-center rounded-full bg-forest-800 font-sans text-xs font-bold text-ivory" aria-hidden>
          {n}
        </span>
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

function SummarySkeleton() {
  return (
    <div aria-hidden className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex justify-between">
          <div className="h-3.5 w-24 animate-pulse rounded-full bg-cream" />
          <div className="h-3.5 w-16 animate-pulse rounded-full bg-cream" />
        </div>
      ))}
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div aria-hidden className="container-page grid gap-6 pb-16 lg:grid-cols-[1.4fr_1fr]">
      <div className="grid gap-6">
        <div className="h-56 animate-pulse rounded-[18px] bg-card" />
        <div className="h-72 animate-pulse rounded-[18px] bg-card" />
        <div className="h-40 animate-pulse rounded-[18px] bg-card" />
      </div>
      <div className="h-96 animate-pulse rounded-[18px] bg-card" />
    </div>
  );
}

/* ------------------------------------------------------------------ */

type PendingRzp = { orderId: string; orderNumber: string };

export function CheckoutFlow({ profile, addresses }: { profile: Profile; addresses: Address[] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { cart } = useStore();
  const { lines: localLines } = useCartSummary();
  const { payments, backend } = useSession();
  const openRazorpay = useRazorpay();

  const inputs = useMemo(() => storeSync.toInputs(cart), [cart]);
  const cartSig = useMemo(() => JSON.stringify(inputs), [inputs]);

  /* ---- discount ---- */
  const [codeDraft, setCodeDraft] = useState("");
  const [appliedCode, setAppliedCode] = useState("");

  /* ---- server quote (the only source of prices) ---- */
  const currentSig = `${cartSig}|${appliedCode}`;
  const [quoteState, setQuoteState] = useState<{ sig: string; quote: Quote | null; error: string | null } | null>(null);
  const [quoteNonce, setQuoteNonce] = useState(0);
  useEffect(() => {
    if (!hydrated) return;
    const lines = JSON.parse(cartSig) as unknown[];
    if (lines.length === 0) return;
    let cancelled = false;
    const sig = `${cartSig}|${appliedCode}`;
    getCheckoutQuote(lines, appliedCode || null).then(
      (res) => {
        if (!cancelled) setQuoteState({ sig, quote: res.ok ? res.data : null, error: res.ok ? null : res.error });
      },
      () => {
        if (!cancelled) setQuoteState({ sig, quote: null, error: "We couldn't price your bag. Check your connection and try again." });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [hydrated, cartSig, appliedCode, quoteNonce]);
  const quoting = !quoteState || quoteState.sig !== currentSig;
  const quote = quoteState?.quote ?? null;

  /* ---- contact ---- */
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [contact, setContact] = useState({ fullName: profile.fullName ?? "", email: profile.email, phone: profile.phone ?? defaultAddress?.phone ?? "" });

  /* ---- address ---- */
  const [addressId, setAddressId] = useState<string | "new">(defaultAddress?.id ?? "new");
  const [draft, setDraft] = useState<AddressDraft>(emptyAddress(profile.fullName ?? "", profile.phone ?? ""));
  const [saveNew, setSaveNew] = useState(true);
  const [notes, setNotes] = useState("");

  /* ---- submission ---- */
  const submitting = useRef(false);
  const [busy, setBusy] = useState<null | "placing" | "paying" | "redirecting">(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [pendingRzp, setPendingRzp] = useState<PendingRzp | null>(null);
  const [rzpInfo, setRzpInfo] = useState<string | null>(null);

  const issues = quote?.issues ?? [];
  const hasIssues = !quoting && issues.length > 0;

  const done = (orderId: string) => {
    setBusy("redirecting");
    forgetIdempotencyKey();
    storeActions.clearCart();
    router.push(`/account/orders/${orderId}?placed=1`);
  };

  /** Applies the server-adjusted quantities to the local bag (removes unavailable lines). */
  const updateBag = (q: Quote) => {
    const adjusted = new Map(q.lines.map((l) => [`${l.slug}:${l.variant}:${l.planter ?? ""}`, l.quantity]));
    const byVariant = new Map(q.lines.map((l) => [`${l.slug}:${l.variant}`, l.quantity]));
    for (const line of storeSync.getState().cart) {
      const qty = adjusted.get(`${line.slug}:${line.variant}:${line.planter ?? ""}`) ?? (line.planter ? undefined : byVariant.get(`${line.slug}:${line.variant}`));
      if (!qty) storeActions.remove(line.id);
      else if (qty !== line.quantity) storeActions.setQuantity(line.id, qty);
    }
    setReview(null);
    forgetIdempotencyKey();
  };

  const payWithRazorpay = async (orderId: string, orderNumber: string, params: Parameters<typeof openRazorpay>[1]) => {
    setBusy("paying");
    setPendingRzp({ orderId, orderNumber });
    setRzpInfo(null);
    const outcome = await openRazorpay(orderId, params);
    if (outcome.status === "paid") return done(outcome.orderId);
    setBusy(null);
    submitting.current = false;
    if (outcome.status === "dismissed") setRzpInfo("Payment window closed. Your order is saved — complete payment when you're ready.");
    else setError(outcome.message);
  };

  const retry = async () => {
    if (!pendingRzp || submitting.current) return;
    submitting.current = true;
    setError(null);
    setBusy("paying");
    const res = await retryPayment(pendingRzp.orderId);
    if (!res.ok) {
      setError(res.error);
      setBusy(null);
      submitting.current = false;
      return;
    }
    await payWithRazorpay(res.data.orderId, res.data.orderNumber, res.data.razorpay);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current || quoting || !quote || hasIssues) return;
    submitting.current = true;
    setBusy("placing");
    setError(null);
    setReview(null);
    try {
      const res = await placeOrder({
        lines: inputs,
        addressId: addressId === "new" ? undefined : addressId,
        address: addressId === "new" ? draft : undefined,
        saveAddress: addressId === "new" && saveNew,
        contact,
        discountCode: appliedCode || null,
        notes,
        idempotencyKey: idempotencyKeyFor(currentSig),
        expectedTotal: quote.total,
      });
      if (!res.ok) {
        setFieldErrors(res.fieldErrors ?? {});
        setError(res.error);
        setBusy(null);
        submitting.current = false;
        if (res.fieldErrors) document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
        return;
      }
      setFieldErrors({});
      const data = res.data;
      if (data.kind === "needs_review") {
        forgetIdempotencyKey();
        setQuoteState({ sig: currentSig, quote: data.quote, error: null });
        setReview(data.message);
        setBusy(null);
        submitting.current = false;
        document.getElementById("order-summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (data.kind === "demo") return done(data.orderId);
      await payWithRazorpay(data.orderId, data.orderNumber, data.razorpay);
    } catch {
      setError("We couldn't reach the store. Nothing was charged — please try again.");
      setBusy(null);
      submitting.current = false;
    }
  };

  const clearErrors = (prefix: string) => setFieldErrors((prev) => (Object.keys(prev).some((k) => k.startsWith(prefix)) ? Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix))) : prev));
  const editContact = (next: typeof contact) => {
    setContact(next);
    clearErrors("contact.");
  };
  const editDraft = (next: AddressDraft) => {
    setDraft(next);
    clearErrors("address.");
  };

  const fe = (prefix: string) => Object.fromEntries(Object.entries(fieldErrors).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));

  /* ---------------- states ---------------- */

  if (!hydrated) return <CheckoutSkeleton />;

  if (busy === "redirecting") {
    return (
      <div className="container-page flex min-h-[40svh] flex-col items-center justify-center pb-20 text-center" role="status" aria-live="polite">
        <Loader2 className="size-8 animate-spin text-forest-700" aria-hidden />
        <p className="mt-4 font-display text-xl text-forest-900">Order placed — taking you to your receipt…</p>
      </div>
    );
  }

  if (cart.length === 0 && !pendingRzp) {
    return (
      <div className="container-page pb-20">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-lg rounded-[22px] bg-card px-6 py-14 text-center">
          <ShoppingBag className="mx-auto size-10 text-sage-500" aria-hidden />
          <h2 className="mt-4 font-display text-2xl font-semibold text-forest-900">Your bag is empty</h2>
          <p className="mt-2 text-sm text-moss">Add a plant or two, then come back to check out.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="btn btn-primary">
              Shop plants
            </Link>
            <Link href="/account" className="btn btn-outline text-forest-900">
              My orders
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const placeLabel =
    payments === "razorpay" ? `Pay ${quote ? formatPrice(quote.total) : ""} securely` : `Place demo order${quote ? ` · ${formatPrice(quote.total)}` : ""}`;
  const disabled = !!busy || quoting || !quote || hasIssues || !!pendingRzp;

  return (
    <form onSubmit={submit} noValidate className="container-page grid gap-6 pb-20 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div className="grid gap-6">
        {/* 1. Contact */}
        <Step n={1} title="Contact" id="contact-title">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Full name" name="contactName" autoComplete="name" maxLength={80} value={contact.fullName} onChange={(e) => editContact({ ...contact, fullName: e.target.value })} error={fe("contact.").fullName} />
            <TextField label="Mobile number" name="contactPhone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={16} placeholder="10-digit mobile" value={contact.phone} onChange={(e) => editContact({ ...contact, phone: e.target.value })} error={fe("contact.").phone} />
            <TextField
              label="Email"
              name="contactEmail"
              type="email"
              autoComplete="email"
              className="sm:col-span-2"
              value={contact.email}
              onChange={(e) => editContact({ ...contact, email: e.target.value })}
              error={fe("contact.").email}
              hint="We'll send order updates here."
            />
          </div>
        </Step>

        {/* 2. Delivery */}
        <Step n={2} title="Delivery address" id="delivery-title">
          <fieldset>
            <legend className="sr-only">Choose a delivery address</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "relative flex cursor-pointer gap-3 rounded-[14px] border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay",
                    addressId === a.id ? "border-forest-800 bg-sage-50 shadow-[inset_0_0_0_1px_var(--color-forest-800)]" : "border-forest-900/15 hover:border-forest-900/35",
                  )}
                >
                  <input type="radio" name="address" value={a.id} checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 size-4 accent-forest-800" />
                  <span className="min-w-0">
                    <span className="nav-caps mb-1 block text-forest-700">
                      {a.label}
                      {a.isDefault && <span className="ml-2 text-moss normal-case">· default</span>}
                    </span>
                    <AddressLines a={a} />
                  </span>
                </label>
              ))}
              {addresses.length > 0 && (
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-[14px] border border-dashed p-4 text-sm font-bold text-forest-900 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay",
                    addressId === "new" ? "border-forest-800 bg-sage-50" : "border-forest-900/25 hover:border-forest-900/45",
                  )}
                >
                  <input type="radio" name="address" value="new" checked={addressId === "new"} onChange={() => setAddressId("new")} className="size-4 accent-forest-800" />
                  <Plus className="size-4" aria-hidden /> Deliver to a new address
                </label>
              )}
            </div>
          </fieldset>
          <AnimatePresence initial={false}>
            {addressId === "new" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: curve }} className="overflow-hidden">
                <div className={cn("space-y-4", addresses.length > 0 && "mt-5 border-t border-forest-900/10 pt-5")}>
                  <AddressFields value={draft} onChange={editDraft} errors={fe("address.")} />
                  <label className="flex cursor-pointer items-center gap-3 text-sm text-forest-900">
                    <input type="checkbox" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)} className="size-4 accent-forest-800" />
                    Save this address to my account
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-5">
            <TextAreaField label="Delivery notes" name="notes" optional maxLength={500} rows={2} placeholder="Gate code, best time to deliver…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </Step>

        {/* 3. Payment */}
        <Step n={3} title="Payment" id="payment-title">
          {payments === "razorpay" ? (
            <div className="flex items-start gap-3 rounded-[14px] border border-forest-800 bg-sage-50 p-4 shadow-[inset_0_0_0_1px_var(--color-forest-800)]">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-forest-700" aria-hidden />
              <div>
                <p className="text-sm font-bold text-forest-900">Pay securely with Razorpay (test mode)</p>
                <p className="mt-1 text-xs leading-relaxed text-moss">UPI, cards, netbanking and wallets. Test mode: use Razorpay test credentials — no real money moves. Your order is confirmed only after we verify the payment with Razorpay.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-[14px] border-2 border-dashed border-forest-700/40 bg-sage-50 p-4">
              <FlaskConical className="mt-0.5 size-5 shrink-0 text-forest-700" aria-hidden />
              <div>
                <p className="text-sm font-bold text-forest-900">Demo checkout — no payment will be taken</p>
                <p className="mt-1 text-xs leading-relaxed text-moss">
                  No payment provider is connected to this preview. Your order is recorded as a demo order, marked &ldquo;not charged&rdquo;, and will not be shipped.
                </p>
              </div>
            </div>
          )}
          {backend === "demo" && <p className="mt-3 text-xs text-moss">Preview data is stored locally on this server.</p>}
        </Step>
      </div>

      {/* Summary */}
      <aside id="order-summary" aria-labelledby="summary-title" className="scroll-mt-32 lg:sticky lg:top-36">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.45, ease: curve }} className="rounded-[18px] bg-card p-5 sm:p-7">
          <h2 id="summary-title" className="font-display text-[1.3rem] font-semibold text-forest-900">
            Order summary
          </h2>

          {/* Issues */}
          <div aria-live="polite">
            <AnimatePresence initial={false}>
              {(hasIssues || review) && quote && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-4 rounded-[14px] border border-clay/35 bg-clay/8 p-4" role="alert">
                    <p className="flex items-center gap-2 text-sm font-bold text-clay-dark">
                      <AlertTriangle className="size-4" aria-hidden /> {review ?? "Some items in your bag changed"}
                    </p>
                    {issues.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-forest-800">
                        {issues.map((i) => (
                          <li key={`${i.slug}:${i.variant}:${i.kind}`}>{i.message}</li>
                        ))}
                      </ul>
                    )}
                    {issues.length > 0 ? (
                      <button type="button" onClick={() => updateBag(quote)} className="btn btn-primary mt-3 px-4 py-2 text-xs">
                        <RefreshCw className="size-3.5" aria-hidden /> Update my bag
                      </button>
                    ) : (
                      <button type="button" onClick={() => setReview(null)} className="btn btn-outline mt-3 px-4 py-2 text-xs text-forest-900">
                        OK, I&apos;ve reviewed the total
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Lines — server-priced when available, local images while pricing */}
          <ul className="mt-4 max-h-[22rem] divide-y divide-forest-900/10 overflow-y-auto pr-1">
            {(quote && !quoting ? quote.lines : []).map((l) => (
              <li key={`${l.slug}:${l.variant}:${l.planter ?? ""}`} className="flex gap-3 py-3">
                <span className="relative aspect-[5/7] w-14 shrink-0 overflow-hidden rounded-[8px] bg-ivory">
                  <Image src={l.image} alt="" fill sizes="56px" className="object-cover mix-blend-multiply" />
                  <span className="absolute -top-0 -right-0 grid min-w-5 place-items-center rounded-bl-[8px] bg-forest-800 px-1 text-[0.65rem] font-bold text-ivory">{l.quantity}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-forest-900">{l.name}</span>
                  <span className="block text-xs text-moss">{[l.variantLabel, l.planterLabel].filter(Boolean).join(" · ")}</span>
                  <span className="block text-xs text-moss">
                    {formatPrice(l.unitPrice)} × {l.quantity}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-forest-900">{formatPrice(l.lineTotal)}</span>
              </li>
            ))}
            {(quoting || !quote) &&
              localLines.map((l) => (
                <li key={l.id} className="flex gap-3 py-3" aria-hidden>
                  <span className="relative aspect-[5/7] w-14 shrink-0 overflow-hidden rounded-[8px] bg-ivory">
                    <Image src={l.product.image} alt="" fill sizes="56px" className="object-cover opacity-60 mix-blend-multiply" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-forest-900/70">{l.product.name}</span>
                    <span className="mt-1.5 block h-3 w-20 animate-pulse rounded-full bg-cream" />
                  </span>
                  <span className="h-3.5 w-14 animate-pulse rounded-full bg-cream" />
                </li>
              ))}
          </ul>

          {/* Discount */}
          <div className="mt-4 border-t border-forest-900/10 pt-4">
            {quote?.discountCode && !quoting ? (
              <div className="flex items-center justify-between gap-3 rounded-[12px] bg-sage-100 px-3.5 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-forest-800">
                  <Tag className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">
                    <strong>{quote.discountCode}</strong> applied{quote.discountMessage ? ` — ${quote.discountMessage}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedCode("");
                    setCodeDraft("");
                  }}
                  aria-label={`Remove code ${quote.discountCode}`}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-forest-800 hover:bg-sage-200"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            ) : (
              <div>
                <label htmlFor="discount-code" className="mb-1.5 block text-[0.82rem] font-bold text-forest-900">
                  Discount code
                </label>
                <div className="flex gap-2">
                  <input
                    id="discount-code"
                    value={codeDraft}
                    onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (codeDraft.trim()) setAppliedCode(codeDraft.trim());
                      }
                    }}
                    maxLength={40}
                    autoComplete="off"
                    placeholder="e.g. DEMO10"
                    aria-describedby="discount-msg"
                    aria-invalid={(!!appliedCode && !quoting && !!quote && !quote.discountCode) || undefined}
                    className="min-w-0 flex-1 rounded-full border border-forest-900/20 bg-ivory px-4 py-2.5 text-sm text-forest-900 uppercase outline-none placeholder:text-moss/60 placeholder:normal-case focus:border-forest-700 focus:ring-2 focus:ring-forest-700/20"
                  />
                  <button
                    type="button"
                    onClick={() => codeDraft.trim() && setAppliedCode(codeDraft.trim())}
                    disabled={!codeDraft.trim() || (quoting && !!appliedCode)}
                    className="btn btn-outline px-4 py-2.5 text-sm text-forest-900 disabled:opacity-50"
                  >
                    Apply
                  </button>
                </div>
                <p id="discount-msg" aria-live="polite" className="mt-1.5 min-h-4 text-xs">
                  {appliedCode && quoting ? (
                    <span className="text-moss">Checking code…</span>
                  ) : appliedCode && quote && !quote.discountCode ? (
                    <span className="text-clay-dark">{quote.discountMessage ?? "That code isn't valid."}</span>
                  ) : backend === "demo" ? (
                    <span className="text-moss">Preview code: DEMO10 for 10% off.</span>
                  ) : null}
                </p>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="mt-3 border-t border-forest-900/10 pt-4">
            {quoting || !quote ? (
              quoteState?.error && !quoting ? (
                <div className="space-y-2">
                  <FormMessage error={quoteState.error} />
                  <button type="button" onClick={() => setQuoteNonce((n) => n + 1)} className="btn btn-outline w-full text-sm text-forest-900">
                    <RefreshCw className="size-4" aria-hidden /> Try again
                  </button>
                </div>
              ) : (
                <SummarySkeleton />
              )
            ) : (
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-moss">Subtotal</dt>
                  <dd className="font-medium text-forest-900">{formatPrice(quote.subtotal)}</dd>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-moss">Discount</dt>
                    <dd className="font-medium text-forest-700">−{formatPrice(quote.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-moss">
                    Delivery
                    <span className="block text-[0.7rem] text-moss/80">Sample delivery rate for this preview</span>
                  </dt>
                  <dd className="font-medium text-forest-900">{quote.deliveryFee === 0 ? "Free" : formatPrice(quote.deliveryFee)}</dd>
                </div>
                <div className="mt-2 flex items-baseline justify-between border-t border-forest-900/10 pt-3">
                  <dt className="font-bold text-forest-900">Total</dt>
                  <dd>
                    <motion.span key={quote.total} initial={{ opacity: 0.4, y: -3 }} animate={{ opacity: 1, y: 0 }} className="block text-2xl font-semibold text-forest-900">
                      {formatPrice(quote.total)}
                    </motion.span>
                  </dd>
                </div>
                <p className="text-right text-[0.7rem] text-moss">Inclusive of taxes · prices confirmed by our server</p>
              </dl>
            )}
          </div>

          {/* Errors */}
          <FormMessage error={error} className="mt-4" />

          {/* Pending Razorpay order */}
          <AnimatePresence initial={false}>
            {pendingRzp && busy !== "paying" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-4 rounded-[14px] border border-sand bg-sand/30 p-4" role="status">
                  <p className="text-sm font-bold text-forest-900">Order {pendingRzp.orderNumber} is awaiting payment</p>
                  {rzpInfo && <p className="mt-1 text-xs text-moss">{rzpInfo}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={retry} className="btn btn-primary px-4 py-2 text-xs">
                      <RefreshCw className="size-3.5" aria-hidden /> Try payment again
                    </button>
                    <Link href={`/account/orders/${pendingRzp.orderId}`} className="btn btn-outline px-4 py-2 text-xs text-forest-900">
                      View order
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Place order */}
          {!pendingRzp && (
            <button type="submit" disabled={disabled} aria-busy={!!busy || undefined} className={cn("btn mt-5 w-full py-4 text-[0.95rem] disabled:cursor-not-allowed disabled:opacity-60", payments === "razorpay" ? "btn-primary" : "btn-leaf")}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : payments === "razorpay" ? <Lock className="size-4" aria-hidden /> : <CircleCheck className="size-4" aria-hidden />}
              {busy === "placing" ? "Placing order…" : busy === "paying" ? "Waiting for payment…" : placeLabel}
            </button>
          )}
          {busy === "paying" && pendingRzp && (
            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-moss" role="status">
              <Loader2 className="size-3.5 animate-spin" aria-hidden /> Complete the payment in the Razorpay window…
            </p>
          )}
          <p className="mt-3 text-center text-[0.7rem] leading-relaxed text-moss">
            {payments === "razorpay" ? "You'll be charged only after confirming in Razorpay." : "Demo order — not charged and not shipped."} By placing an order you agree to our{" "}
            <Link href="/help" className="underline underline-offset-2">
              terms
            </Link>
            .
          </p>
        </motion.div>
      </aside>
    </form>
  );
}
