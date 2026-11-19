
import { Pool, type QueryResultRow } from "pg";
import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const globalForPg = globalThis as unknown as {
  pool: Pool | undefined;
};

function createPool() {
  const environment = databaseEnvironmentSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
  });

  return new Pool({
    connectionString: environment.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl:
      environment.NODE_ENV === "production"
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
        : undefined,
  });
}

export const pool =
  globalForPg.pool ??
  createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPg.pool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
) {
  return pool.query<T>(text, params);
}
