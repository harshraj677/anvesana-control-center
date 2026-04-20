import { NextResponse } from "next/server";
import { Pool } from "pg";

const REGIONS = [
  "ap-south-1", "ap-southeast-1", "ap-southeast-2",
  "ap-northeast-1", "us-east-1", "eu-west-1",
];

export async function GET() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  let pass = "";
  let ref = "";

  let passLen = 0;
  let hostInUrl = "";
  try {
    const parsed = new URL(rawUrl);
    pass = decodeURIComponent(parsed.password);
    passLen = pass.length;
    hostInUrl = parsed.hostname;
    // Extract project ref from hostname: db.<ref>.supabase.co
    const hostParts = parsed.hostname.split(".");
    ref = hostParts[1] ?? "";
  } catch {
    return NextResponse.json({ error: "Cannot parse DATABASE_URL", rawUrlLen: rawUrl.length });
  }

  // 1. Check if Supabase project is reachable via REST
  let restStatus = "unknown";
  try {
    const r = await fetch(`https://${ref}.supabase.co/rest/v1/`, {
      signal: AbortSignal.timeout(5000),
    });
    restStatus = `HTTP ${r.status}`;
  } catch (e: any) {
    restStatus = `FAIL: ${e.message}`;
  }

  // 2. Try Transaction Pooler (port 6543) and Session Pooler (port 5432)
  const results: Record<string, string> = {};

  for (const region of REGIONS) {
    for (const [label, port] of [["txn:6543", 6543], ["ses:5432", 5432]] as const) {
      const host = `aws-0-${region}.pooler.supabase.com`;
      const url = `postgresql://postgres.${ref}:${pass}@${host}:${port}/postgres`;
      const pool = new Pool({
        connectionString: url,
        max: 1,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
      const key = `${region} [${label}]`;
      try {
        await pool.query("SELECT 1");
        results[key] = "CONNECTED";
        await pool.end();
        return NextResponse.json({
          restStatus,
          winner: { region, port, label },
          poolerUrl: `postgresql://postgres.${ref}:***@${host}:${port}/postgres`,
          results,
        });
      } catch (e: any) {
        results[key] = e.message.slice(0, 80);
        await pool.end().catch(() => {});
      }
    }
  }

  return NextResponse.json({ restStatus, ref: ref || "NOT FOUND", passLen, hostInUrl, results });
}
