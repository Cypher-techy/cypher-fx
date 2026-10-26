import { database, rows, sql, id, type DB } from "@/db";
import { audit, type User, authorize } from "../auth";
import { requireThat } from "../errors";
type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type Withdrawal = {
  id: string;
  user_id: string;
  amount: string;
  phone: string;
  status: string;
  approved_by: string | null;
  provider_ref: string | null;
};
export async function post(
  tx: Tx,
  reference: string,
  description: string,
  entries: { account: string; amount: bigint }[],
) {
  requireThat(
    entries.length >= 2 && entries.reduce((a, e) => a + e.amount, 0n) === 0n,
    400,
    "Unbalanced posting",
  );
  const tid = id();
  await tx.execute(
    sql`INSERT INTO ledger_transactions(id,reference,description) VALUES(${tid},${reference},${description})`,
  );
  for (const e of entries)
    await tx.execute(
      sql`INSERT INTO ledger_entries(id,transaction_id,account_id,amount) VALUES(${id()},${tid},${e.account},${e.amount.toString()})`,
    );
}
export async function notify(
  tx: Tx,
  user: string,
  title: string,
  body: string,
) {
  await tx.execute(
    sql`INSERT INTO notifications(id,user_id,title,body) VALUES(${id()},${user},${title},${body})`,
  );
}
// Called only by a trusted reconciler after receipt + amount + phone validation, NOT directly from callback/client.
export async function settleVerifiedDeposit(
  depositId: string,
  receipt: string,
  verifiedAmount: bigint,
  verifiedPhone: string,
) {
  const db = await database();
  return db.transaction(async (tx) => {
    const [d] = await rows<{
      id: string;
      user_id: string;
      amount: string;
      phone: string;
      status: string;
    }>(sql`SELECT * FROM deposits WHERE id=${depositId} FOR UPDATE`, tx);
    requireThat(d, 404, "Deposit not found");
    if (d.status === "SUCCESSFUL") return d;
    requireThat(
      BigInt(d.amount) === verifiedAmount && d.phone === verifiedPhone,
      409,
      "Verified receipt does not match deposit",
    );
    await tx.execute(
      sql`SELECT user_id FROM wallets WHERE user_id=${d.user_id} FOR UPDATE`,
    );
    await post(tx, "deposit:" + d.id, "Verified M-Pesa deposit", [
      { account: "clearing:mpesa", amount: -verifiedAmount },
      { account: d.user_id + ":available", amount: verifiedAmount },
    ]);
    await tx.execute(
      sql`UPDATE wallets SET available=available+${verifiedAmount.toString()} WHERE user_id=${d.user_id}`,
    );
    await tx.execute(
      sql`UPDATE deposits SET status='SUCCESSFUL',receipt=${receipt} WHERE id=${d.id}`,
    );
    await audit(null, "deposit.confirmed", d.id, { receipt }, tx);
    await notify(
      tx,
      d.user_id,
      "Deposit received",
      "Your verified M-Pesa deposit is available.",
    );
    return { ...d, status: "SUCCESSFUL" };
  });
}
export async function reserveWithdrawal(
  userId: string,
  amount: bigint,
  phone: string,
  key: string,
) {
  requireThat(amount > 0n, 400, "Amount must be positive");
  const db = await database();
  return db.transaction(async (tx) => {
    const [w] = await rows<{ available: string }>(
      sql`SELECT * FROM wallets WHERE user_id=${userId} FOR UPDATE`,
      tx,
    );
    requireThat(w, 404, "Wallet not found");
    const [existing] = await rows<Withdrawal>(
      sql`SELECT * FROM withdrawal_requests WHERE idempotency_key=${key}`,
      tx,
    );
    if (existing) {
      requireThat(
        existing.user_id === userId &&
          BigInt(existing.amount) === amount &&
          existing.phone === phone,
        409,
        "Idempotency key conflict",
      );
      return existing;
    }
    requireThat(
      BigInt(w.available) >= amount,
      409,
      "Insufficient available funds",
    );
    const wid = id();
    await tx.execute(
      sql`INSERT INTO withdrawal_requests(id,user_id,amount,phone,idempotency_key) VALUES(${wid},${userId},${amount.toString()},${phone},${key})`,
    );
    await post(tx, "reserve:" + wid, "Reserve withdrawal", [
      { account: userId + ":available", amount: -amount },
      { account: userId + ":reserved", amount },
    ]);
    await tx.execute(
      sql`UPDATE wallets SET available=available-${amount.toString()},reserved=reserved+${amount.toString()} WHERE user_id=${userId}`,
    );
    await audit(userId, "withdrawal.requested", wid, {}, tx);
    await notify(
      tx,
      userId,
      "Withdrawal submitted",
      "Funds reserved. Explicit Super Admin approval is required.",
    );
    const [result] = await rows<Withdrawal>(
      sql`SELECT * FROM withdrawal_requests WHERE id=${wid}`,
      tx,
    );
    return result;
  });
}
export async function reviewWithdrawal(
  admin: User,
  wid: string,
  decision: "APPROVE" | "REJECT",
  reason: string,
) {
  authorize(admin, ["SUPER_ADMIN"]);
  requireThat(
    decision === "APPROVE" || reason.trim().length >= 5,
    400,
    "A rejection reason is required",
  );
  const db = await database();
  return db.transaction(async (tx) => {
    const [w] = await rows<Withdrawal>(
      sql`SELECT * FROM withdrawal_requests WHERE id=${wid} FOR UPDATE`,
      tx,
    );
    requireThat(w, 404, "Withdrawal not found");
    requireThat(
      w.user_id !== admin.id,
      403,
      "You cannot review your own withdrawal",
    );
    requireThat(
      w.status === "PENDING_ADMIN_APPROVAL",
      409,
      "Withdrawal is no longer pending",
    );
    const status =
      decision === "APPROVE" ? "APPROVED_PENDING_PAYOUT" : "REJECTED";
    await tx.execute(
      sql`INSERT INTO withdrawal_reviews(id,withdrawal_id,admin_id,decision,reason) VALUES(${id()},${wid},${admin.id},${decision},${reason})`,
    );
    await tx.execute(
      sql`UPDATE withdrawal_requests SET status=${status},approved_by=${decision === "APPROVE" ? admin.id : null},updated_at=now() WHERE id=${wid}`,
    );
    if (decision === "REJECT") {
      await tx.execute(
        sql`SELECT user_id FROM wallets WHERE user_id=${w.user_id} FOR UPDATE`,
      );
      await post(
        tx,
        "release:" + wid,
        "Rejected withdrawal reservation release",
        [
          { account: w.user_id + ":reserved", amount: -BigInt(w.amount) },
          { account: w.user_id + ":available", amount: BigInt(w.amount) },
        ],
      );
      await tx.execute(
        sql`UPDATE wallets SET available=available+${w.amount},reserved=reserved-${w.amount} WHERE user_id=${w.user_id}`,
      );
    }
    await audit(
      admin.id,
      "withdrawal." + decision.toLowerCase(),
      wid,
      { reason },
      tx,
    );
    await notify(
      tx,
      w.user_id,
      "Withdrawal " + (decision === "APPROVE" ? "approved" : "rejected"),
      decision === "APPROVE"
        ? "Awaiting an authorized payout. Approval is not payment."
        : reason,
    );
    return { ...w, status };
  });
}
// Only trusted payout reconciliation may call this, with the exact previously dispatched provider reference.
export async function confirmPayout(wid: string, reference: string) {
  const db = await database();
  return db.transaction(async (tx) => {
    const [w] = await rows<Withdrawal>(
      sql`SELECT * FROM withdrawal_requests WHERE id=${wid} FOR UPDATE`,
      tx,
    );
    requireThat(w, 404, "Not found");
    requireThat(
      w.approved_by && w.provider_ref === reference,
      409,
      "No matching approved payout",
    );
    if (w.status === "PAID") return;
    requireThat(
      ["PROCESSING", "PAYOUT_UNDER_REVIEW"].includes(w.status),
      409,
      "Payout has not been dispatched",
    );
    const reviews = await rows(
      sql`SELECT id FROM withdrawal_reviews WHERE withdrawal_id=${wid} AND admin_id=${w.approved_by} AND decision='APPROVE'`,
      tx,
    );
    requireThat(reviews.length === 1, 409, "Missing explicit approval");
    await tx.execute(
      sql`SELECT user_id FROM wallets WHERE user_id=${w.user_id} FOR UPDATE`,
    );
    await post(tx, "paid:" + wid, "Confirmed payout", [
      { account: w.user_id + ":reserved", amount: -BigInt(w.amount) },
      { account: "clearing:mpesa", amount: BigInt(w.amount) },
    ]);
    await tx.execute(
      sql`UPDATE wallets SET reserved=reserved-${w.amount} WHERE user_id=${w.user_id}`,
    );
    await tx.execute(
      sql`UPDATE withdrawal_requests SET status='PAID',updated_at=now() WHERE id=${wid}`,
    );
    await audit(null, "withdrawal.paid", wid, { reference }, tx);
    await notify(
      tx,
      w.user_id,
      "Withdrawal paid",
      "Your payment provider has confirmed the payout.",
    );
  });
}
export async function reconciliation() {
  return rows(
    sql`SELECT a.id,a.kind,COALESCE(SUM(e.amount),0)::text AS ledger_balance,CASE WHEN a.kind='AVAILABLE' THEN w.available WHEN a.kind='RESERVED' THEN w.reserved ELSE NULL END::text AS projected_balance FROM ledger_accounts a LEFT JOIN ledger_entries e ON e.account_id=a.id LEFT JOIN wallets w ON w.user_id=a.user_id GROUP BY a.id,a.kind,w.available,w.reserved ORDER BY a.id`,
  );
}
