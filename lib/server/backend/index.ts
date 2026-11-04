import "server-only";
import { backendMode } from "../env";
import { demoBackend } from "./demo";
import type { Backend } from "./types";

/**
 * Returns the active backend. Supabase is used when its public URL and anon key
 * are configured; otherwise the local demo backend (JSON file) is used.
 */
export async function getBackend(): Promise<Backend> {
  if (backendMode() === "supabase") {
    const { supabaseBackend } = await import("./supabase");
    return supabaseBackend;
  }
  return demoBackend;
}

export type { Backend } from "./types";
