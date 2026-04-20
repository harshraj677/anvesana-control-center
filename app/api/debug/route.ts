import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const url = process.env.DATABASE_URL;
  if (!url) return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });

  const pool = new Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false } });
  try {
    const result = await pool.query('SELECT COUNT(*) FROM "Employee"');
    await pool.end();
    return NextResponse.json({ ok: true, count: result.rows[0].count });
  } catch (err: any) {
    await pool.end().catch(() => {});
    return NextResponse.json({ error: err.message, code: err.code }, { status: 500 });
  }
}
