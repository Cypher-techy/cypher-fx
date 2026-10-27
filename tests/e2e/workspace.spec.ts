import { test, expect } from "@playwright/test";
test("desktop practice trade, close, pending order and wallet isolation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByTitle("Trading terminal", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Trading terminal/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic prices. Simulated execution. Real confidence."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buy EUR/USD", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toBeVisible();
  const state = await page.request.get("/api/state").then((r) => r.json());
  expect(Number(state.data.wallet.available)).toBe(0);
  expect(state.data.positions[0].mode).toBe("DEMO");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByText("A clear view. A fresh opportunity."),
  ).toBeVisible();
  await page.getByRole("combobox").selectOption("LIMIT");
  await page.getByRole("spinbutton", { name: "Entry price" }).fill("1.01");
  await page.getByRole("button", { name: "Buy EUR/USD", exact: true }).click();
  await page.getByRole("button", { name: /Pending orders/ }).click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await page.locator("html").getAttribute("data-theme")).toBe("dark");
  await page.getByTitle("Toggle theme").click();
  expect(await page.locator("html").getAttribute("data-theme")).toBe("light");
  await page.getByRole("button", { name: "My wallet", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My wallet", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Deposit via M-Pesa" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Payments are not enabled",
  );
  await page.getByRole("spinbutton", { name: "Amount (KSh)" }).fill("1000");
  await page
    .getByRole("textbox", { name: "M-Pesa phone number" })
    .fill("0712345678");
  await page.getByRole("button", { name: "Check deposit eligibility" }).click();
  await expect(page.getByRole("status")).toContainText(/requires|disabled/);
  expect(errors).toEqual([]);
});
test("responsive navigation, search, learning and private support", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByTitle("Open navigation").click();
  await page
    .getByRole("button", { name: "Support center", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Subject", exact: true })
    .fill("Practice account question");
  await page
    .getByRole("textbox", { name: "Your message" })
    .fill("How can I learn more about the demo trading engine?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByRole("heading", { name: "Practice account question" }),
  ).toBeVisible();
  await page.getByTitle("Open navigation").click();
  await page.getByRole("button", { name: /Learning center/ }).click();
  await expect(
    page.getByRole("heading", { name: "Learn. Practice. Repeat." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Put it into practice" }).click();
  await page.getByRole("button", { name: "Find instrument" }).click();
  await page.getByPlaceholder("Search currency pairs…").fill("GBP");
  await page.getByRole("button", { name: /GBP\/USD British/ }).click();
  await expect(
    page.getByRole("button", { name: "Buy GBP/USD", exact: true }),
  ).toBeVisible();
});
test("registration, verification, reset, session isolation and unauthorized approval", async ({
  request,
  playwright,
}) => {
  const email = `e2e-${crypto.randomUUID()}@example.test`,
    password = "very-strong-test-password-123";
  let r = await request.post("/api/auth/register", {
    data: { name: "Test Trader", email, password, riskAccepted: true },
  });
  expect(r.ok()).toBeTruthy();
  const registration = await r.json();
  const verify = new URL(
    registration.data.developmentLink,
    "http://127.0.0.1:3000",
  ).searchParams.get("token");
  r = await request.post("/api/auth/verify", { data: { token: verify } });
  expect(r.ok()).toBeTruthy();
  let state = await request.get("/api/state").then((r) => r.json());
  expect(state.data.user.emailVerified).toBe(true);
  expect(state.data.positions).toHaveLength(0);
  r = await request.post("/api/admin/withdrawals/review", {
    data: {
      id: crypto.randomUUID(),
      decision: "APPROVE",
      password,
      otp: "000000",
      reason: "Bypass attempt",
    },
  });
  expect(r.status()).toBe(403);
  r = await request.post("/api/payments/callback", {
    data: {
      Body: {
        stkCallback: {
          CheckoutRequestID: "forged-" + crypto.randomUUID(),
          ResultCode: 0,
          CallbackMetadata: { Item: [{ Name: "Amount", Value: 100000 }] },
        },
      },
    },
  });
  expect(r.ok()).toBeTruthy();
  state = await request.get("/api/state").then((r) => r.json());
  expect(Number(state.data.wallet.available)).toBe(0);
  const other = await playwright.request.newContext({
    baseURL: "http://127.0.0.1:3000",
  });
  expect((await other.get("/api/state")).status()).toBe(401);
  await other.dispose();
  r = await request.post("/api/auth/forgot", { data: { email } });
  const forgot = await r.json();
  const token = new URL(
    forgot.data.developmentLink,
    "http://127.0.0.1:3000",
  ).searchParams.get("token");
  expect(
    (
      await request.post("/api/auth/reset", {
        data: { token, password: "another-strong-password-456" },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await request.get("/api/state")).status()).toBe(401);
  expect(
    (
      await request.post("/api/auth/login", {
        data: { email, password: "another-strong-password-456" },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await request.get("/api/state")).ok()).toBeTruthy();
  expect(
    (
      await request.post("/api/auth/verify", { data: { token: verify } })
    ).status(),
  ).toBe(400);
});
