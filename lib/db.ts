import { Pool, QueryResult } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

const PROJECT_REF = "dwzjmkphaluemoplsqyw";

// On Vercel the direct host (db.<ref>.supabase.co) is IPv6-only.
// Build a Session Pooler URL (IPv4-compatible) from DATABASE_URL's password.
function buildPoolerUrl(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    const password = encodeURIComponent(decodeURIComponent(parsed.password));
    return `postgresql://postgres.${PROJECT_REF}:${password}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`;
  } catch {
    return databaseUrl;
  }
}

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  const connectionString = process.env.VERCEL
    ? buildPoolerUrl(databaseUrl)
    : databaseUrl;

  return new Pool({
    connectionString,
    max: process.env.VERCEL ? 3 : 10,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
}

export const pgPool: Pool = globalThis._pgPool ?? (globalThis._pgPool = createPool());

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

// Synthetic result header for DML (INSERT/UPDATE/DELETE) statements
export interface DMLResult {
  affectedRows: number;
  insertId: number;
}

const DML_PATTERN = /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE)/i;

async function runQuery<T = any>(query: string, params: any[] = []): Promise<[T, any]> {
  let index = 1;
  let pgQuery = query.replace(/\?/g, () => `$${index++}`);
  pgQuery = normalizeQuery(pgQuery);
  const result: QueryResult = await pgPool.query(pgQuery, params);

  if (DML_PATTERN.test(pgQuery)) {
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
