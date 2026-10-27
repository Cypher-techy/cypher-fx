import { test, expect } from "@playwright/test";
test("blue and black palette is consistent across the trading view and account screens", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("hero-quote")).toHaveText(/\d/);
  await expect(page.locator(".cx-landing")).toHaveCSS(
    "background-color",
    "rgb(8, 11, 16)",
  );
  await expect(page.locator(".cx-pill-lime")).toHaveCSS(
    "background-color",
    "rgb(40, 120, 239)",
  );
  await expect(page.locator(".cx-intro h1 em")).toHaveCSS(
    "color",
    "rgb(120, 174, 255)",
  );
  for (const route of [
    "/markets",
    "/accounts",
    "/tools",
    "/help",
    "/login",
    "/register",
  ]) {
    await page.goto(route);
    await expect(page.locator(".web-site")).toBeVisible();
    const background = await page
      .locator(".web-site")
      .evaluate((e) => getComputedStyle(e).backgroundColor);
    const channels = background.match(/\d+/g)!.slice(0, 3).map(Number);
    expect(Math.max(...channels)).toBeLessThan(40);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("buy remains green and sell remains red across selection, mobile and terminal themes", async ({
  page,
}) => {
  await page.goto("/");
  const buttons = page.locator(".cx-side-toggle");
  const buy = buttons.getByRole("button", { name: "Buy", exact: true }),
    sell = buttons.getByRole("button", { name: "Sell", exact: true });
  const green = "rgb(21, 128, 61)",
    red = "rgb(220, 38, 38)";
  await expect(buy).toHaveCSS("background-color", green);
  await expect(sell).toHaveCSS("background-color", red);
  await sell.click();
  await page.mouse.move(0, 0);
  await expect(sell).toHaveAttribute("aria-pressed", "true");
  await expect(sell).toHaveCSS("background-color", red);
  await expect(buy).toHaveCSS("background-color", green);
  await buy.click();
  await page.mouse.move(0, 0);
  await expect(buy).toHaveAttribute("aria-pressed", "true");
  await expect(buy).toHaveCSS("background-color", green);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("tab", { name: "Order", exact: true }).click();
  await expect(buy).toHaveCSS("background-color", green);
  await expect(sell).toHaveCSS("background-color", red);
  await page.goto("/dashboard?view=terminal");
  await expect(
    page.getByRole("heading", { name: /Trading terminal/ }),
  ).toBeVisible({ timeout: 15000 });
  const sides = page.locator(".side-buttons");
  await expect(sides.locator("button.buy")).toHaveCSS(
    "background-color",
    green,
  );
  await expect(sides.locator("button.sell")).toHaveCSS("background-color", red);
  await expect(
    page.getByRole("button", { name: "Buy EUR/USD", exact: true }),
  ).toHaveCSS("background-color", green);
  await sides.locator("button.sell").click();
  await page.mouse.move(0, 0);
  await expect(
    page.getByRole("button", { name: "Sell EUR/USD", exact: true }),
  ).toHaveCSS("background-color", red);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByTitle("Toggle theme").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(sides.locator("button.buy")).toHaveCSS(
    "background-color",
    green,
  );
  await expect(sides.locator("button.sell")).toHaveCSS("background-color", red);
});
