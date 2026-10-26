import { test, expect } from "@playwright/test";
test("landing reviews a server-priced practice order before any execution, keeping the real wallet unchanged", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(new URL(r.url()).pathname);
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Review demo order" }).click();
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Synthetic practice feed");
  await expect(modal).toContainText("not the homepage replay");
  const before = (await (await page.request.get("/api/state")).json()).data;
  expect(before.orders).toHaveLength(0);
  expect(posts).not.toContain("/api/demo/orders");
  await modal.getByRole("button", { name: "Keep exploring" }).click();
  expect(
    (await (await page.request.get("/api/state")).json()).data.orders,
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Sell", exact: true }).click();
  await page.getByRole("button", { name: "0.01", exact: true }).click();
  await page.getByRole("button", { name: "Review demo order" }).click();
  await expect(modal).toContainText("EUR/USD · SELL");
  await modal.getByRole("button", { name: "Confirm practice sell" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Practice order filled at",
  );
  const after = (await (await page.request.get("/api/state")).json()).data;
  expect(after.orders).toHaveLength(1);
  expect(after.orders[0]).toMatchObject({
    mode: "DEMO",
    status: "FILLED",
    side: "SELL",
    lots: "0.01",
  });
  expect(after.wallet).toEqual(before.wallet);
  expect(after.demo.balance).toEqual(before.demo.balance);
  await page.getByRole("link", { name: "View your position" }).click();
  await expect(
    page.getByRole("heading", { name: "Trading terminal", exact: false }),
  ).toBeVisible();
});
test("real-account tab stays locked without calling real execution or payment APIs", async ({
  page,
}) => {
  const paths: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") paths.push(new URL(r.url()).pathname);
  });
  await page.goto("/");
  await page.getByRole("tab", { name: "Real account", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Live trading unavailable." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review demo order" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Switch to demo" }).click();
  await expect(
    page.getByRole("button", { name: "Review demo order" }),
  ).toBeVisible();
  expect(paths).toEqual([]);
});
test("mobile trading views and keyboard navigation remain usable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("hero-quote")).toHaveText(/\d/);
  await expect(
    page.getByRole("button", { name: "Review demo order" }),
  ).not.toBeVisible();
  await page.getByRole("tab", { name: "Order", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Review demo order" }),
  ).toBeVisible();
  await expect(page.getByTestId("hero-quote")).not.toBeVisible();
  await page.getByRole("button", { name: "Review demo order" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close order review" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Review demo order" }),
  ).toBeFocused();
  await page.getByRole("tab", { name: "Chart", exact: true }).click();
  await expect(page.getByTestId("hero-quote")).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "Website navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "Website navigation" }),
  ).not.toBeVisible();
  for (const url of ["/", "/markets", "/accounts", "/tools", "/help"]) {
    await page.goto(url);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
test("practice execution provider failures do not invent a review quote or submit an order", async ({
  page,
}) => {
  await page.route("**/api/market?**", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: { message: "Practice feed unavailable" },
      }),
    }),
  );
  await page.goto("/");
  let orders = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/demo/orders")) orders++;
  });
  await page.getByRole("button", { name: "Review demo order" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Practice feed unavailable" }),
  ).toContainText("Practice feed unavailable");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(orders).toBe(0);
});

test("invalid stop loss is rejected by the server without creating a practice fill", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Stop loss & take profit" }).click();
  await page.getByRole("spinbutton", { name: "Order stop loss" }).fill("10");
  await page.getByRole("button", { name: "Review demo order" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm practice buy" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Stop loss is on the wrong side of entry",
  );
  const state = (await (await page.request.get("/api/state")).json()).data;
  expect(state.orders).toHaveLength(0);
  expect(state.positions).toHaveLength(0);
});
