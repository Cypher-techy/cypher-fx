import { beforeAll, describe, expect, it } from "vitest";
import { database, rows, sql, id } from "@/db";
import { provision, type User } from "@/lib/auth";
import {
  settleVerifiedDeposit,
  reserveWithdrawal,
  reviewWithdrawal,
  confirmPayout,
  reconciliation,
  post,
} from "@/lib/services/ledger";
import { submitDemo, closeDemo, pnl } from "@/lib/services/demo";
import { dispatchApprovedPayout } from "@/lib/providers/payout";
import { executionProvider } from "@/lib/providers/execution";
let customer: string, adminId: string, supportId: string;
let admin: User, support: User;
async function deposit(uid: string, amount: bigint) {
  const did = id();
  await rows(
    sql`INSERT INTO deposits(id,user_id,amount,phone,idempotency_key,checkout_ref) VALUES(${did},${uid},${amount.toString()},'254712345678',${id()},${id()})`,
  );
  return did;
}
async function wallet(uid: string) {
  const [w] = await rows<{ available: string; reserved: string }>(
    sql`SELECT * FROM wallets WHERE user_id=${uid}`,
  );
  return w;
}
beforeAll(async () => {
  await database();
  customer = await provision(
    "Test Customer",
    `customer-${id()}@test.invalid`,
    "strong-password-for-tests",
  );
  adminId = await provision(
    "Test Admin",
    `admin-${id()}@test.invalid`,
    "strong-password-for-tests",
    { role: "SUPER_ADMIN", status: "active" },
  );
  supportId = await provision(
    "Test Support",
    `support-${id()}@test.invalid`,
    "strong-password-for-tests",
    { role: "SUPPORT", status: "active" },
  );
  [admin] = await rows<User>(sql`SELECT * FROM users WHERE id=${adminId}`);
  [support] = await rows<User>(sql`SELECT * FROM users WHERE id=${supportId}`);
});
describe("double-entry finance and strict approval gate", () => {
  it("a verified payment is credited once even for duplicate concurrent reconciliation", async () => {
    const did = await deposit(customer, 1000000n);
    await Promise.all([
      settleVerifiedDeposit(did, "RECEIPT-" + did, 1000000n, "254712345678"),
      settleVerifiedDeposit(did, "RECEIPT-" + did, 1000000n, "254712345678"),
    ]);
    expect(BigInt((await wallet(customer)).available)).toBe(1000000n);
    const tx = await rows(
      sql`SELECT * FROM ledger_transactions WHERE reference=${"deposit:" + did}`,
    );
    expect(tx).toHaveLength(1);
  });
  it("rejects mismatched amount and phone; failed payment is never automatically credited", async () => {
    const did = await deposit(customer, 20000n);
    await rows(sql`UPDATE deposits SET status='CANCELLED' WHERE id=${did}`);
    await expect(
      settleVerifiedDeposit(did, "BAD", 20001n, "254712345678"),
    ).rejects.toThrow("match");
    expect(BigInt((await wallet(customer)).available)).toBe(1000000n);
  });
  it("reserves atomically and requires explicit admin review", async () => {
    const key = id();
    const w = await reserveWithdrawal(customer, 100000n, "254712345678", key);
    expect(w.status).toBe("PENDING_ADMIN_APPROVAL");
    expect(BigInt((await wallet(customer)).available)).toBe(900000n);
    expect(BigInt((await wallet(customer)).reserved)).toBe(100000n);
    const repeated = await reserveWithdrawal(
      customer,
      100000n,
      "254712345678",
      key,
    );
    expect(repeated.id).toBe(w.id);
    await expect(confirmPayout(w.id, "FORGED")).rejects.toThrow("approved");
    await expect(dispatchApprovedPayout(w.id)).rejects.toThrow("unavailable");
  });
  it("support cannot approve by invoking the service", async () => {
    const w = await reserveWithdrawal(customer, 10000n, "254712345678", id());
    await expect(
      reviewWithdrawal(support, w.id, "APPROVE", "test approval"),
    ).rejects.toThrow("role");
    await reviewWithdrawal(admin, w.id, "REJECT", "Insufficient verification");
  });
  it("Super Admin cannot approve own withdrawal", async () => {
    const did = await deposit(adminId, 10000n);
    await settleVerifiedDeposit(did, "SELF-" + did, 10000n, "254712345678");
    const w = await reserveWithdrawal(adminId, 10000n, "254712345678", id());
    await expect(
      reviewWithdrawal(admin, w.id, "APPROVE", "self"),
    ).rejects.toThrow("own");
  });
  it("rejection releases the reservation and keeps audit history", async () => {
    const before = await wallet(customer);
    const w = await reserveWithdrawal(customer, 50000n, "254712345678", id());
    await expect(reviewWithdrawal(admin, w.id, "REJECT", "")).rejects.toThrow(
      "reason",
    );
    await reviewWithdrawal(admin, w.id, "REJECT", "Identity review incomplete");
    expect(await wallet(customer)).toEqual(before);
    await expect(
      reviewWithdrawal(admin, w.id, "APPROVE", "override"),
    ).rejects.toThrow("pending");
    const audit = await rows(
      sql`SELECT * FROM audit_logs WHERE reference=${w.id}`,
    );
    expect(audit.length).toBeGreaterThanOrEqual(2);
  });
  it("approval is not payment; settlement requires a previously dispatched reference", async () => {
    const w = await reserveWithdrawal(customer, 20000n, "254712345678", id());
    const approved = await reviewWithdrawal(
      admin,
      w.id,
      "APPROVE",
      "Verified by test administrator",
    );
    expect(approved.status).toBe("APPROVED_PENDING_PAYOUT");
    await expect(confirmPayout(w.id, "NOPE")).rejects.toThrow("matching");
    await rows(
      sql`UPDATE withdrawal_requests SET status='PROCESSING',provider_ref=${"PAYOUT-" + w.id} WHERE id=${w.id}`,
    );
    await confirmPayout(w.id, "PAYOUT-" + w.id);
    const after = await wallet(customer);
    await confirmPayout(w.id, "PAYOUT-" + w.id);
    expect(await wallet(customer)).toEqual(after);
    const [paid] = await rows<{ status: string }>(
      sql`SELECT status FROM withdrawal_requests WHERE id=${w.id}`,
    );
    expect(paid.status).toBe("PAID");
  });
  it("two concurrent withdrawals cannot spend the same funds twice", async () => {
    const uid = await provision(
      "Race",
      `race-${id()}@test.invalid`,
      "strong-test-password",
    );
    const did = await deposit(uid, 10000n);
    await settleVerifiedDeposit(did, "RACE-" + did, 10000n, "254712345678");
    const r = await Promise.allSettled([
      reserveWithdrawal(uid, 8000n, "254712345678", id()),
      reserveWithdrawal(uid, 8000n, "254712345678", id()),
    ]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(BigInt((await wallet(uid)).available)).toBe(2000n);
  });
  it("unbalanced postings are rejected by the database deferred constraint", async () => {
    const db = await database();
    await expect(
      db.transaction(async (tx) => {
        const tid = id();
        await tx.execute(
          sql`INSERT INTO ledger_transactions(id,reference,description) VALUES(${tid},${id()},'bad')`,
        );
        await tx.execute(
          sql`INSERT INTO ledger_entries(id,transaction_id,account_id,amount) VALUES(${id()},${tid},'clearing:mpesa',100)`,
        );
      }),
    ).rejects.toThrow();
  });
  it("posted entries and audit are immutable", async () => {
    await expect(
      rows(sql`UPDATE ledger_entries SET amount=1`),
    ).rejects.toThrow();
    await expect(rows(sql`DELETE FROM audit_logs`)).rejects.toThrow();
    const [journal] = await rows<{ id: string }>(
      sql`SELECT id FROM ledger_transactions LIMIT 1`,
    );
    await expect(
      rows(
        sql`INSERT INTO ledger_entries(id,transaction_id,account_id,amount) VALUES(${id()},${journal.id},'clearing:mpesa',1)`,
      ),
    ).rejects.toThrow();
  });
  it("every available/reserved projection matches its ledger sum", async () => {
    const r = await reconciliation();
    for (const a of r)
      if (a.projected_balance !== null)
        expect(a.ledger_balance).toBe(a.projected_balance);
  });
});
describe("practice isolation and truthful provider handling", () => {
  it("practice order and close never touch real wallet or ledger", async () => {
    const before = await wallet(customer);
    const ledgerBefore = await rows(
      sql`SELECT count(*) AS count FROM ledger_transactions`,
    );
    await submitDemo(customer, {
      symbol: "EUR_USD",
      side: "BUY",
      type: "MARKET",
      lots: "0.10",
      key: id(),
    });
    const [p] = await rows<{ id: string }>(
      sql`SELECT id FROM positions WHERE user_id=${customer} AND status='OPEN'`,
    );
    expect(p).toBeTruthy();
    await closeDemo(customer, p.id);
    expect(await wallet(customer)).toEqual(before);
    expect(
      await rows(sql`SELECT count(*) AS count FROM ledger_transactions`),
    ).toEqual(ledgerBefore);
  });
  it("enforces margin and stop-loss direction", async () => {
    await expect(
      submitDemo(customer, {
        symbol: "EUR_USD",
        side: "BUY",
        type: "MARKET",
        lots: "100",
        key: id(),
      }),
    ).rejects.toThrow("margin");
    await expect(
      submitDemo(customer, {
        symbol: "EUR_USD",
        side: "BUY",
        type: "MARKET",
        lots: ".10",
        stopLoss: "2",
        key: id(),
      }),
    ).rejects.toThrow("wrong side");
  });
  it("keeps pending practice orders separate", async () => {
    const o = await submitDemo(customer, {
      symbol: "EUR_USD",
      side: "BUY",
      type: "LIMIT",
      lots: ".01",
      price: "1.01",
      key: id(),
    });
    const [row] = await rows<{ mode: string; status: string }>(
      sql`SELECT mode,status FROM orders WHERE id=${o.id}`,
    );
    expect(row).toEqual({ mode: "DEMO", status: "PENDING" });
  });
  it("uses decimal P&L rather than binary floating point", () => {
    expect(
      pnl(
        { symbol: "EUR_USD", side: "BUY", lots: ".10", entry_price: "1.08452" },
        "1.08464",
      ).toFixed(2),
    ).toBe("1.20");
  });
  it("unconfigured live execution fails without fabricating a fill", async () => {
    await expect(executionProvider.submitOrder({}, id())).rejects.toThrow(
      "unavailable",
    );
  });
});
