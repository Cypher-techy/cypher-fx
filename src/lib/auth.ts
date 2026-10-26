import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { rows, sql, database, id } from "@/db";
import { AppError, requireThat } from "./errors";
import { decryptSecret } from "./secrets";
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  email_verified: boolean;
  kyc_status: string;
  mfa_secret?: string;
  password_hash: string;
};
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export async function audit(
  actor: string | null,
  action: string,
  reference: string,
  meta: unknown = {},
  db?: Parameters<typeof rows>[1],
) {
  await rows(
    sql`INSERT INTO audit_logs(id,actor_id,action,reference,metadata) VALUES(${id()},${actor},${action},${reference},${JSON.stringify(meta)}::jsonb)`,
    db,
  );
}
export async function provision(
  name: string,
  email: string,
  password: string,
  options: {
    id?: string;
    role?: string;
    status?: string;
    verified?: boolean;
  } = {},
) {
  const uid = options.id ?? id(),
    hashed = await bcrypt.hash(password, 12);
  const db = await database();
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`INSERT INTO users(id,name,email,password_hash,role,status,email_verified) VALUES(${uid},${name},${email},${hashed},${options.role ?? "CUSTOMER"},${options.status ?? "pending"},${options.verified ?? false})`,
    );
    await tx.execute(
      sql`INSERT INTO demo_accounts(user_id,balance,initial_balance) VALUES(${uid},${process.env.DEMO_STARTING_BALANCE ?? "10000"},${process.env.DEMO_STARTING_BALANCE ?? "10000"})`,
    );
    await tx.execute(sql`INSERT INTO wallets(user_id) VALUES(${uid})`);
    for (const kind of ["available", "reserved"])
      await tx.execute(
        sql`INSERT INTO ledger_accounts(id,user_id,kind) VALUES(${uid + ":" + kind},${uid},${kind.toUpperCase()})`,
      );
    await tx.execute(
      sql`INSERT INTO customer_profiles(user_id) VALUES(${uid})`,
    );
    await audit(uid, "account.created", uid, {}, tx);
  });
  return uid;
}
export async function openSession(uid: string) {
  const token = randomBytes(32).toString("hex");
  await rows(
    sql`INSERT INTO user_sessions(id,user_id,token_hash,expires_at) VALUES(${id()},${uid},${hash(token)},now()+interval '12 hours')`,
  );
  (await cookies()).set("cypher_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 43200,
  });
}
export async function currentUser(): Promise<User> {
  const token = (await cookies()).get("cypher_session")?.value;
  requireThat(token, 401, "Sign in to continue");
  const [u] = await rows<User>(
    sql`SELECT u.* FROM users u JOIN user_sessions s ON s.user_id=u.id WHERE s.token_hash=${hash(token)} AND s.expires_at>now()`,
  );
  requireThat(u, 401, "Session expired. Please sign in again.");
  requireThat(
    !["suspended", "closed"].includes(u.status),
    403,
    "This account is suspended or closed",
  );
  return u;
}
export function authorize(u: User, roles: string[]) {
  requireThat(
    roles.includes(u.role),
    403,
    "Your role cannot perform this operation",
  );
}
export async function realEligible(u: User) {
  requireThat(
    u.status === "active" && u.email_verified && u.kyc_status === "verified",
    403,
    "Real-money access requires an active, email-verified, KYC-approved account",
  );
  requireThat(
    process.env.ENABLE_REAL_MONEY === "true" &&
      process.env.REGULATORY_APPROVAL_CONFIRMED === "true",
    503,
    "Real-money services are disabled pending regulatory and provider approval",
  );
}
export async function stepUp(u: User, password: string, otp: string) {
  authorize(u, ["SUPER_ADMIN"]);
  requireThat(u.mfa_secret, 403, "Privileged MFA enrollment is required");
  requireThat(
    (await bcrypt.compare(password, u.password_hash)) &&
      authenticator.check(otp, decryptSecret(u.mfa_secret!)),
    403,
    "Fresh password and MFA verification failed",
  );
  await audit(u.id, "security.step_up", u.id);
}
export async function rateLimit(key: string, limit = 20) {
  const [r] = await rows<{ count: number }>(
    sql`INSERT INTO rate_limits(key,count,reset_at) VALUES(${key},1,now()+interval '10 minutes') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.count+1 END, reset_at=CASE WHEN rate_limits.reset_at<now() THEN now()+interval '10 minutes' ELSE rate_limits.reset_at END RETURNING count`,
  );
  if (r.count > limit)
    throw new AppError(429, "Too many requests. Try again in 10 minutes.");
}
export async function issueToken(uid: string, purpose: string) {
  const token = randomBytes(32).toString("hex");
  await rows(
    sql`INSERT INTO auth_tokens(id,user_id,token_hash,purpose,expires_at) VALUES(${id()},${uid},${hash(token)},${purpose},now()+interval '1 hour')`,
  );
  return token;
}
