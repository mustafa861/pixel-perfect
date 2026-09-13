import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

function createPool() {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL environment variable. Set it to your Neon connection string.",
    );
  }
  return new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
}

let _pool: Pool | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getPool() {
  if (!_pool) _pool = createPool();
  return _pool;
}

/** Server-only Drizzle client. */
export function getDb() {
  if (!_db) _db = drizzle(getPool(), { schema });
  return _db;
}
