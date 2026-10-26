import { database, rows, sql } from "@/db";
import { audit } from "../auth";
import { requireThat } from "../errors";
// No browser route can invoke the adapter. This adapter is deliberately unavailable pending approved B2C onboarding.
const payoutAdapter = {
  configured: false,
  async send(_input: {
    id: string;
    amount: string;
    phone: string;
  }): Promise<{ reference: string }> {
    throw new Error("Approved payout integration not configured");
  },
};
export async function dispatchApprovedPayout(wid: string) {
  requireThat(
    payoutAdapter.configured &&
      process.env.ENABLE_REAL_MONEY === "true" &&
      process.env.REGULATORY_APPROVAL_CONFIRMED === "true",
    503,
    "Payouts unavailable; approval remains pending payout",
  );
  const db = await database();
  const claimed = await db.transaction(async (tx) => {
    const [w] = await rows<{
      id: string;
      approved_by: string;
      amount: string;
      phone: string;
      status: string;
    }>(sql`SELECT * FROM withdrawal_requests WHERE id=${wid} FOR UPDATE`, tx);
    requireThat(
      w?.status === "APPROVED_PENDING_PAYOUT" && w.approved_by,
      409,
      "Explicit approval is required",
    );
    const reviews = await rows(
      sql`SELECT r.id FROM withdrawal_reviews r JOIN users u ON u.id=r.admin_id WHERE r.withdrawal_id=${wid} AND r.decision='APPROVE' AND r.admin_id=${w.approved_by} AND u.role='SUPER_ADMIN' AND u.status='active'`,
      tx,
    );
    requireThat(reviews.length === 1, 409, "No authorized approval");
    await tx.execute(
      sql`UPDATE withdrawal_requests SET status='PROCESSING',updated_at=now() WHERE id=${wid}`,
    );
    await audit(null, "payout.dispatch_started", wid, {}, tx);
    return w;
  });
  try {
    const result = await payoutAdapter.send(claimed);
    await rows(
      sql`UPDATE withdrawal_requests SET provider_ref=${result.reference} WHERE id=${wid}`,
    );
    await audit(null, "payout.dispatched", wid, {
      reference: result.reference,
    });
  } catch {
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`UPDATE withdrawal_requests SET status='PAYOUT_UNDER_REVIEW',updated_at=now() WHERE id=${wid}`,
      );
      await audit(null, "payout.uncertain", wid, {}, tx);
    });
  }
}
