import { expect, it, vi } from "vitest";
import { fixtureCandles, market, syntheticQuote } from "@/lib/providers/market";
import { encryptSecret, decryptSecret } from "@/lib/secrets";
import { stepUp, type User } from "@/lib/auth";
import { AppError } from "@/lib/errors";
it("fixtures are explicit and have valid chronological OHLC candles", async () => {
  const d = await market("EUR_USD", "1h");
  expect(d.status).toBe("SYNTHETIC_PRACTICE");
  expect(d.quote.synthetic).toBe(true);
  expect(d.attribution).toContain("Not live");
  const candles = fixtureCandles("EUR_USD", "1h");
  expect(candles.at(-1)?.close).toBe(Number(syntheticQuote("EUR_USD").bid));
  for (let i = 1; i < candles.length; i++) {
    expect(candles[i].time).toBeGreaterThan(candles[i - 1].time);
    expect(candles[i].high).toBeGreaterThanOrEqual(
      Math.max(candles[i].open, candles[i].close),
    );
    expect(candles[i].low).toBeLessThanOrEqual(
      Math.min(candles[i].open, candles[i].close),
    );
  }
});
it("unsupported symbols and timeframes are rejected", async () => {
  await expect(market("MADE_UP", "1h")).rejects.toBeInstanceOf(AppError);
  await expect(market("EUR_USD", "7m")).rejects.toBeInstanceOf(AppError);
});
it("MFA encryption authenticates the encrypted secret", () => {
  vi.stubEnv("AUTH_SECRET", "test-key-with-at-least-thirty-two-characters");
  const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
  expect(encrypted).not.toContain("JBSWY");
  expect(decryptSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  const split = encrypted.split(".");
  split[3] = "A" + split[3].slice(1);
  expect(() => decryptSecret(split.join("."))).toThrow();
  vi.unstubAllEnvs();
});
it("privileged financial step-up fails closed without MFA", async () => {
  const u = { role: "SUPER_ADMIN" } as User;
  await expect(stepUp(u, "password", "123456")).rejects.toThrow(
    "MFA enrollment",
  );
});
