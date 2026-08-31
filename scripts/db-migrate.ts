// Applica le migration SQL di supabase/migrations/ al progetto Supabase remoto,
// senza la Supabase CLI e senza password del DB.
//
// Transport: Supabase Management API — POST /v1/projects/{ref}/database/query
// (lo stesso motore del SQL Editor del dashboard). Serve un Personal Access Token.
//
// Setup una tantum:
//   1. https://supabase.com/dashboard/account/tokens -> Generate new token
//   2. in .env.local:  SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx
//
// Uso:
//   npm run db:migrate            applica le migration non ancora applicate
//   npm run db:migrate -- --dry   elenca soltanto cosa applicherebbe
//
// Il tracking è nella tabella public._migrations (RLS on, nessuna policy = privata).
import "./lib/load-env";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DRY = process.argv.includes("--dry");
const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ref = SUPA_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];

function fail(msg: string): never {
  console.error("\n✗ " + msg);
  process.exit(1);
}

if (!PAT) {
  fail(
    "Manca SUPABASE_ACCESS_TOKEN in .env.local.\n" +
      "  Genera un Personal Access Token: https://supabase.com/dashboard/account/tokens\n" +
      "  poi aggiungi in .env.local:  SUPABASE_ACCESS_TOKEN=sbp_...",
  );
}
if (!ref) fail(`NEXT_PUBLIC_SUPABASE_URL non valido: "${SUPA_URL}"`);

const API = `https://api.supabase.com/v1/projects/${ref}/database/query`;

async function q<T = unknown>(sql: string): Promise<T> {
  const r = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Management API HTTP ${r.status}: ${text.slice(0, 400)}`);
  return (text ? JSON.parse(text) : null) as T;
}

async function main() {
  const dir = resolve(process.cwd(), "supabase/migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (!files.length) fail(`Nessun file .sql in ${dir}`);

  console.log(`Progetto : ${ref}`);
  console.log(`Migration: ${files.length} file in supabase/migrations/`);

  if (!DRY) {
    await q(`
      create table if not exists public._migrations (
        name        text primary key,
        applied_at  timestamptz not null default now()
      );
      alter table public._migrations enable row level security;
    `);
  }

  let applied = new Set<string>();
  try {
    const rows = await q<{ name: string }[]>(`select name from public._migrations order by name;`);
    applied = new Set((rows ?? []).map((r) => r.name));
  } catch {
    // tabella non ancora creata (dry-run sul primo giro): nessuna applicata
  }

  const pending = files.filter((f) => !applied.has(f));
  if (!pending.length) {
    console.log("\n✓ nulla da applicare — schema allineato");
    return;
  }

  console.log(`\nDa applicare (${pending.length}):`);
  for (const f of pending) console.log(`  - ${f}`);
  if (DRY) {
    console.log("\n(dry-run: niente eseguito)");
    return;
  }

  for (const f of pending) {
    const sql = readFileSync(resolve(dir, f), "utf8");
    process.stdout.write(`\napplico ${f} ... `);
    await q(sql);
    await q(`insert into public._migrations (name) values ('${f.replace(/'/g, "''")}');`);
    console.log("ok");
  }
  console.log(`\n✓ ${pending.length} migration applicate`);
}

main().catch((err) => {
  console.error("\n✗ db-migrate fallito:", err.message ?? err);
  process.exit(1);
});
