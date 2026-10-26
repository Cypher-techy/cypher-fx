import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as embeddedDrizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { sql, SQL } from "drizzle-orm";
import fs from "node:fs/promises";
import path from "node:path";
export type DB = ReturnType<typeof drizzle>;
const globalDb = globalThis as unknown as {
  cypherDb?: DB;
  cypherInit?: Promise<DB>;
};
export async function database(): Promise<DB> {
  if (globalDb.cypherInit) return globalDb.cypherInit;
  globalDb.cypherInit = (async () => {
    if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL)
      throw new Error("DATABASE_URL is required in production");
    await fs.mkdir(path.join(process.cwd(), ".data"), { recursive: true });
    const pool = process.env.DATABASE_URL
      ? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 })
      : null;
    const embedded = pool
      ? null
      : new PGlite(
          process.env.TEST_DB === "true"
            ? "memory://"
            : path.join(process.cwd(), ".data/postgres"),
        );
    const db = pool
      ? drizzle(pool)
      : (embeddedDrizzle(embedded!) as unknown as DB);
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz DEFAULT now())`,
    );
    for (const file of (
      await fs.readdir(path.join(process.cwd(), "migrations"))
    )
      .filter((f) => /^\d+.*\.sql$/.test(f))
      .sort()) {
      const name = file.replace(".sql", "");
      const applied = await db.execute(
        sql`SELECT name FROM schema_migrations WHERE name=${name}`,
      );
      if (!applied.rows.length) {
        if (
          process.env.NODE_ENV === "production" &&
          process.env.RUN_MIGRATIONS !== "true"
        )
          throw new Error(
            "Run database migrations with the deployment migration role before starting the application",
          );
        const migration = await fs.readFile(
          path.join(process.cwd(), "migrations", file),
          "utf8",
        );
        const script =
          "BEGIN;\n" +
          migration +
          "\nINSERT INTO schema_migrations(name) VALUES('" +
          name +
          "'); COMMIT;";
        if (embedded) await embedded.exec(script);
        else {
          const client = await pool!.connect();
          try {
            await client.query(script);
          } finally {
            client.release();
          }
        }
      }
    }
    globalDb.cypherDb = db;
    return db;
  })().catch((e) => {
    globalDb.cypherInit = undefined;
    throw e;
  });
  return globalDb.cypherInit;
}
export async function rows<T = Record<string, unknown>>(
  query: SQL,
  db?: Pick<DB, "execute">,
): Promise<T[]> {
  const r = await (db ?? (await database())).execute(query);
  return r.rows as T[];
}
export { sql };
export const id = () => crypto.randomUUID();
