import { Pool, QueryResult } from "pg";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Globals ───────────────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _supabaseClient: SupabaseClient | undefined;
}

// ── Supabase REST client (used on Vercel — IPv4 HTTPS, no TCP) ───────────────

function getSupabaseClient(): SupabaseClient {
  if (globalThis._supabaseClient) return globalThis._supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase URL/key env vars not set.");
  globalThis._supabaseClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return globalThis._supabaseClient;
}

// ── pg Pool (used locally — direct connection, IPv6 OK) ──────────────────────

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL environment variable is not set.");
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
}

export const pgPool: Pool =
  globalThis._pgPool ?? (globalThis._pgPool = createPool());

// ── Query normalisation ──────────────────────────────────────────────────────

const QUOTED_TABLES = [
  "Employee", "Attendance", "LeaveRequest", "LoginHistory",
  "SuspiciousLog", "Department", "Role",
];

const QUOTED_COLUMNS = [
  "fullName", "passwordHash", "mustChangePassword", "leaveBalance",
  "checkIn", "checkOut", "distanceFromOffice",
  "startDate", "endDate", "approvedBy",
  "loginTime", "employeeId", "ipAddress", "createdAt",
];

function normalizeQuery(query: string): string {
  let q = query;
  for (const table of QUOTED_TABLES) {
    q = q.replace(new RegExp(`\\b${table}\\b`, "g"), `"${table}"`);
  }
  for (const col of QUOTED_COLUMNS) {
    q = q.replace(new RegExp(`(?<!")\\b${col}\\b(?!")`, "g"), `"${col}"`);
  }
  q = q.replace(/\bsuccess\s*=\s*0\b/g, "success = false");
  q = q.replace(/\bsuccess\s*=\s*1\b/g, "success = true");
  q = q.replace(/DATE_SUB\(([^,]+),\s*INTERVAL\s+(\d+)\s+(MINUTE|DAY|MONTH|YEAR)\)/gi, "$1 - INTERVAL '$2 $3'");
  q = q.replace(/\bCURDATE\(\)/gi, "CURRENT_DATE");
  q = q.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");
  q = q.replace(/DATE_FORMAT\(([^,]+),\s*'%b %d'\)/gi, "TO_CHAR($1, 'Mon DD')");
  q = q.replace(/DATE_FORMAT\(([^,]+),\s*'%b'\)/gi, "TO_CHAR($1, 'Mon')");
  q = q.replace(/MONTH\(([^)]+)\)/gi, "EXTRACT(MONTH FROM $1)::int");
  q = q.replace(/YEAR\(([^)]+)\)/gi, "EXTRACT(YEAR FROM $1)::int");
  return q;
}

// ── DML result type ──────────────────────────────────────────────────────────

export interface DMLResult {
  affectedRows: number;
  insertId: number;
}

const DML_PATTERN = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)/i;

// ── Core execute — routes to RPC on Vercel, direct pg locally ────────────────

async function runQuery<T = any>(query: string, params: any[] = []): Promise<[T, any]> {
  let index = 1;
  let pgQuery = query.replace(/\?/g, () => `$${index++}`);
  pgQuery = normalizeQuery(pgQuery);

  // On Vercel: use HTTPS RPC (_run_sql stored function) to avoid IPv6 TCP issue
  if (process.env.VERCEL) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc("_run_sql", {
      q: pgQuery,
      params: params.length > 0 ? params : [],
    });
    if (error) throw new Error(`[_run_sql] ${error.message} — query: ${pgQuery.slice(0, 120)}`);

    const isDML = DML_PATTERN.test(pgQuery);
    if (isDML) {
      const header: DMLResult = {
        affectedRows: data?.affectedRows ?? 0,
        insertId: data?.insertId ?? 0,
      };
      return [header as any, []];
    }
    return [(data?.rows ?? []) as any, []];
  }

  // Local: use direct pg Pool
  const result: QueryResult = await pgPool.query(pgQuery, params);
  const isDML = DML_PATTERN.test(pgQuery);
  if (isDML) {
    const header: DMLResult = {
      affectedRows: result.rowCount ?? 0,
      insertId: (result.rows[0]?.id as number) ?? 0,
    };
    return [header as any, result.fields];
  }
  return [result.rows as any, result.fields];
}

export const db = {
  execute: runQuery,
  query: runQuery,
};
