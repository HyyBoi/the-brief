// npm run db:setup → runs every SQL file in supabase/migrations against DATABASE_URL
import "./env";
import { readFileSync, readdirSync } from "node:fs";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing in .env.local (Supabase → Connect → Session pooler)");
  const sql = postgres(url, { ssl: "require", max: 1 });
  for (const f of readdirSync("supabase/migrations").sort()) {
    console.log("→", f);
    await sql.unsafe(readFileSync(`supabase/migrations/${f}`, "utf8"));
  }
  await sql.end();
  console.log("✓ database ready");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
