import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Loads .env.local into process.env (values are never logged). */
export function loadEnv() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
export const serviceClient = () => createClient(SUPABASE_URL, SERVICE_KEY, noSession);
export const anonClient = () => createClient(SUPABASE_URL, ANON_KEY, noSession);

export const USERS_FILE = path.join(process.cwd(), "test-results", ".e2e-users.json");
export type TestUser = { id: string; email: string; password: string };
export type TestUsers = { admin: TestUser; alice: TestUser; bob: TestUser; runId: string; startedAt: string };
export const readUsers = (): TestUsers => JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

/** A client signed in as a test user (RLS applies). */
export async function userClient(u: TestUser) {
  const sb = createClient(SUPABASE_URL, ANON_KEY, noSession);
  const { error } = await sb.auth.signInWithPassword({ email: u.email, password: u.password });
  if (error) throw new Error(`sign-in failed for test user: ${error.message}`);
  return sb;
}
