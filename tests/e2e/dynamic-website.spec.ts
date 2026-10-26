import { test, expect } from "@playwright/test";
test("homepage market data updates, pauses and changes instruments and timeframes", async ({
  page,
}) => {
  const runtimeErrors: string[] = [];
  page.on("pageerror", (e) => runtimeErrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /hydration|hydrated/i.test(m.text()))
      runtimeErrors.push(m.text());
  });
  await page.goto("/");
  await expect(page.getByTestId("hero-quote")).not.toHaveText("Connecting…");
  await expect(page.getByTestId("hero-quote")).toHaveText(/\d+\.\d+/);
  await expect(
    page.getByText("SYNTHETIC TRAINING REPLAY", { exact: true }),
  ).toBeVisible();
  const sequence = await page.getByTestId("market-sequence").innerText();
  await expect(page.getByTestId("market-sequence")).not.toHaveText(sequence, {
    timeout: 12000,
  });
  await page
    .getByRole("button", { name: "Pause market replay", exact: true })
    .click();
  const paused = await page.getByTestId("market-sequence").innerText();
  await page.waitForTimeout(5600);
  await expect(page.getByTestId("market-sequence")).toHaveText(paused);
  await page
    .getByRole("button", { name: "Resume market replay", exact: true })
    .click();
  await page.getByRole("button", { name: "View USD/JPY", exact: true }).click();
  await expect(page.locator(".dm-chart-name h3")).toHaveText("USD/JPY");
  await expect(page.getByTestId("hero-quote")).toHaveText(/\d{3}\.\d{3}/);
  await page
    .getByRole("group", { name: "Chart timeframe", exact: true })
    .getByRole("button", { name: "5M", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Hero chart timeframe" })
      .getByRole("button", { name: "5M", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Details", exact: true }).click();
  await expect(
    page.getByRole("tabpanel", { name: "Instrument details" }),
  ).toContainText("100,000 base units");
  await page.getByRole("link", { name: "Practice with USD/JPY" }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
  await expect(page.locator(".symbol-select strong")).toHaveText("USD/JPY");
  expect(runtimeErrors).toEqual([]);
});
test("search, category filters and favorites persist on the website", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("quote-EUR_USD")).toHaveText(/\d/);
  await page
    .getByRole("textbox", { name: "Search currency pairs" })
    .fill("GBP");
  await expect(
    page.getByRole("button", { name: "View GBP/USD", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "View EUR/USD", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Search currency pairs" })
    .fill("XYZ");
  await expect(page.getByText("No matching pairs")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add USD/JPY to favorites", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Market filters" })
    .getByRole("button", { name: "Favorites", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "View USD/JPY", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View USD/JPY", exact: true }).click();
  await page.reload();
  await expect(page.locator(".dm-chart-name h3")).toHaveText("USD/JPY");
  await page
    .getByRole("group", { name: "Market filters" })
    .getByRole("button", { name: "Favorites", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "View USD/JPY", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Market filters" })
    .getByRole("button", { name: "Europe", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "View USD/JPY", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "View EUR/USD", exact: true }),
  ).toBeVisible();
});
test("account tabs, FAQ search and server-side estimates work without moving money", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Real account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A foundation for real trading." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your space to practice." }),
  ).not.toBeVisible();
  await page.getByRole("tab", { name: "Demo account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your space to practice." }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Calculator instrument" })
    .selectOption("USD_JPY");
  await page
    .getByRole("spinbutton", { name: "Calculator volume in lots" })
    .fill("0.10");
  await page
    .getByRole("button", { name: "Calculate estimate", exact: true })
    .click();
  await expect(page.getByTestId("estimated-margin")).toHaveText("$100.00");
  await page
    .getByRole("combobox", { name: "Calculator leverage" })
    .selectOption("50");
  await expect(page.getByTestId("estimated-margin")).toHaveText("—");
  await page
    .getByRole("button", { name: "Calculate estimate", exact: true })
    .click();
  await expect(page.getByTestId("estimated-margin")).toHaveText("$200.00");
  await expect(
    page.getByText("No order is submitted and no wallet balance changes.", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search frequently asked questions" })
    .fill("M-Pesa");
  await expect(
    page.getByRole("button", {
      name: "Will CYPHERFX support M-Pesa?",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Do I need to download an app?",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Search frequently asked questions" })
    .fill("qwerty");
  await expect(
    page.getByText("No answers found", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Show all questions", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Do I need to download an app?",
      exact: true,
    }),
  ).toBeVisible();
});
test("data failures remain visible rather than showing fabricated live prices", async ({
  page,
}) => {
  await page.route("**/api/public/market?**", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: { message: "Provider temporarily unavailable" },
      }),
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("Data unavailable — last values may be stale"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Provider temporarily unavailable. Last received values are not current.",
    ),
  ).toBeVisible();
  await expect(page.getByTestId("hero-quote")).toHaveText("Unavailable");
});
