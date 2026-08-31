// Importa il dataset Kiel "Ukraine Support Tracker" in aid_flows.
//
// Uso:
//   1. scaricare lo .xlsx da https://www.kielinstitut.de/publications/ukraine-support-tracker-data-6453
//   2. salvarlo in data/raw/kiel-ukraine-support-tracker.xlsx
//   3. npm run import:kiel   (con Node 22+)
//
// Modello:
//   - "Country Summary (€)"  -> totali per paese × stato (committed/allocated) × settore
//     (military / financial / humanitarian). È la fonte di verità per gli importi.
//   - "Bilateral Assistance, MAIN DATA" -> per l'aiuto FINANZIARIO, la ripartizione
//     fondo perduto / prestito / garanzia (le righe measure=Allocation riconciliano
//     al 100% con "Financial allocations" del summary). La stessa proporzione si
//     applica agli impegni.
//   - militare = "in natura", umanitario = "fondo perduto" (approssimazioni ragionevoli).
//   - righe aggregate ("EU (...)", "Total", continenti) saltate: la quota UE è
//     gestita a parte dalle dotazioni legislative (data/aid-flows.seed.json).
//   - reliability_tier 'aggregate_estimate' (totale di ricerca).
//
// Lo script è difensivo: stampa le colonne riconosciute e la riconciliazione.
import "./lib/load-env";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "../lib/supabase/admin";
import type { FinanceType, FlowStatus, Sector } from "../lib/types";

const FILE = resolve(process.cwd(), "data/raw/kiel-ukraine-support-tracker.xlsx");
const KIEL_URL = "https://www.kielinstitut.de/publications/ukraine-support-tracker-data-6453";

const SHEET_CANDIDATES = [
  "Country Summary (€)",
  "Country Summary (EUR)",
  "Country Summary",
  "Country summary",
  "Summary",
];
const MAIN_SHEET_CANDIDATES = [
  "Bilateral Assistance, MAIN DATA",
  "Bilateral Assistance MAIN DATA",
  "Bilateral Assistance, Detail",
];
const AS_OF = process.env.KIEL_AS_OF || "2026-06-30";
const PERIOD_START = "2022-01-24";

const SECTORS = ["military", "financial", "humanitarian"] as const;
type SectorKey = (typeof SECTORS)[number];

const STATUS_WORD: Record<Extract<FlowStatus, "committed" | "allocated">, string> = {
  committed: "commitment",
  allocated: "allocation",
};
type StatusKey = keyof typeof STATUS_WORD;
const STATUSES = Object.keys(STATUS_WORD) as StatusKey[];

type FinBucket = "grant" | "loan" | "guarantee";
const FIN_BUCKETS: FinBucket[] = ["grant", "loan", "guarantee"];
const FIN_LABEL: Record<FinBucket, string> = {
  grant: "fondo perduto",
  loan: "prestito",
  guarantee: "garanzia",
};

const COUNTRY_PATTERNS = [/^country$/i, /country/i];

function colPatterns(sector: SectorKey, word: string): RegExp[] {
  return [new RegExp(`^${sector} ${word}s?$`, "i"), new RegExp(`^${sector}\\b.*${word}`, "i")];
}
function totalPatterns(word: string): RegExp[] {
  return [
    new RegExp(`^total bilateral ${word}s?$`, "i"),
    new RegExp(`total.*bilateral.*${word}`, "i"),
  ];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
function normKey(s: unknown): string {
  return String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

// Righe aggregate da saltare (la quota UE è gestita dalle dotazioni legislative).
// Release 30 chiama la riga UE "EU (Commission and Council)".
function isAggregateRow(country: string): boolean {
  const c = country.trim().toLowerCase();
  if (!c) return true;
  return (
    /^eu\b/.test(c) ||
    /^european union/.test(c) ||
    /\b(total|subtotal|sum|average|aggregate)\b/.test(c) ||
    /^(europe|world|g7|g20|nato|other|n\/a)$/.test(c) ||
    c === "—" ||
    c === "-"
  );
}

function financeBucket(specific: string): FinBucket {
  const s = specific.toLowerCase();
  if (s.includes("loan")) return "loan"; // "Loan", "ERA Loan"
  if (s.includes("guarantee") || s.includes("swap")) return "guarantee";
  return "grant"; // Grant, Contribution, Budgetary appropriations
}

function noteFor(sector: SectorKey, status: StatusKey, finance: FinanceType): string {
  const s = status === "committed" ? "impegni" : "stanziamenti";
  if (sector === "financial") {
    const b = finance === "loan" ? "prestito" : finance === "guarantee" ? "garanzia" : "fondo perduto";
    const how =
      status === "committed"
        ? "ripartizione ottenuta applicando la proporzione degli stanziamenti (foglio dettaglio Kiel)"
        : "ripartizione dalle righe Allocation del foglio dettaglio Kiel";
    return `Kiel: aiuto finanziario (${s}), quota ${b}. ${how}.`;
  }
  return `Kiel Country Summary — valore aggregato di ricerca (${s}).`;
}

function fail(msg: string): never {
  console.error("\n✗ " + msg);
  process.exit(1);
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = rows[i].map((c) => String(c ?? "").trim().toLowerCase());
    if (cells.includes("country")) return i;
  }
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = rows[i].map((c) => String(c ?? "").trim().toLowerCase());
    if (cells.some((c) => c.includes("country") && !c.includes("summary"))) return i;
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
  const n =
    typeof raw === "number"
      ? raw
      : Number(String(raw).replace(/[^\d.,-]/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n === 0) return null;
  return Math.round(n * unitFactor * 100) / 100;
}

type Parsed = {
  country: string;
  slug: string;
  byStatus: Record<StatusKey, { parts: { key: SectorKey; amount: number }[]; total: number | null }>;
};

/** Da "Bilateral Assistance, MAIN DATA": per paese (slug) la ripartizione
 *  grant/loan/guarantee dell'aiuto finanziario, dalle righe measure=Allocation. */
function parseFinancialSplit(wb: XLSX.WorkBook): Map<string, Record<FinBucket, number>> {
  const out = new Map<string, Record<FinBucket, number>>();
  const name =
    MAIN_SHEET_CANDIDATES.find((s) => wb.SheetNames.includes(s)) ??
    wb.SheetNames.find((s) => /bilateral assistance.*(main|detail)/i.test(s));
  if (!name) {
    console.log(
      "Nota: foglio 'Bilateral Assistance, MAIN DATA' assente — l'aiuto finanziario resta 'fondo perduto'.",
    );
    return out;
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
    header: 1,
    raw: true,
    blankrows: false,
  });
  const H = (rows[0] ?? []).map((c) => normKey(c));
  const c = {
    donor: H.indexOf("donor"),
    gen: H.indexOf("aid_type_general"),
    spec: H.indexOf("aid_type_specific"),
    measure: H.indexOf("measure"),
    eur: H.indexOf("tot_sub_activity_value_eur"),
    eurRedistr: H.indexOf("tot_sub_activity_value_eur_redistr"),
  };
  if (c.donor < 0 || c.gen < 0 || c.spec < 0 || c.measure < 0 || (c.eur < 0 && c.eurRedistr < 0)) {
    console.log("Nota: colonne del foglio dettaglio non riconosciute — aiuto finanziario 'fondo perduto'.");
    return out;
  }
  let used = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const donor = String(r[c.donor] ?? "").trim();
    if (!donor) continue;
    if (normKey(r[c.gen]).replace(/\s/g, "") !== "financial") continue;
    if (normKey(r[c.measure]) !== "allocation") continue;
    const raw =
      c.eurRedistr >= 0 && r[c.eurRedistr] != null && r[c.eurRedistr] !== ""
        ? r[c.eurRedistr]
        : r[c.eur];
    const val = Number(raw);
    if (!Number.isFinite(val) || val === 0) continue;
    const slug = slugify(donor);
    const bucket = financeBucket(String(r[c.spec] ?? ""));
    const cur = out.get(slug) ?? { grant: 0, loan: 0, guarantee: 0 };
    cur[bucket] += val;
    out.set(slug, cur);
    used++;
  }
  console.log(
    `Foglio dettaglio: "${name}" — ${used} righe financial/allocation, ${out.size} paesi con ripartizione.`,
  );
  return out;
}

async function main() {
  if (!existsSync(FILE)) {
    fail(
      `File non trovato: ${FILE}\n` +
        `  Scarica lo .xlsx da ${KIEL_URL}\n` +
        "  e salvalo come data/raw/kiel-ukraine-support-tracker.xlsx (vedi data/raw/README.md).",
    );
  }
  console.log(`File   : ${FILE}`);
  console.log(`Modificato: ${statSync(FILE).mtime.toISOString().slice(0, 10)}`);

  const wb = XLSX.readFile(FILE);
  const sheetName =
    SHEET_CANDIDATES.find((s) => wb.SheetNames.includes(s)) ??
    wb.SheetNames.find((s) => /country summary.*(€|eur)/i.test(s)) ??
    wb.SheetNames.find((s) => /summary/i.test(s) && !/\$|usd/i.test(s)) ??
    wb.SheetNames.find((s) => /summary/i.test(s));
  if (!sheetName) {
    fail(`Nessun foglio 'Country Summary'. Fogli disponibili: ${wb.SheetNames.join(", ")}`);
  }
  if (/\$|usd/i.test(sheetName)) {
    fail(
      `Foglio selezionato in dollari ("${sheetName}"): serve la versione in euro. Fogli: ${wb.SheetNames.join(", ")}`,
    );
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

  const countryCol = matchCol(header, COUNTRY_PATTERNS);
  const cell = { committed: {}, allocated: {} } as Record<StatusKey, Record<SectorKey, number>>;
  const totalCol = {} as Record<StatusKey, number>;
  for (const st of STATUSES) {
    cell[st] = {} as Record<SectorKey, number>;
    for (const s of SECTORS) cell[st][s] = matchCol(header, colPatterns(s, STATUS_WORD[st]));
    totalCol[st] = matchCol(header, totalPatterns(STATUS_WORD[st]));
  }
  console.log("Colonne country:", countryCol);
  for (const st of STATUSES) {
    console.log(
      `Colonne ${st.padEnd(9)}:`,
      Object.fromEntries(SECTORS.map((s) => [s, cell[st][s]])),
      "total:",
      totalCol[st],
    );
  }
  if (countryCol < 0) fail("Colonna 'Country' non riconosciuta.");
  if (!STATUSES.some((st) => SECTORS.some((s) => cell[st][s] >= 0))) {
    fail("Nessuna colonna settore/stato riconosciuta — aggiornare i pattern in scripts/import-kiel.ts");
  }

  const unitFactor = Number(process.env.KIEL_UNIT_FACTOR || 1e9);
  console.log(`Fattore unità: ×${unitFactor.toExponential()} (override: KIEL_UNIT_FACTOR)`);

  const financialSplit = parseFinancialSplit(wb);

  const sb = getSupabaseAdmin();
  const { data: srcRows, error: srcErr } = await sb
    .from("sources")
    .select("id, slug")
    .eq("slug", "kiel");
  if (srcErr) throw srcErr;
  if (!srcRows?.length) fail("Fonte 'kiel' assente in sources — esegui prima: npm run seed");
  const kielSourceId = srcRows[0].id;

  const parsed: Parsed[] = [];
  for (let i = hIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const country = String(row[countryCol] ?? "").trim();
    if (!country || isAggregateRow(country)) continue;

    const byStatus = {} as Parsed["byStatus"];
    let hasAny = false;
    for (const st of STATUSES) {
      const parts: { key: SectorKey; amount: number }[] = [];
      for (const s of SECTORS) {
        if (cell[st][s] < 0) continue;
        const amount = toEur(row[cell[st][s]], unitFactor);
        if (amount) parts.push({ key: s, amount });
      }
      if (parts.length) hasAny = true;
      byStatus[st] = {
        parts,
        total: totalCol[st] >= 0 ? toEur(row[totalCol[st]], unitFactor) : null,
      };
    }
    if (!hasAny) continue;
    parsed.push({ country, slug: slugify(country), byStatus });
  }
  if (!parsed.length) fail("Nessuna riga-paese valida estratta.");
  console.log(`\nPaesi estratti: ${parsed.length}`);

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

  // --- espande una parte settoriale nelle righe finance_type ---
  const noSplit = new Set<string>();
  function financeRowsFor(
    slug: string,
    sectorKey: SectorKey,
    amount: number,
  ): { finance: FinanceType; bucket: string; amount: number }[] {
    if (sectorKey === "military") return [{ finance: "in_kind", bucket: "military", amount }];
    if (sectorKey === "humanitarian") return [{ finance: "grant", bucket: "humanitarian", amount }];
    const split = financialSplit.get(slug);
    const sum = split ? split.grant + split.loan + split.guarantee : 0;
    if (!split || sum <= 0) {
      noSplit.add(slug);
      return [{ finance: "grant", bucket: "financial-grant", amount }];
    }
    return FIN_BUCKETS.map((b) => ({
      finance: b as FinanceType,
      bucket: `financial-${b}`,
      amount: Math.round(((amount * split[b]) / sum) * 100) / 100,
    })).filter((x) => x.amount > 0);
  }

  // --- costruzione righe aid_flows ---
  const flows = parsed.flatMap((p) =>
    STATUSES.flatMap((st) =>
      p.byStatus[st].parts.flatMap(({ key, amount }) =>
        financeRowsFor(p.slug, key, amount).map(({ finance, bucket, amount: amt }) => ({
          donor_id: donorId[`kiel-${p.slug}`],
          recipient: "Ukraine",
          instrument: "bilateral" as const,
          sector: key as Sector,
          finance_type: finance,
          status: st as FlowStatus,
          amount_eur: amt,
          currency: "EUR",
          period_start: PERIOD_START,
          period_end: AS_OF,
          reliability_tier: "aggregate_estimate" as const,
          source_id: kielSourceId,
          source_ref: `kiel-cs-${p.slug}-${bucket}-${st}`,
          source_url: KIEL_URL,
          notes: noteFor(key, st, finance),
        })),
      ),
    ),
  );

  // upsert PRIMA di rimuovere le righe vecchie (nessuna finestra di vuoto)
  const { error: fErr } = await sb
    .from("aid_flows")
    .upsert(flows, { onConflict: "source_id,source_ref" });
  if (fErr) throw fErr;

  // rimuove ogni riga kiel non presente in questo import (cambi di formato ref, paesi usciti)
  const keep = new Set(flows.map((f) => f.source_ref));
  const { data: existing, error: exErr } = await sb
    .from("aid_flows")
    .select("id, source_ref")
    .eq("source_id", kielSourceId);
  if (exErr) throw exErr;
  const stale = (existing ?? []).filter((r) => !keep.has(r.source_ref)).map((r) => r.id);
  if (stale.length) {
    const { error } = await sb.from("aid_flows").delete().in("id", stale);
    if (error) throw error;
    console.log(`Rimosse ${stale.length} righe kiel non più presenti.`);
  }

  console.log(`\n✓ upsert: ${flows.length} righe aid_flows da ${parsed.length} paesi`);
  if (noSplit.size) {
    console.log(
      `Nota: ${noSplit.size} paesi senza ripartizione nel foglio dettaglio → aiuto finanziario segnato "fondo perduto": ${[...noSplit].join(", ")}`,
    );
  }

  // --- riconciliazione per stato ---
  for (const st of STATUSES) {
    const withTotal = parsed.filter((p) => p.byStatus[st].total != null);
    let maxDiff = 0;
    for (const p of withTotal) {
      const sum = p.byStatus[st].parts.reduce((a, x) => a + x.amount, 0);
      const total = p.byStatus[st].total as number;
      const pct = total ? (Math.abs(sum - total) / total) * 100 : 0;
      maxDiff = Math.max(maxDiff, pct);
      if (pct > 5) {
        console.log(
          `  ⚠ [${st}] ${p.country}: settori=${(sum / 1e9).toFixed(2)} total=${(total / 1e9).toFixed(2)} (Δ ${pct.toFixed(1)}%)`,
        );
      }
    }
    const grand = flows
      .filter((f) => f.status === st)
      .reduce((a, f) => a + f.amount_eur, 0);
    const fin = FIN_BUCKETS.map((b) => {
      const t = flows
        .filter((f) => f.status === st && f.sector === "financial" && f.finance_type === (b as FinanceType))
        .reduce((a, f) => a + f.amount_eur, 0);
      return `${FIN_LABEL[b]} ${(t / 1e9).toFixed(1)}`;
    }).join(" · ");
    console.log(
      `[${st}] riconc. settori vs total: scarto max ${maxDiff.toFixed(1)}% ${maxDiff < 5 ? "✓" : "⚠"} · bilaterale ${(grand / 1e9).toFixed(1)} mld € · finanziario → ${fin}`,
    );
  }
}

main().catch((err) => {
  console.error("\n✗ import Kiel fallito:", err.message ?? err);
  process.exit(1);
});
