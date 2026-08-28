import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate, type CalcInputs } from "./calculator";
import type { AidFlow } from "./types";

function flow(p: Partial<AidFlow>): AidFlow {
  return {
    id: Math.random().toString(36),
    donor_id: "x",
    recipient: "Ukraine",
    instrument: "bilateral",
    sector: "military",
    finance_type: "in_kind",
    status: "committed",
    amount_eur: 0,
    amount_original: null,
    currency: "EUR",
    fx_date: null,
    period_start: "2022-01-24",
    period_end: "2026-06-30",
    reliability_tier: "aggregate_estimate",
    source_id: "s",
    source_ref: "r",
    source_url: null,
    notes: null,
    ...p,
  };
}

const base: CalcInputs = {
  flows: [
    flow({ donor_id: "IT", sector: "military", finance_type: "in_kind", amount_eur: 2_000_000_000 }),
    flow({ donor_id: "EU", sector: "financial", finance_type: "loan", amount_eur: 30_000_000_000 }),
    flow({ donor_id: "EU", sector: "reconstruction", finance_type: "grant", amount_eur: 10_000_000_000 }),
  ],
  italyDonorIds: ["IT"],
  euInstitutionDonorIds: ["EU"],
  statsByYear: {
    2026: {
      iso_code: "IT",
      year: 2026,
      population: 58_000_000,
      employed_labor_force: 24_000_000,
      irpef_taxpayers: 42_000_000,
      eu_gni_key_pct: 10, // 10% per conti tondi
      population_source: null,
      employed_source: null,
      taxpayers_source: null,
      gni_key_source: null,
    },
  },
};

test("quota UE = aiuti UE × chiave contributo", () => {
  const r = calculate(base, {
    yearFrom: 2022,
    yearTo: 2026,
    status: "committed",
    denominator: "employed",
    expectedRepaymentRate: 0,
  });
  // EU totale 40 mld × 10% = 4 mld
  assert.equal(r.italyEuShareEur, 4_000_000_000);
  assert.equal(r.italyBilateralEur, 2_000_000_000);
  assert.equal(r.totalCostEur, 6_000_000_000);
});

test("prestiti separati e costo netto con rimborso", () => {
  const r = calculate(base, {
    yearFrom: 2022,
    yearTo: 2026,
    status: "committed",
    denominator: "employed",
    expectedRepaymentRate: 1, // 100% rimborsato
  });
  // loan share = 30 mld × 10% = 3 mld ; grant share = 10 mld × 10% = 1 mld ; + IT in_kind 2 mld
  assert.equal(r.loanEur, 3_000_000_000);
  assert.equal(r.grantEur, 3_000_000_000); // 1 mld grant UE + 2 mld in_kind IT
  // netto = grant + loan×(1-1) = 3 mld ; /24M ≈ 125
  assert.equal(r.netCostEur, 3_000_000_000);
  assert.ok(Math.abs((r.netPerCapitaEur ?? 0) - 125) < 0.01);
});

test("denominatore cambia il pro-capite", () => {
  const opts = {
    yearFrom: 2022,
    yearTo: 2026,
    status: "committed" as const,
    expectedRepaymentRate: 0,
  };
  const pop = calculate(base, { ...opts, denominator: "population" });
  const emp = calculate(base, { ...opts, denominator: "employed" });
  assert.ok((pop.perCapitaEur ?? 0) < (emp.perCapitaEur ?? 0));
});

test("filtro stato esclude i flussi di stato diverso", () => {
  const r = calculate(base, {
    yearFrom: 2022,
    yearTo: 2026,
    status: "disbursed",
    denominator: "employed",
    expectedRepaymentRate: 0,
  });
  assert.equal(r.totalCostEur, 0);
});
