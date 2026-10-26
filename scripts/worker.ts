import { rows, sql } from "../src/db";
import { dispatchApprovedPayout } from "../src/lib/providers/payout";
// A scheduler invokes this worker. An unconfigured adapter never dispatches a payout.
const pending = await rows<{ id: string }>(
  sql`SELECT id FROM withdrawal_requests WHERE status='APPROVED_PENDING_PAYOUT' ORDER BY created_at LIMIT 20`,
);
for (const w of pending) {
  try {
    await dispatchApprovedPayout(w.id);
  } catch (e) {
    console.error(w.id, (e as Error).message);
  }
}
console.log(`Reviewed ${pending.length} approved payout candidates.`);
process.exit(0);
