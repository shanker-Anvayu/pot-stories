import type { AddressInput } from "@/lib/domain";

/**
 * Pure input validation shared by Server Actions (authoritative) and client
 * forms (instant feedback only). Never import server-only modules here.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PIN_RE = /^[1-9][0-9]{5}$/;
export const PHONE_RE = /^[0-9]{10}$/;

export const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function validEmail(v: unknown): string | null {
  const email = str(v, 254).toLowerCase();
  return email && EMAIL_RE.test(email) ? email : null;
}

/** Strips spaces, dashes, a leading +91 / 0 so "+91 98765-43210" becomes "9876543210". */
export function normalisePhone(v: unknown): string {
  let digits = str(v, 30).replace(/[\s\-()]/g, "");
  if (digits.startsWith("+91")) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function validPhone(v: unknown): string | null {
  const p = normalisePhone(v);
  return PHONE_RE.test(p) ? p : null;
}

export function passwordError(v: unknown): string | null {
  if (typeof v !== "string" || v.length < 8) return "Use at least 8 characters.";
  if (v.length > 128) return "Use 128 characters or fewer.";
  return null;
}

export function nameError(v: unknown): string | null {
  const name = str(v, 200);
  if (name.length < 1) return "Please enter your name.";
  if (name.length > 80) return "Please keep your name under 80 characters.";
  return null;
}

/** Only same-site relative paths ("/account", not "//evil.com" or "https://…"). */
export function safeNext(v: unknown, fallback = "/account"): string {
  if (typeof v !== "string") return fallback;
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || /[\r\n]/.test(v)) return fallback;
  if (v.startsWith("/account/login") || v.startsWith("/account/register")) return fallback;
  return v.slice(0, 300);
}

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export type AddressFields = Omit<AddressInput, "id" | "isDefault">;

/** Validates an Indian shipping address. Returns cleaned values or field errors. */
export function validateAddress(raw: unknown): { ok: true; value: AddressFields } | { ok: false; fieldErrors: Record<string, string> } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const fullName = str(r.fullName, 200);
  const phone = normalisePhone(r.phone);
  const line1 = str(r.line1, 200);
  const line2 = str(r.line2, 200);
  const city = str(r.city, 100);
  const state = str(r.state, 100);
  const postalCode = str(r.postalCode, 10).replace(/\s/g, "");
  const label = str(r.label, 40) || "Home";

  if (!fullName) errors.fullName = "Enter the recipient's name.";
  else if (fullName.length > 80) errors.fullName = "Keep the name under 80 characters.";
  if (!PHONE_RE.test(phone)) errors.phone = "Enter a 10-digit mobile number.";
  if (line1.length < 3) errors.line1 = "Enter the house / flat and street.";
  if (line1.length > 150) errors.line1 = "Keep this under 150 characters.";
  if (line2.length > 150) errors.line2 = "Keep this under 150 characters.";
  if (city.length < 2) errors.city = "Enter the city.";
  if (!state) errors.state = "Choose a state.";
  else if (!(INDIAN_STATES as readonly string[]).includes(state)) errors.state = "Choose a state from the list.";
  if (!PIN_RE.test(postalCode)) errors.postalCode = "Enter a valid 6-digit PIN code.";

  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };
  return { ok: true, value: { label, fullName, phone, line1, line2: line2 || null, city, state, postalCode } };
}
