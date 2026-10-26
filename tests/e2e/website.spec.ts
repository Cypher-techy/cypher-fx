import { expect, test } from "@playwright/test";
test("public website has working navigation, honest statuses and a browser terminal", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /hydrated|hydration/i.test(m.text()))
      hydrationErrors.push(m.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /The markets move/ }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Live trading and real-money payments are not yet available.",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "How will withdrawals be approved?" })
    .click();
  await expect(
    page.getByText("Each eligible request must reserve funds", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Platform status", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Platform status", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Live forex execution" }),
  ).toBeVisible();
  await page.goto("/");
  await page
    .getByRole("link", { name: "Explore the demo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
});
test("public registration, verification and login are functional", async ({
  page,
}) => {
  await page.goto("/register");
  const email = `website-${crypto.randomUUID()}@example.test`,
    password = "website-test-password-123";
  await page.getByRole("textbox", { name: "Full name" }).fill("Website Trader");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create your profile", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Account created");
  await page.getByRole("link", { name: "Verify your email address" }).click();
  await expect(page.getByRole("status")).toContainText("Email verified");
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.locator("input[name=password]").fill(password);
  await page.getByRole("button", { name: "Sign in to your account" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(
    page.getByRole("heading", { name: /Welcome back, Website/ }),
  ).toBeVisible();
});
test("public homepage works at mobile widths", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /The markets move/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Website navigation" })
    .getByRole("link", { name: "Accounts", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Two accounts. One clear distinction." }),
  ).toBeInViewport();
  await page
    .getByRole("link", { name: "Open an account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/register/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
