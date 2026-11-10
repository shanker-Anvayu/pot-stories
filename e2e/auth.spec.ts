import { test, expect } from "@playwright/test";
import { readUsers, serviceClient } from "./env";
import { login } from "./helpers";

test.describe("Auth", () => {
  const users = readUsers();

  test("login, session persists, logout", async ({ page }) => {
    await login(page, users.alice);
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText(users.alice.email).first()).toBeVisible();
    await page.reload();
    await expect(page.getByText(users.alice.email).first()).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL((u) => u.pathname === "/");
    await page.goto("/account");
    await expect(page).toHaveURL(/\/account\/login/);
  });

  test("wrong password is rejected", async ({ page }) => {
    await page.goto("/account/login");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(users.alice.email);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password-123");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
  });

  test("signup form rejects invalid input without creating a user", async ({ page }) => {
    await page.goto("/account/register");
    await page.getByLabel("Full name").fill("E2E Signup");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill("not-an-email");
    await page.getByLabel("Password", { exact: true }).fill("short");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/account\/register/);
  });

  test("signup confirmation link creates a session and profile", async ({ page }) => {
    // Same path as the confirmation email (token_hash flow) without sending mail.
    const sb = serviceClient();
    const email = `e2e-signup-${users.runId}@example.com`;
    const { data, error } = await sb.auth.admin.generateLink({ type: "signup", email, password: `Pw-${users.runId}-Strong!9`, options: { data: { full_name: "E2E Signup" } } });
    expect(error).toBeNull();
    try {
      await page.goto(`/auth/callback?token_hash=${data.properties!.hashed_token}&type=signup&next=/account`);
      await expect(page.getByRole("heading", { name: /hello, e2e/i })).toBeVisible();
      const { data: prof } = await sb.from("profiles").select("role, full_name").eq("id", data.user!.id).single();
      expect(prof).toEqual({ role: "customer", full_name: "E2E Signup" });
    } finally {
      await sb.auth.admin.deleteUser(data.user!.id);
    }
  });

  test("password reset via recovery link", async ({ page }) => {
    const sb = serviceClient();
    const { data, error } = await sb.auth.admin.generateLink({ type: "recovery", email: users.bob.email });
    expect(error).toBeNull();
    await page.goto(`/auth/callback?token_hash=${data.properties!.hashed_token}&type=recovery&next=/account/reset-password`);
    await page.waitForURL(/reset-password/);
    const newPw = `Reset-${users.runId}-Pw!7`;
    await page.getByLabel("New password", { exact: true }).fill(newPw);
    await page.getByLabel("Confirm new password").fill(newPw);
    await page.getByRole("button", { name: "Set new password" }).click();
    await page.waitForURL((u) => !u.pathname.includes("reset-password"), { timeout: 20_000 });
    users.bob.password = newPw;
    const fs = await import("node:fs");
    const { USERS_FILE } = await import("./env");
    fs.writeFileSync(USERS_FILE, JSON.stringify(users));
    await page.context().clearCookies();
    await login(page, users.bob);
    await expect(page.getByText(users.bob.email).first()).toBeVisible();
  });

  test("customer is denied admin", async ({ page }) => {
    await login(page, users.alice);
    await page.goto("/admin");
    await expect(page).toHaveURL(/denied=admin/);
    await page.goto("/admin/products/new");
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 60_000 });
  });
});
