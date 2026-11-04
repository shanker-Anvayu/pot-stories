"use client";

import { useState, useTransition, type FormEvent } from "react";
import type { Address } from "@/lib/domain";
import { saveAddressAction } from "@/app/actions/account";
import { INDIAN_STATES } from "@/app/actions/validation";
import { FormMessage, SelectField, SubmitButton, TextField } from "./form-ui";

export interface AddressDraft {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

export const emptyAddress = (fullName = "", phone = ""): AddressDraft => ({
  label: "Home",
  fullName,
  phone,
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
});

export const draftFrom = (a: Address): AddressDraft => ({
  label: a.label,
  fullName: a.fullName,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2 ?? "",
  city: a.city,
  state: a.state,
  postalCode: a.postalCode,
});

/** Controlled Indian address fields. `errors` keys match AddressDraft keys. */
export function AddressFields({ value, onChange, errors = {} }: { value: AddressDraft; onChange: (next: AddressDraft) => void; errors?: Record<string, string> }) {
  const set = (k: keyof AddressDraft) => (e: { target: { value: string } }) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField label="Recipient name" name="fullName" autoComplete="shipping name" maxLength={80} value={value.fullName} onChange={set("fullName")} error={errors.fullName} />
      <TextField
        label="Mobile number"
        name="phone"
        type="tel"
        autoComplete="shipping tel-national"
        inputMode="numeric"
        maxLength={16}
        placeholder="10-digit mobile"
        value={value.phone}
        onChange={set("phone")}
        error={errors.phone}
      />
      <TextField label="Flat / house no., building, street" name="line1" autoComplete="shipping address-line1" maxLength={150} value={value.line1} onChange={set("line1")} error={errors.line1} className="sm:col-span-2" />
      <TextField label="Area, landmark" name="line2" optional autoComplete="shipping address-line2" maxLength={150} value={value.line2} onChange={set("line2")} error={errors.line2} className="sm:col-span-2" />
      <TextField label="City" name="city" autoComplete="shipping address-level2" maxLength={100} value={value.city} onChange={set("city")} error={errors.city} />
      <TextField
        label="PIN code"
        name="postalCode"
        autoComplete="shipping postal-code"
        inputMode="numeric"
        maxLength={6}
        pattern="[1-9][0-9]{5}"
        placeholder="6 digits"
        value={value.postalCode}
        onChange={(e) => onChange({ ...value, postalCode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
        error={errors.postalCode}
      />
      <SelectField label="State" name="state" autoComplete="shipping address-level1" value={value.state} onChange={set("state")} error={errors.state}>
        <option value="">Select a state</option>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </SelectField>
      <TextField label="Label" name="label" optional maxLength={40} placeholder="Home, Office…" value={value.label} onChange={set("label")} error={errors.label} />
    </div>
  );
}

/** Saves (creates or edits) an address via the server action. */
export function AddressForm({ initial, onDone, onCancel }: { initial?: Address; onDone: (a: Address) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<AddressDraft>(initial ? draftFrom(initial) : emptyAddress());
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pending) return;
    setError(null);
    start(async () => {
      const res = await saveAddressAction({ ...draft, id: initial?.id, isDefault });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setError(res.error);
        return;
      }
      setErrors({});
      onDone(res.data);
    });
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <AddressFields value={draft} onChange={setDraft} errors={errors} />
      <label className="flex cursor-pointer items-center gap-3 text-sm text-forest-900">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="size-4 accent-forest-800" />
        Use as my default address
      </label>
      <FormMessage error={error} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {initial ? "Save changes" : "Save address"}
        </SubmitButton>
        <button type="button" onClick={onCancel} className="btn btn-outline text-forest-900" disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function AddressLines({ a }: { a: { fullName: string; phone: string; line1: string; line2: string | null; city: string; state: string; postalCode: string } }) {
  return (
    <address className="text-sm leading-relaxed text-forest-800 not-italic">
      <span className="font-bold text-forest-900">{a.fullName}</span>
      <br />
      {a.line1}
      {a.line2 && (
        <>
          <br />
          {a.line2}
        </>
      )}
      <br />
      {a.city}, {a.state} {a.postalCode}
      <br />
      <span className="text-moss">+91 {a.phone}</span>
    </address>
  );
}
