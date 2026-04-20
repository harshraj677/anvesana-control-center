import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

  const env = {
    hasUrl: !!url,
    urlPrefix: url.slice(0, 30),
    hasKey: !!key,
    keyPrefix: key.slice(0, 20),
    isVercel: !!process.env.VERCEL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  };

  if (!url || !key) {
    return NextResponse.json({ error: "Missing env vars", env });
  }

  // 1. REST health check
  let restStatus = "unknown";
  try {
    const r = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    restStatus = `HTTP ${r.status}`;
  } catch (e: any) {
    restStatus = `FAIL: ${e.message}`;
  }

  // 2. Test _run_sql RPC
  let rpcResult: any = "not tested";
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase.rpc("_run_sql", {
      q: 'SELECT id, email FROM "Employee" LIMIT 3',
      params: [],
    });
    if (error) {
      rpcResult = { error: error.message, code: error.code };
    } else {
      rpcResult = { success: true, rows: data?.rows ?? data };
    }
  } catch (e: any) {
    rpcResult = { thrown: e.message };
  }

  return NextResponse.json({ env, restStatus, rpcResult });
}
