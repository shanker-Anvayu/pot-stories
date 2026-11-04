"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, LogOut, MapPin, Package, Pencil, Plus, ShieldAlert, Star, Trash2, UserRound } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import type { Address, Order, Profile } from "@/lib/domain";
import { deleteAddressAction, saveAddressAction, updateProfileAction } from "@/app/actions/account";
import { logoutAction } from "@/app/actions/auth";
import { useSession } from "@/components/providers/session-provider";
import { formatPrice } from "@/lib/format";
import { AddressForm, AddressLines } from "./address-form";
import { DemoNote, FormMessage, SubmitButton, TextField } from "./form-ui";
import { PaymentBadge, StatusBadge, formatDate } from "./order-ui";

const curve = [0.165, 0.84, 0.44, 1] as const;

function Panel({ title, icon: Icon, action, children, id }: { title: string; icon: typeof Package; action?: React.ReactNode; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-[18px] bg-card p-5 shadow-[0_20px_40px_-36px_rgba(14,29,21,0.5)] sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2.5 font-display text-[1.35rem] font-semibold text-forest-900">
          <Icon className="size-5 text-forest-600" aria-hidden />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const { refresh } = useSession();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={() =>
          start(async () => {
            const res = await logoutAction();
            if (!res.ok) {
              setError(res.error);
              return;
            }
            // Session provider clears the local bag/wishlist when the user signs out.
            await refresh();
            router.push("/");
            router.refresh();
          })
        }
        className={className ?? "btn btn-outline text-forest-900 disabled:opacity-60"}
      >
        <LogOut className="size-4" aria-hidden /> {pending ? "Signing out…" : "Sign out"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-clay-dark">
          {error}
        </p>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

function ProfilePanel({ profile }: { profile: Profile }) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { refresh } = useSession();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setSaved(null);
    start(async () => {
      const res = await updateProfileAction({ fullName, phone });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setError(res.error);
        return;
      }
      setErrors({});
      setEditing(false);
      setSaved("Your details were saved.");
      void refresh();
    });
  };

  return (
    <Panel
      id="profile-title"
      title="Your details"
      icon={UserRound}
      action={
        !editing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-forest-700 hover:bg-sage-100">
            <Pencil className="size-3.5" aria-hidden /> Edit
          </button>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.form key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onSubmit={submit} noValidate className="space-y-4">
            <TextField label="Full name" name="fullName" autoComplete="name" maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
            <TextField label="Mobile number" name="phone" type="tel" inputMode="numeric" autoComplete="tel-national" optional maxLength={16} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} hint="Used to prefill checkout. 10 digits." />
            <p className="text-xs text-moss">Email: {profile.email}</p>
            <FormMessage error={error} />
            <div className="flex flex-wrap gap-3">
              <SubmitButton pending={pending} pendingLabel="Saving…">
                Save
              </SubmitButton>
              <button
                type="button"
                className="btn btn-outline text-forest-900"
                disabled={pending}
                onClick={() => {
                  setEditing(false);
                  setErrors({});
                  setError(null);
                  setFullName(profile.fullName ?? "");
                  setPhone(profile.phone ?? "");
                }}
              >
                Cancel
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.dl key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-4 text-sm">
            {[
              ["Name", profile.fullName || "—"],
              ["Email", profile.email],
              ["Mobile", profile.phone ? `+91 ${profile.phone}` : "Not added"],
              ["Member since", formatDate(profile.createdAt)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[0.68rem] font-bold tracking-[0.12em] text-moss uppercase">{k}</dt>
                <dd className="mt-0.5 font-medium break-words text-forest-900">{v}</dd>
              </div>
            ))}
          </motion.dl>
        )}
      </AnimatePresence>
      {!editing && <FormMessage success={saved} className="mt-4" />}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

function AddressBook({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, start] = useTransition();

  const remove = (a: Address) => {
    if (!window.confirm(`Remove the address "${a.label}"?`)) return;
    setBusyId(a.id);
    setError(null);
    start(async () => {
      const res = await deleteAddressAction(a.id);
      setBusyId(null);
      if (!res.ok) setError(res.error);
      else setMessage("Address removed.");
    });
  };

  const makeDefault = (a: Address) => {
    setBusyId(a.id);
    setError(null);
    start(async () => {
      const res = await saveAddressAction({ ...a, line2: a.line2 ?? "", isDefault: true });
      setBusyId(null);
      if (!res.ok) setError(res.error);
      else setMessage(`"${a.label}" is now your default address.`);
    });
  };

  return (
    <Panel
      id="addresses-title"
      title="Addresses"
      icon={MapPin}
      action={
        !editing && (
          <button type="button" onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-forest-700 hover:bg-sage-100">
            <Plus className="size-3.5" aria-hidden /> Add
          </button>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <motion.div key="form" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="mb-4 text-sm font-bold text-forest-900">{editing === "new" ? "New address" : `Edit “${editing.label}”`}</p>
            <AddressForm
              initial={editing === "new" ? undefined : editing}
              onCancel={() => setEditing(null)}
              onDone={() => {
                setEditing(null);
                setMessage("Address saved.");
              }}
            />
          </motion.div>
        ) : addresses.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[14px] border border-dashed border-forest-900/20 p-6 text-center">
            <p className="text-sm text-moss">No saved addresses yet. Add one now, or save it during checkout.</p>
          </motion.div>
        ) : (
          <motion.ul key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-3">
            {addresses.map((a) => (
              <motion.li layout key={a.id} transition={{ duration: 0.3, ease: curve }} className="rounded-[14px] border border-forest-900/12 bg-ivory/60 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="nav-caps text-forest-700">{a.label}</span>
                  {a.isDefault && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-leaf px-2 py-0.5 text-[0.65rem] font-bold text-forest-900 uppercase">
                      <Star className="size-3" aria-hidden /> Default
                    </span>
                  )}
                </div>
                <AddressLines a={a} />
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-forest-900/10 pt-3">
                  <button type="button" onClick={() => setEditing(a)} disabled={busyId === a.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-forest-800 hover:bg-sage-100 disabled:opacity-50">
                    <Pencil className="size-3" aria-hidden /> Edit<span className="sr-only"> {a.label}</span>
                  </button>
                  {!a.isDefault && (
                    <button type="button" onClick={() => makeDefault(a)} disabled={busyId === a.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-forest-800 hover:bg-sage-100 disabled:opacity-50">
                      <Star className="size-3" aria-hidden /> Make default<span className="sr-only"> ({a.label})</span>
                    </button>
                  )}
                  <button type="button" onClick={() => remove(a)} disabled={busyId === a.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-clay-dark hover:bg-clay/10 disabled:opacity-50">
                    <Trash2 className="size-3" aria-hidden /> Remove<span className="sr-only"> {a.label}</span>
                  </button>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      {!editing && <FormMessage error={error} success={error ? null : message} className="mt-4" />}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

function OrderHistory({ orders }: { orders: Order[] }) {
  return (
    <Panel id="orders-title" title="Orders" icon={Package}>
      {orders.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-forest-900/20 px-6 py-10 text-center">
          <Package className="mx-auto size-8 text-sage-500" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold text-forest-900">No orders yet</p>
          <p className="mt-1 text-sm text-moss">When you place an order it will appear here.</p>
          <Link href="/shop" className="btn btn-primary mt-5">
            Shop plants
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {orders.map((o, i) => {
            const count = o.items.reduce((s, it) => s + it.quantity, 0);
            return (
              <motion.li key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.35, ease: curve }}>
                <Link
                  href={`/account/orders/${o.id}`}
                  className="group flex items-center gap-4 rounded-[14px] border border-forest-900/12 bg-ivory/60 p-3 transition-colors hover:border-forest-900/30 hover:bg-ivory sm:p-4"
                >
                  <span className="flex shrink-0 -space-x-3">
                    {o.items.slice(0, 3).map((it) => (
                      <span key={it.id} className="relative size-12 overflow-hidden rounded-[10px] border-2 border-ivory bg-card sm:size-14">
                        <Image src={it.imageUrl} alt="" fill sizes="56px" className="object-cover mix-blend-multiply" />
                      </span>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-bold text-forest-900">{o.orderNumber}</span>
                      <StatusBadge status={o.status} />
                      <PaymentBadge status={o.paymentStatus} />
                    </span>
                    <span className="mt-1 block text-xs text-moss">
                      {formatDate(o.createdAt)} · {count} item{count === 1 ? "" : "s"} · {formatPrice(o.total)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-moss transition-transform group-hover:translate-x-0.5" aria-hidden />
                  <span className="sr-only">View order {o.orderNumber}</span>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */

export function AccountDashboard({ profile, addresses, orders, deniedAdmin }: { profile: Profile; addresses: Address[]; orders: Order[]; deniedAdmin: boolean }) {
  const { backend } = useSession();
  const first = (profile.fullName ?? "").split(" ")[0] || "there";
  return (
    <>
      <section className="border-b border-forest-900/10 bg-sage-100">
        <div className="container-page flex flex-col gap-5 py-10 sm:flex-row sm:items-end sm:justify-between sm:py-12">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: curve }}>
            <p className="nav-caps text-forest-700">My account</p>
            <h1 className="display-heavy mt-3 text-[clamp(2.2rem,5vw,3.6rem)] text-forest-900">
              Hello, <em className="text-forest-600">{first}</em>
            </h1>
            <p className="mt-2 text-sm text-moss">{profile.email}</p>
          </motion.div>
          <div>
            <SignOutButton />
          </div>
        </div>
      </section>

      <div className="container-page py-10 sm:py-14">
        {deniedAdmin && (
          <p role="alert" className="mb-6 flex items-start gap-2.5 rounded-[14px] border border-clay/30 bg-clay/8 px-4 py-3 text-sm text-clay-dark">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            That area is for store administrators only. You&apos;ve been brought back to your account.
          </p>
        )}
        {backend === "demo" && <DemoNote className="mb-6">Preview mode: accounts, addresses and orders are stored locally on this server. Demo orders are never charged.</DemoNote>}
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <OrderHistory orders={orders} />
          <div className="grid gap-6">
            <ProfilePanel profile={profile} />
            <AddressBook addresses={addresses} />
          </div>
        </div>
      </div>
    </>
  );
}
