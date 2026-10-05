import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Database initialization is intentionally lazy at connection time.
 *
 * Next.js imports route modules during `next build`. A missing DATABASE_URL
 * must not make module evaluation fail before Vercel can build the app.
 * Runtime database operations still require a real DATABASE_URL and will
 * fail normally until one is configured.
 */
export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/salesteam_unconfigured";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: isDatabaseConfigured ? 10_000 : 750,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
