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
