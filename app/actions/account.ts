"use server";

import { refresh } from "next/cache";
import type { ActionResult, Address, Profile } from "@/lib/domain";
import { getBackend } from "@/lib/server/backend";
import { AuthError, requireUser } from "@/lib/server/auth";
import { nameError, normalisePhone, PHONE_RE, str, validateAddress } from "./validation";

/**
 * Account mutations. The user id ALWAYS comes from the verified session
 * (requireUser), never from the browser; backend calls are scoped by it.
 */

const fail = (err: unknown, fallback: string): { ok: false; error: string } => ({
  ok: false,
  error: err instanceof AuthError ? err.message : fallback,
});

const UUIDISH = /^[A-Za-z0-9_-]{1,80}$/;

export async function updateProfileAction(input: { fullName: unknown; phone: unknown }): Promise<ActionResult<Profile>> {
  const fieldErrors: Record<string, string> = {};
  const nErr = nameError(input?.fullName);
  if (nErr) fieldErrors.fullName = nErr;
  const rawPhone = str(input?.phone, 30);
  const phone = rawPhone ? normalisePhone(rawPhone) : "";
  if (phone && !PHONE_RE.test(phone)) fieldErrors.phone = "Enter a 10-digit mobile number, or leave it blank.";
  if (Object.keys(fieldErrors).length) return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  try {
    const user = await requireUser();
    const backend = await getBackend();
    const profile = await backend.updateProfile(user.id, { fullName: str(input.fullName, 80), phone: phone || null });
    refresh();
    return { ok: true, data: profile };
  } catch (err) {
    return fail(err, "We couldn't save your details. Please try again.");
  }
}

export async function saveAddressAction(input: unknown): Promise<ActionResult<Address>> {
  const parsed = validateAddress(input);
  if (!parsed.ok) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.fieldErrors };
  const r = (input ?? {}) as Record<string, unknown>;
  const id = typeof r.id === "string" && UUIDISH.test(r.id) ? r.id : undefined;
  try {
    const user = await requireUser();
    const backend = await getBackend();
    if (id) {
      // Ownership: the id must belong to one of this user's addresses.
      const mine = await backend.listAddresses(user.id);
      if (!mine.some((a) => a.id === id)) return { ok: false, error: "That address could not be found." };
    }
    const address = await backend.saveAddress(user.id, { ...parsed.value, id, isDefault: r.isDefault === true });
    refresh();
    return { ok: true, data: address };
  } catch (err) {
    return fail(err, "We couldn't save that address. Please try again.");
  }
}

export async function deleteAddressAction(addressId: unknown): Promise<ActionResult> {
  if (typeof addressId !== "string" || !UUIDISH.test(addressId)) return { ok: false, error: "That address could not be found." };
  try {
    const user = await requireUser();
    const backend = await getBackend();
    const mine = await backend.listAddresses(user.id);
    const target = mine.find((a) => a.id === addressId);
    if (!target) return { ok: false, error: "That address could not be found." };
    await backend.deleteAddress(user.id, addressId);
    // Keep a default address when the default one is removed.
    const rest = mine.filter((a) => a.id !== addressId);
    if (target.isDefault && rest.length && !rest.some((a) => a.isDefault)) {
      const { id, label, fullName, phone, line1, line2, city, state, postalCode } = rest[0];
      await backend.saveAddress(user.id, { id, label, fullName, phone, line1, line2, city, state, postalCode, isDefault: true });
    }
    refresh();
    return { ok: true, data: undefined };
  } catch (err) {
    return fail(err, "We couldn't remove that address. Please try again.");
  }
}
