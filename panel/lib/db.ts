import { Pool, types, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

// node-postgres returns `numeric` as a string (to avoid float rounding on
// arbitrary-precision values) and `date`/`timestamptz` in Postgres's own
// text format. The app expects plain numbers and ISO date strings (as
// Supabase/PostgREST used to return), so normalize both centrally here
// instead of at every call site.
types.setTypeParser(types.builtins.NUMERIC, (val) => parseFloat(val));
types.setTypeParser(types.builtins.DATE, (val) => val); // already 'YYYY-MM-DD'
types.setTypeParser(types.builtins.TIMESTAMPTZ, (val) => new Date(val).toISOString());

function needsSsl(connectionString: string | undefined): boolean {
  if (!connectionString) return false;
  try {
    const { hostname } = new URL(connectionString);
    return hostname !== "localhost" && hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  return new Pool({
    connectionString,
    // Railway's Postgres uses self-signed certs and requires SSL; a plain
    // local Postgres (e.g. for development) typically doesn't support it.
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : false,
  });
}

const pool = global.__pgPool ?? createPool();
if (process.env.NODE_ENV !== "production") global.__pgPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
