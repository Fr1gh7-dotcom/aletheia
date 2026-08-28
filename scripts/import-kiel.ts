// Importa il dataset Kiel "Ukraine Support Tracker" in aid_flows.
//
// Uso:
//   1. scaricare lo .xlsx da https://www.kielinstitut.de/publications/ukraine-support-tracker-data-6453
//   2. salvarlo in data/raw/kiel-ukraine-support-tracker.xlsx
//   3. npm run import:kiel
//
// Lo script è difensivo: se il foglio cambia struttura, aggiornare le costanti
// HEADER_MATCH qui sotto. Stampa sempre le colonne riconosciute e una
// riconciliazione (somma calcolata vs colonna "Total" del foglio).
//
// Modello: ogni paese -> fino a 3 righe aid_flows (military / financial / humanitarian),
// status 'committed', reliability_tier 'aggregate_estimate' (è un totale di ricerca).
// Le righe aggregate ("EU", "Total", continenti) vengono saltate: la quota UE è
// gestita separatamente dalle dotazioni legislative (data/aid-flows.seed.json).
import "./lib/load-env";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "../lib/supabase/admin";
import type { FinanceType, Sector } from "../lib/types";

const FILE = resolve(process.cwd(), "data/raw/kiel-ukraine-support-tracker.xlsx");
const SHEET_CANDIDATES = ["Country Summary", "Country summary", "Summary", "Fig 6"];
const AS_OF = process.env.KIEL_AS_OF || "2026-06-30";
const PERIOD_START = "2022-01-24";

// Frammenti di header da riconoscere (case-insensitive, primo match vince).
const HEADER_MATCH = {
  country: [/^country$/i, /country/i],
  military: [/military.*(allocation|commitment)/i, /military/i],
  financial: [/financial.*(allocation|commitment)/i, /financial/i],
  humanitarian: [/humanitarian.*(allocation|commitment)/i, /humanitarian/i],
  total: [/total.*bilateral/i, /^total$/i, /total.*(allocation|commitment)/i],
};

const SKIP_COUNTRY =
  /^(eu|european union|eu institutions|eu \(|total|sum|average|europe|world|g7|other|—|-)?$|institutions|\btotal\b/i;

const SECTOR_FINANCE: Record<string, { sector: Sector; finance: FinanceType }> = {
  military: { sector: "military", finance: "in_kind" },
  financial: { sector: "financial", finance: "grant" }, // ripartizione grant/loan non nel summary
  humanitarian: { sector: "humanitarian", finance: "grant" },
};

function fail(msg: string): never {
  console.error("\n✗ " + msg);
  process.exit(1);
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = rows[i].map((c) => String(c ?? "").toLowerCase());
    if (cells.some((c) => c.includes("country"))) return i;
  }
  return -1;
}

function matchCol(header: string[], patterns: RegExp[]): number {
  for (const p of patterns) {
    const idx = header.findIndex((h) => p.test(h));
    if (idx >= 0) return idx;
  }
  return -1;
}

function toEur(raw: unknown, unitFactor: number): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^\d.,-]/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n === 0) return null;
  return Math.round(n * unitFactor * 100) / 100;
}

async function main() {
  if (!existsSync(FILE)) {
    fail(
      `File non trovato: ${FILE}\n` +
        "  Scarica lo .xlsx da https://www.kielinstitut.de/publications/ukraine-support-tracker-data-6453\n" +
        "  e salvalo come data/raw/kiel-ukraine-support-tracker.xlsx (vedi data/raw/README.md).",
    );
  }
  console.log(`File   : ${FILE}`);
  console.log(`Modificato: ${statSync(FILE).mtime.toISOString().slice(0, 10)}`);

  const wb = XLSX.readFile(FILE);
  const sheetName =
    SHEET_CANDIDATES.find((s) => wb.SheetNames.includes(s)) ??
    wb.SheetNames.find((s) => /summary/i.test(s));
  if (!sheetName) {
    fail(`Nessun foglio 'Country Summary'. Fogli disponibili: ${wb.SheetNames.join(", ")}`);
  }
  console.log(`Foglio : ${sheetName}`);

  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName as string], {
    header: 1,
    raw: true,
    blankrows: false,
  });

  const hIdx = findHeaderRow(rows);
  if (hIdx < 0) fail("Riga di intestazione non individuata (nessuna cella 'Country').");
  const header = rows[hIdx].map((c) => String(c ?? "").trim());
  console.log(`Header (riga ${hIdx + 1}): ${header.filter(Boolean).join(" | ")}`);

  const col = {
    country: matchCol(header, HEADER_MATCH.country),
    military: matchCol(header, HEADER_MATCH.military),
    financial: matchCol(header, HEADER_MATCH.financial),
    humanitarian: matchCol(header, HEADER_MATCH.humanitarian),
    total: matchCol(header, HEADER_MATCH.total),
  };
  console.log("Colonne:", col);
  if (col.country < 0 || (col.military < 0 && col.financial < 0 && col.humanitarian < 0)) {
    fail("Colonne chiave non riconosciute — aggiornare HEADER_MATCH in scripts/import-kiel.ts");
  }

  // Unità: il foglio Kiel è in miliardi di euro salvo override.
  const unitFactor = Number(process.env.KIEL_UNIT_FACTOR || 1e9);
  console.log(`Fattore unità: ×${unitFactor.toExponential()} (override: KIEL_UNIT_FACTOR)`);

  const sb = getSupabaseAdmin();
  const { data: srcRows, error: srcErr } = await sb
    .from("sources")
    .select("id, slug")
    .eq("slug", "kiel");
  if (srcErr) throw srcErr;
  if (!srcRows?.length) fail("Fonte 'kiel' assente in sources — esegui prima: npm run seed");
  const kielSourceId = srcRows[0].id;

  type Parsed = {
    country: string;
    slug: string;
    parts: { key: string; amount: number }[];
    total: number | null;
  };
  const parsed: Parsed[] = [];

  for (let i = hIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const country = String(row[col.country] ?? "").trim();
    if (!country || SKIP_COUNTRY.test(country.trim())) continue;

    const parts: { key: string; amount: number }[] = [];
    for (const key of ["military", "financial", "humanitarian"] as const) {
      if (col[key] < 0) continue;
      const amount = toEur(row[col[key]], unitFactor);
      if (amount) parts.push({ key, amount });
    }
    if (!parts.length) continue;

    parsed.push({
      country,
      slug: country.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      parts,
      total: col.total >= 0 ? toEur(row[col.total], unitFactor) : null,
    });
  }

  if (!parsed.length) fail("Nessuna riga-paese valida estratta.");
  console.log(`\nPaesi estratti: ${parsed.length}`);
  console.log("Prime 5 righe:");
  for (const p of parsed.slice(0, 5)) {
    console.log(
      `  ${p.country.padEnd(18)} ` +
        p.parts.map((x) => `${x.key}=${(x.amount / 1e9).toFixed(2)}mld`).join("  "),
    );
  }

  // --- upsert donors ---
  const donors = parsed.map((p) => ({
    slug: `kiel-${p.slug}`,
    name: p.country,
    iso_code: null as string | null,
    type: "country" as const,
  }));
  {
    const { error } = await sb.from("donors").upsert(donors, { onConflict: "slug" });
    if (error) throw error;
  }
  const { data: donorRows, error: dErr } = await sb.from("donors").select("id, slug");
  if (dErr) throw dErr;
  const donorId: Record<string, string> = Object.fromEntries(
    (donorRows ?? []).map((r) => [r.slug, r.id]),
  );

  // --- upsert aid_flows ---
  const flows = parsed.flatMap((p) =>
    p.parts.map(({ key, amount }) => {
      const { sector, finance } = SECTOR_FINANCE[key];
      return {
        donor_id: donorId[`kiel-${p.slug}`],
        recipient: "Ukraine",
        instrument: "bilateral" as const,
        sector,
        finance_type: finance,
        status: "committed" as const,
        amount_eur: amount,
        currency: "EUR",
        period_start: PERIOD_START,
        period_end: AS_OF,
        reliability_tier: "aggregate_estimate" as const,
        source_id: kielSourceId,
        source_ref: `kiel-cs-${p.slug}-${key}`,
        source_url:
          "https://www.kielinstitut.de/publications/ukraine-support-tracker-data-6453",
        notes:
          key === "financial"
            ? "Kiel Country Summary: ripartizione grant/prestito non disponibile a questo livello."
            : "Kiel Country Summary — valore aggregato di ricerca (impegni).",
      };
    }),
  );

  const { error: fErr } = await sb
    .from("aid_flows")
    .upsert(flows, { onConflict: "source_id,source_ref" });
  if (fErr) throw fErr;

  // --- riconciliazione ---
  console.log(`\n✓ upsert: ${flows.length} righe aid_flows da ${parsed.length} paesi`);
  const withTotal = parsed.filter((p) => p.total != null);
  if (withTotal.length) {
    console.log("\nRiconciliazione (somma parti vs colonna Total del foglio):");
    let maxDiff = 0;
    for (const p of withTotal) {
      const sum = p.parts.reduce((a, x) => a + x.amount, 0);
      const diff = Math.abs(sum - (p.total as number));
      const pct = (p.total as number) ? (diff / (p.total as number)) * 100 : 0;
      maxDiff = Math.max(maxDiff, pct);
      if (pct > 5) {
        console.log(
          `  ⚠ ${p.country}: parti=${(sum / 1e9).toFixed(2)} total=${((p.total as number) / 1e9).toFixed(2)} (Δ ${pct.toFixed(1)}%)`,
        );
      }
    }
    console.log(`  scarto massimo: ${maxDiff.toFixed(1)}% ${maxDiff < 5 ? "✓" : "— controllare la mappatura colonne"}`);
  } else {
    console.log("Nota: nessuna colonna 'Total' nel foglio — riconciliazione saltata.");
  }

  const grand = flows.reduce((a, f) => a + f.amount_eur, 0);
  console.log(`\nTotale impegni bilaterali importati: ${(grand / 1e9).toFixed(1)} mld €`);
}

main().catch((err) => {
  console.error("\n✗ import Kiel fallito:", err.message ?? err);
  process.exit(1);
});
