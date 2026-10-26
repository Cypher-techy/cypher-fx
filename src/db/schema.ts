import {
  pgTable,
  text,
  timestamp,
  boolean,
  bigint,
  numeric,
} from "drizzle-orm/pg-core";
// Typed mappings for core aggregates. The canonical migration includes deferred integrity triggers and operational tables.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("CUSTOMER"),
  status: text("status").notNull().default("pending"),
  emailVerified: boolean("email_verified").default(false),
  kycStatus: text("kyc_status").default("unverified"),
  mfaSecret: text("mfa_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
export const wallets = pgTable("wallets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  currency: text("currency").default("KES"),
  available: bigint("available", { mode: "bigint" }).notNull().default(0n),
  reserved: bigint("reserved", { mode: "bigint" }).notNull().default(0n),
});
export const demoAccounts = pgTable("demo_accounts", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  balance: numeric("balance", { precision: 20, scale: 2 }).default("10000"),
  initialBalance: numeric("initial_balance", {
    precision: 20,
    scale: 2,
  }).default("10000"),
});
