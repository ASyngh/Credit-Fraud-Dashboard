import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Lazy-initialize pool and db so the server can start without DATABASE_URL
// being available at import time (useful for serverless cold starts).
let _pool: InstanceType<typeof Pool> | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

function getPool() {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export const pool: InstanceType<typeof Pool> = new Proxy({} as any, {
  get(_, prop) { return (getPool() as any)[prop]; },
});

export const db: ReturnType<typeof drizzle> = new Proxy({} as any, {
  get(_, prop) {
    if (!_db) { _db = drizzle(getPool(), { schema }); }
    return (_db as any)[prop];
  },
});

export * from "./schema";

