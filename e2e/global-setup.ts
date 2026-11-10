import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { USERS_FILE, serviceClient, type TestUser, type TestUsers } from "./env";

/** Creates confirmed throw-away users (no emails are sent) and makes one an admin. */
export default async function globalSetup() {
  const sb = serviceClient();
  const runId = crypto.randomBytes(4).toString("hex");
  const make = async (role: string): Promise<TestUser> => {
    const email = `e2e-${role}-${runId}@example.com`;
    const password = crypto.randomBytes(18).toString("base64url");
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `E2E ${role}` } });
    if (error || !data.user) throw new Error(`createUser(${role}) failed: ${error?.message}`);
    return { id: data.user.id, email, password };
  };
  const startedAt = new Date().toISOString();
  const users: TestUsers = { admin: await make("admin"), alice: await make("alice"), bob: await make("bob"), runId, startedAt };
  const { error } = await sb.from("profiles").update({ role: "admin" }).eq("id", users.admin.id);
  if (error) throw new Error(`promote admin failed: ${error.message}`);
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users));
}
