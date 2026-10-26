import { requireThat } from "../errors";
const host = () =>
  process.env.DARAJA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
export function darajaConfigured() {
  return !!(
    process.env.DARAJA_CONSUMER_KEY &&
    process.env.DARAJA_CONSUMER_SECRET &&
    process.env.DARAJA_SHORTCODE &&
    process.env.DARAJA_PASSKEY &&
    process.env.DARAJA_CALLBACK_URL
  );
}
async function token() {
  requireThat(
    darajaConfigured(),
    503,
    "M-Pesa is not configured. No payment has been initiated.",
  );
  const r = await fetch(
    host() + "/oauth/v1/generate?grant_type=client_credentials",
    {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`,
          ).toString("base64"),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    },
  );
  requireThat(r.ok, 503, "M-Pesa authentication unavailable");
  const d = await r.json();
  requireThat(d.access_token, 503, "Invalid provider response");
  return d.access_token;
}
async function request(path: string, body: unknown) {
  const t = await token();
  const r = await fetch(host() + path, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + t,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  requireThat(r.ok, 503, "M-Pesa request unavailable");
  return r.json();
}
function credentials() {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return {
    BusinessShortCode: process.env.DARAJA_SHORTCODE,
    Password: Buffer.from(
      `${process.env.DARAJA_SHORTCODE}${process.env.DARAJA_PASSKEY}${timestamp}`,
    ).toString("base64"),
    Timestamp: timestamp,
  };
}
export async function stkPush(
  amountKes: string,
  phone: string,
  reference: string,
) {
  if (process.env.DARAJA_ENV === "production")
    requireThat(
      process.env.ENABLE_REAL_MONEY === "true" &&
        process.env.REGULATORY_APPROVAL_CONFIRMED === "true",
      503,
      "Production money handling disabled",
    );
  const d = await request("/mpesa/stkpush/v1/processrequest", {
    ...credentials(),
    TransactionType: "CustomerPayBillOnline",
    Amount: amountKes,
    PartyA: phone,
    PartyB: process.env.DARAJA_SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: process.env.DARAJA_CALLBACK_URL,
    AccountReference: reference.slice(0, 12),
    TransactionDesc: "CYPHERFX deposit",
  });
  requireThat(
    d.ResponseCode === "0" && d.CheckoutRequestID,
    503,
    "STK push was not accepted",
  );
  return d.CheckoutRequestID as string;
}
export async function queryStk(checkout: string) {
  return request("/mpesa/stkpushquery/v1/query", {
    ...credentials(),
    CheckoutRequestID: checkout,
  });
}
// Daraja STK callbacks are not assumed signed. A callback or STK query alone cannot authenticate a receipt amount/phone.
// Production credit requires receipt reconciliation from an approved transaction-status/report adapter.
export interface VerifiedReceipt {
  receipt: string;
  amountMinor: bigint;
  phone: string;
  checkout: string;
}
export async function verifyReceipt(
  _checkout: string,
): Promise<VerifiedReceipt> {
  throw new Error(
    "Approved transaction receipt reconciliation adapter is not configured. Callback retained for finance review; wallet is NOT credited.",
  );
}
