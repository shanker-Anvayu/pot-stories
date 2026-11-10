import { expect, type Page } from "@playwright/test";
import type { TestUser } from "./env";

export async function login(page: Page, u: TestUser, next = "/account") {
  await page.goto(`/account/login?next=${encodeURIComponent(next)}`);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(u.email);
  await page.getByLabel("Password", { exact: true }).fill(u.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/account/login"));
}
export { expect };
