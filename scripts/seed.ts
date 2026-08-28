// Seed idempotente delle tabelle non-Kiel:
//   sources, donors, country_stats, aid_flows (dotazioni legislative), contracts (ASAP),
//   defense_industry_metrics.
//
// Uso:  npm run seed
// Richiede: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
import "./lib/load-env";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseAdmin } from "../lib/supabase/admin";

const dataDir = resolve(process.cwd(), "data");
const readJson = (f: string) => JSON.parse(readFileSync(resolve(dataDir, f), "utf8"));

async function main() {
  const sb = getSupabaseAdmin();

  // --- sources -------------------------------------------------------------
  const sources = readJson("sources.json");
  {
    const { error } = await sb.from("sources").upsert(sources, { onConflict: "slug" });
    if (error) throw error;
    console.log(`sources        : ${sources.length} righe`);
  }
  const { data: srcRows, error: srcErr } = await sb.from("sources").select("id, slug");
  if (srcErr) throw srcErr;
  const srcId: Record<string, string> = Object.fromEntries(
    (srcRows ?? []).map((r) => [r.slug, r.id]),
  );

  // --- donors ------------------------------------------------------------
  const donors = readJson("donors.json");
  {
    const { error } = await sb.from("donors").upsert(donors, { onConflict: "slug" });
    if (error) throw error;
    console.log(`donors         : ${donors.length} righe`);
  }
  const { data: donorRows, error: donErr } = await sb.from("donors").select("id, slug");
  if (donErr) throw donErr;
  const donorId: Record<string, string> = Object.fromEntries(
    (donorRows ?? []).map((r) => [r.slug, r.id]),
  );

  // --- country_stats (IT) ---------------------------------------------------
  const it = readJson("country-stats.it.json");
  const statRows = it.years.map((y: Record<string, unknown>) => ({
    iso_code: it.iso_code,
    year: y.year,
    population: y.population,
    employed_labor_force: y.employed_labor_force,
    irpef_taxpayers: y.irpef_taxpayers,
    eu_gni_key_pct: y.eu_gni_key_pct,
    population_source: y.population_source,
    employed_source: y.employed_source,
    taxpayers_source: y.taxpayers_source,
    gni_key_source: y.gni_key_source,
  }));
  {
    const { error } = await sb
      .from("country_stats")
      .upsert(statRows, { onConflict: "iso_code,year" });
    if (error) throw error;
    console.log(`country_stats  : ${statRows.length} righe (IT)`);
  }

  // --- aid_flows (dotazioni legislative) ----------------------------------
  const seed = readJson("aid-flows.seed.json");
  const flowRows = seed.flows.map((f: Record<string, unknown>) => ({
    donor_id: donorId[f.donor_slug as string],
    recipient: "Ukraine",
    instrument: f.instrument,
    sector: f.sector,
    finance_type: f.finance_type,
    status: f.status,
    amount_eur: f.amount_eur,
    currency: "EUR",
    period_start: f.period_start,
    period_end: f.period_end,
    reliability_tier: f.reliability_tier,
    source_id: srcId[f.source_slug as string],
    source_ref: f.source_ref,
    source_url: f.source_url,
    notes: f.notes,
  }));
  const missingDonor = flowRows.filter((r: { donor_id?: string }) => !r.donor_id);
  if (missingDonor.length) throw new Error("aid-flows.seed.json: donor_slug non trovato");
  {
    const { error } = await sb
      .from("aid_flows")
      .upsert(flowRows, { onConflict: "source_id,source_ref" });
    if (error) throw error;
    console.log(`aid_flows      : ${flowRows.length} righe (dotazioni legislative)`);
  }

  // --- contracts (ASAP) ---------------------------------------------------
  const asap = readJson("asap-awards.json");
  if (Array.isArray(asap.awards) && asap.awards.length) {
    const contractRows = asap.awards.map((a: Record<string, unknown>) => ({
      awarding_body: "Commissione Europea (DG DEFIS)",
      programme: "ASAP",
      amount_eur: a.amount_eur,
      finance_type: "grant",
      award_date: a.award_date ?? null,
      description: a.description ?? `ASAP — ${a.company}${a.plant ? `, ${a.plant}` : ""}`,
      source_id: srcId[asap.source_slug],
      source_ref: `asap-${a.slug}`,
      source_url: a.source_url ?? asap.source_url,
    }));
    const { error } = await sb
      .from("contracts")
      .upsert(contractRows, { onConflict: "source_ref" });
    if (error) throw error;
    console.log(`contracts      : ${contractRows.length} righe (ASAP)`);
  } else {
    console.log("contracts      : 0 righe — data/asap-awards.json ancora vuoto");
  }

  // --- defense_industry_metrics ------------------------------------------
  const ind = readJson("industry-metrics.json");
  if (Array.isArray(ind.metrics) && ind.metrics.length) {
    const metricRows = ind.metrics.map((m: Record<string, unknown>) => ({
      company: m.company,
      country: m.country ?? null,
      period: m.period,
      period_end: m.period_end,
      order_backlog_eur: m.order_backlog_eur ?? null,
      revenue_eur: m.revenue_eur ?? null,
      metric_note: m.metric_note ?? null,
      source_id: srcId[ind.source_slug],
      source_url: m.source_url ?? null,
    }));
    const { error } = await sb
      .from("defense_industry_metrics")
      .upsert(metricRows, { onConflict: "company,period" });
    if (error) throw error;
    console.log(`industry       : ${metricRows.length} righe`);
  } else {
    console.log("industry       : 0 righe — data/industry-metrics.json ancora vuoto");
  }

  console.log("\n✓ seed completato");
}

main().catch((err) => {
  console.error("\n✗ seed fallito:", err.message ?? err);
  process.exit(1);
});
