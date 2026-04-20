/**
 * Run once locally to install the _run_sql helper function in Supabase.
 * This lets server-side code execute parameterized SQL via HTTPS RPC,
 * completely bypassing the IPv6-only direct TCP connection.
 *
 *   node scripts/install-rpc.js
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Supabase.");

  // Accepts a parameterized SQL query + JSON array of params,
  // runs it with SECURITY DEFINER (postgres owner privileges),
  // returns {rows, affectedRows, insertId} JSON.
  await client.query(`
    CREATE OR REPLACE FUNCTION _run_sql(q text, params jsonb DEFAULT '[]'::jsonb)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      v_rows      jsonb;
      v_rowcount  int := 0;
      p1  text := params->>0;
      p2  text := params->>1;
      p3  text := params->>2;
      p4  text := params->>3;
      p5  text := params->>4;
      p6  text := params->>5;
      p7  text := params->>6;
      p8  text := params->>7;
      p9  text := params->>8;
      p10 text := params->>9;
    BEGIN
      IF q ~* '^\s*(INSERT|UPDATE|DELETE)' THEN
        IF q ~* 'RETURNING' THEN
          EXECUTE 'SELECT COALESCE(jsonb_agg(r),''[]''::jsonb) FROM (' || q || ') r'
            USING p1,p2,p3,p4,p5,p6,p7,p8,p9,p10
            INTO v_rows;
          v_rowcount := jsonb_array_length(v_rows);
        ELSE
          EXECUTE q USING p1,p2,p3,p4,p5,p6,p7,p8,p9,p10;
          GET DIAGNOSTICS v_rowcount = ROW_COUNT;
          v_rows := '[]'::jsonb;
        END IF;
      ELSE
        EXECUTE 'SELECT COALESCE(jsonb_agg(r),''[]''::jsonb) FROM (' || q || ') r'
          USING p1,p2,p3,p4,p5,p6,p7,p8,p9,p10
          INTO v_rows;
        v_rowcount := jsonb_array_length(v_rows);
      END IF;

      RETURN jsonb_build_object(
        'rows',         v_rows,
        'affectedRows', v_rowcount,
        'insertId',     COALESCE((v_rows->0->>'id')::int, 0)
      );
    END;
    $$;
  `);
  console.log("Created _run_sql function.");

  // Grant anon + authenticated roles so it's callable via REST API
  await client.query(`
    GRANT EXECUTE ON FUNCTION _run_sql(text, jsonb) TO anon, authenticated, service_role;
  `);
  console.log("Granted EXECUTE to anon / authenticated / service_role.");

  await client.end();
  console.log("Done! Deploy with VERCEL env var set and login should work.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
