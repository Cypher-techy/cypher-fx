import Decimal from "decimal.js";
import { database, rows, sql, id } from "@/db";
import { quote } from "../providers/market";
import { requireThat } from "../errors";
import { audit } from "../auth";
type Position = {
  id: string;
  order_id: string;
  symbol: string;
  side: string;
  lots: string;
  entry_price: string;
  stop_loss: string | null;
  take_profit: string | null;
  status: string;
};
export function pnl(
  p: Pick<Position, "symbol" | "side" | "lots" | "entry_price">,
  exit: string,
) {
  const d = new Decimal(exit)
    .minus(p.entry_price)
    .mul(p.side === "BUY" ? 1 : -1)
    .mul(p.lots)
    .mul(100000);
  return (p.symbol.startsWith("USD_") ? d.div(exit) : d).toDecimalPlaces(2);
}
export function margin(p: Pick<Position, "symbol" | "lots" | "entry_price">) {
  return new Decimal(p.lots)
    .mul(100000)
    .mul(p.symbol.startsWith("USD_") ? 1 : p.entry_price)
    .div(100);
}
export async function submitDemo(
  uid: string,
  input: {
    symbol: string;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT" | "STOP";
    lots: string;
    price?: string;
    stopLoss?: string;
    takeProfit?: string;
    key: string;
  },
) {
  const q = await quote(input.symbol);
  requireThat(
    q.synthetic || Date.now() - new Date(q.time).getTime() < 30000,
    503,
    "Market data is stale",
  );
  const execution = input.side === "BUY" ? q.ask : q.bid,
    entry = input.type === "MARKET" ? execution : input.price;
  requireThat(
    entry && new Decimal(entry).gt(0),
    400,
    "Entry price is required",
  );
  const e = new Decimal(entry);
  if (input.type === "LIMIT")
    requireThat(
      input.side === "BUY" ? e.lt(q.ask) : e.gt(q.bid),
      400,
      "Limit price must be better than current price",
    );
  if (input.type === "STOP")
    requireThat(
      input.side === "BUY" ? e.gt(q.ask) : e.lt(q.bid),
      400,
      "Stop entry must be beyond current price",
    );
  if (input.stopLoss)
    requireThat(
      input.side === "BUY"
        ? new Decimal(input.stopLoss).lt(e)
        : new Decimal(input.stopLoss).gt(e),
      400,
      "Stop loss is on the wrong side of entry",
    );
  if (input.takeProfit)
    requireThat(
      input.side === "BUY"
        ? new Decimal(input.takeProfit).gt(e)
        : new Decimal(input.takeProfit).lt(e),
      400,
      "Take profit is on the wrong side of entry",
    );
  const db = await database();
  return db.transaction(async (tx) => {
    const [account] = await rows<{ balance: string }>(
      sql`SELECT * FROM demo_accounts WHERE user_id=${uid} FOR UPDATE`,
      tx,
    );
    const [existing] = await rows<{ id: string; user_id: string }>(
      sql`SELECT * FROM orders WHERE idempotency_key=${input.key}`,
      tx,
    );
    if (existing) {
      requireThat(existing.user_id === uid, 409, "Idempotency conflict");
      return existing;
    }
    const open = await rows<Position>(
      sql`SELECT * FROM positions WHERE user_id=${uid} AND mode='DEMO' AND status='OPEN'`,
      tx,
    );
    const pending = await rows<{
      lots: string;
      symbol: string;
      entry_price: string;
    }>(
      sql`SELECT lots,symbol,entry_price FROM orders WHERE user_id=${uid} AND mode='DEMO' AND status='PENDING'`,
      tx,
    );
    let equity = new Decimal(account.balance),
      used = new Decimal(0);
    for (const p of open) {
      const v = await quote(p.symbol);
      equity = equity.plus(pnl(p, p.side === "BUY" ? v.bid : v.ask));
      used = used.plus(margin(p));
    }
    for (const p of pending) used = used.plus(margin(p));
    requireThat(
      equity
        .minus(used)
        .gte(
          margin({
            symbol: input.symbol,
            lots: input.lots,
            entry_price: entry,
          }),
        ),
      409,
      "Insufficient practice free margin",
    );
    const oid = id(),
      status = input.type === "MARKET" ? "FILLED" : "PENDING";
    await tx.execute(
      sql`INSERT INTO orders(id,user_id,mode,symbol,side,type,lots,entry_price,stop_loss,take_profit,status,idempotency_key,source) VALUES(${oid},${uid},'DEMO',${input.symbol},${input.side},${input.type},${input.lots},${entry},${input.stopLoss ?? null},${input.takeProfit ?? null},${status},${input.key},${q.source})`,
    );
    if (status === "FILLED") {
      await tx.execute(
        sql`INSERT INTO executions(id,order_id,price,source) VALUES(${id()},${oid},${entry},${q.source})`,
      );
      await tx.execute(
        sql`INSERT INTO positions(id,order_id,user_id,mode,symbol,side,lots,entry_price,stop_loss,take_profit,source) VALUES(${id()},${oid},${uid},'DEMO',${input.symbol},${input.side},${input.lots},${entry},${input.stopLoss ?? null},${input.takeProfit ?? null},${q.source})`,
      );
    }
    await audit(uid, "demo.order." + status.toLowerCase(), oid, {}, tx);
    return { id: oid, status };
  });
}
export async function closeDemo(uid: string, pid: string) {
  const db = await database();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT user_id FROM demo_accounts WHERE user_id=${uid} FOR UPDATE`,
    );
    const [p] = await rows<Position>(
      sql`SELECT * FROM positions WHERE id=${pid} AND user_id=${uid} AND mode='DEMO' FOR UPDATE`,
      tx,
    );
    requireThat(p && p.status === "OPEN", 409, "Practice position is not open");
    const q = await quote(p.symbol);
    requireThat(
      q.synthetic || Date.now() - new Date(q.time).getTime() < 30000,
      503,
      "Stale price",
    );
    const exit = p.side === "BUY" ? q.bid : q.ask,
      profit = pnl(p, exit).toFixed(2);
    await tx.execute(
      sql`UPDATE positions SET status='CLOSED',closed_price=${exit},pnl=${profit},closed_at=now() WHERE id=${pid}`,
    );
    await tx.execute(
      sql`UPDATE demo_accounts SET balance=balance+${profit} WHERE user_id=${uid}`,
    );
    await tx.execute(
      sql`INSERT INTO trade_history(id,position_id,user_id,pnl) VALUES(${id()},${pid},${uid},${profit})`,
    );
    await audit(uid, "demo.position.closed", pid, { pnl: profit }, tx);
    return { profit };
  });
}
export async function syncDemo(uid: string) {
  // Practice engine uses bid/ask touch; fills at current executable quote, not a promised limit improvement.
  const pending = await rows<{
    id: string;
    symbol: string;
    side: string;
    type: string;
    entry_price: string;
  }>(
    sql`SELECT * FROM orders WHERE user_id=${uid} AND mode='DEMO' AND status='PENDING'`,
  );
  for (const o of pending) {
    const q = await quote(o.symbol);
    if (!q.synthetic && Date.now() - new Date(q.time).getTime() > 30000)
      continue;
    const price = o.side === "BUY" ? q.ask : q.bid,
      e = new Decimal(o.entry_price),
      p = new Decimal(price);
    const touched =
      o.type === "LIMIT"
        ? o.side === "BUY"
          ? p.lte(e)
          : p.gte(e)
        : o.side === "BUY"
          ? p.gte(e)
          : p.lte(e);
    if (!touched) continue;
    const db = await database();
    await db.transaction(async (tx) => {
      await tx.execute(
        sql`SELECT user_id FROM demo_accounts WHERE user_id=${uid} FOR UPDATE`,
      );
      const got = await rows(
        sql`UPDATE orders SET status='FILLED',entry_price=${price} WHERE id=${o.id} AND status='PENDING' RETURNING *`,
        tx,
      );
      if (!got.length) return;
      await tx.execute(
        sql`INSERT INTO positions(id,order_id,user_id,mode,symbol,side,lots,entry_price,stop_loss,take_profit,source) SELECT ${id()},id,user_id,mode,symbol,side,lots,entry_price,stop_loss,take_profit,source FROM orders WHERE id=${o.id}`,
      );
      await tx.execute(
        sql`INSERT INTO executions(id,order_id,price,source) VALUES(${id()},${o.id},${price},${q.source})`,
      );
      await audit(uid, "demo.pending.filled", o.id, {}, tx);
    });
  }
  const open = await rows<Position>(
    sql`SELECT * FROM positions WHERE user_id=${uid} AND mode='DEMO' AND status='OPEN'`,
  );
  for (const p of open) {
    const q = await quote(p.symbol);
    if (!q.synthetic && Date.now() - new Date(q.time).getTime() > 30000)
      continue;
    const v = new Decimal(p.side === "BUY" ? q.bid : q.ask);
    if (
      (p.stop_loss &&
        (p.side === "BUY" ? v.lte(p.stop_loss) : v.gte(p.stop_loss))) ||
      (p.take_profit &&
        (p.side === "BUY" ? v.gte(p.take_profit) : v.lte(p.take_profit)))
    )
      await closeDemo(uid, p.id);
  }
}
