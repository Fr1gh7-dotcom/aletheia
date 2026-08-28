"use client";

import { useMemo, useState } from "react";
import { calculate, type CalcResult, type Denominator } from "@/lib/calculator";
import type { CalcInputs } from "@/lib/calculator";
import type { FlowStatus } from "@/lib/types";
import { fmtEur, fmtEur2, fmtEurCompact, fmtNum, fmtPct } from "@/lib/format";
import { Panel, Callout, Stat } from "@/components/ui";

const STATUS_LABEL: Record<FlowStatus, string> = {
  committed: "impegnato (annunciato)",
  allocated: "allocato (stanziato)",
  disbursed: "erogato (versato)",
};

const DENOM_LABEL: Record<Denominator, string> = {
  population: "Popolazione",
  employed: "Occupati",
  taxpayers: "Dichiaranti IRPEF",
};

const SECTOR_LABEL: Record<string, string> = {
  military: "Militare",
  financial: "Finanziario",
  humanitarian: "Umanitario",
  reconstruction: "Ricostruzione",
};

export function CalculatorClient({
  inputs,
  statSources,
  yearMin,
  yearMax,
}: {
  inputs: CalcInputs;
  statSources: {
    year: number;
    population_source?: string | null;
    employed_source?: string | null;
    taxpayers_source?: string | null;
    gni_key_source?: string | null;
  }[];
  yearMin: number;
  yearMax: number;
}) {
  const [yearFrom, setYearFrom] = useState(yearMin);
  const [yearTo, setYearTo] = useState(yearMax);
  const [status, setStatus] = useState<FlowStatus>("committed");
  const [denominator, setDenominator] = useState<Denominator>("employed");
  const [repayPct, setRepayPct] = useState(0);

  const result: CalcResult = useMemo(
    () =>
      calculate(inputs, {
        yearFrom: Math.min(yearFrom, yearTo),
        yearTo: Math.max(yearFrom, yearTo),
        status,
        denominator,
        expectedRepaymentRate: repayPct / 100,
      }),
    [inputs, yearFrom, yearTo, status, denominator, repayPct],
  );

  const years = Array.from({ length: yearMax - yearMin + 1 }, (_, i) => yearMin + i);
  const denomSourceText =
    statSources.find((s) => s.year === result.yearTo) ?? statSources.at(-1);
  const denomSource =
    denominator === "population"
      ? denomSourceText?.population_source
      : denominator === "employed"
        ? denomSourceText?.employed_source
        : denomSourceText?.taxpayers_source;

  const hasData = inputs.flows.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
      {/* -------- controlli -------- */}
      <div className="space-y-5">
        <Panel className="space-y-4">
          <Field label="Periodo (anni di attività del flusso)">
            <div className="flex items-center gap-2">
              <select
                value={yearFrom}
                onChange={(e) => setYearFrom(Number(e.target.value))}
                className="rounded-md border border-line-strong bg-bg px-2 py-1.5 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="text-ink-faint">–</span>
              <select
                value={yearTo}
                onChange={(e) => setYearTo(Number(e.target.value))}
                className="rounded-md border border-line-strong bg-bg px-2 py-1.5 text-sm"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Stato del flusso">
            <div className="space-y-1">
              {(["committed", "allocated", "disbursed"] as FlowStatus[]).map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="status"
                    checked={status === s}
                    onChange={() => setStatus(s)}
                  />
                  {STATUS_LABEL[s]}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Denominatore (chi divide il costo)">
            <div className="space-y-1">
              {(["population", "employed", "taxpayers"] as Denominator[]).map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="denom"
                    checked={denominator === d}
                    onChange={() => setDenominator(d)}
                  />
                  {DENOM_LABEL[d]}
                </label>
              ))}
            </div>
          </Field>

          <Field
            label={`Prestiti che si assume verranno rimborsati: ${repayPct}%`}
          >
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={repayPct}
              onChange={(e) => setRepayPct(Number(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-xs text-ink-faint">
              0% = scenario prudente (il prestito è un costo finché non rientra).
            </p>
          </Field>
        </Panel>
      </div>

      {/* -------- risultati -------- */}
      <div className="space-y-5">
        {!hasData && (
          <Callout tone="warn" title="Dati non ancora caricati">
            Il database è vuoto: collega Supabase ed esegui <code>npm run data:all</code>.
            I numeri qui sotto sono a zero.
          </Callout>
        )}

        <Panel>
          <div className="text-xs uppercase tracking-wide text-ink-faint">
            Costo lordo per {result.denominatorLabel} · {result.yearFrom}–{result.yearTo} ·{" "}
            {STATUS_LABEL[result.status]}
          </div>
          <div className="tnum mt-1 text-4xl font-semibold sm:text-5xl">
            {result.perCapitaEur != null ? fmtEur2(result.perCapitaEur) : "—"}
          </div>
          <div className="mt-2 text-sm text-ink-soft">
            Costo netto se rientra il {repayPct}% dei prestiti:{" "}
            <span className="tnum font-medium text-ink">
              {result.netPerCapitaEur != null ? fmtEur2(result.netPerCapitaEur) : "—"}
            </span>
          </div>
          {result.denominatorValue != null && (
            <div className="mt-1 text-xs text-ink-faint">
              denominatore: {fmtNum(result.denominatorValue)} — {denomSource ?? "fonte da collegare"}
            </div>
          )}
        </Panel>

        <div className="grid gap-4 sm:grid-cols-3">
          <Panel>
            <Stat
              label="Aiuti bilaterali Italia"
              value={fmtEurCompact(result.italyBilateralEur)}
              sub="forniture e fondi diretti dall'Italia"
            />
          </Panel>
          <Panel>
            <Stat
              label="Quota Italia sugli aiuti UE"
              value={fmtEurCompact(result.italyEuShareEur)}
              sub={`aiuti UE ${fmtEurCompact(result.euTotalAidEur)} × chiave contributo`}
            />
          </Panel>
          <Panel>
            <Stat
              label="Totale attribuito all'Italia"
              value={fmtEurCompact(result.totalCostEur)}
              sub="bilaterale + quota UE"
            />
          </Panel>
        </div>

        <Panel className="space-y-3">
          <h2 className="text-sm font-semibold">Composizione del totale</h2>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <Row label="Fondo perduto / in natura" value={fmtEur(result.grantEur)} />
            <Row label="Prestiti (rimborsabili)" value={fmtEur(result.loanEur)} />
            <Row label="Garanzie (esposizione)" value={fmtEur(result.guaranteeEur)} />
          </div>
          <p className="text-xs text-ink-faint">
            Le garanzie non sono un esborso di cassa: sono escluse dal costo pro-capite e
            indicate solo come esposizione potenziale.
          </p>
        </Panel>

        <Panel className="space-y-2">
          <h2 className="text-sm font-semibold">Per settore</h2>
          <div className="grid gap-2 sm:grid-cols-2 text-sm">
            {Object.entries(result.bySector)
              .filter(([, v]) => v > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => (
                <Row key={k} label={SECTOR_LABEL[k] ?? k} value={fmtEur(v)} />
              ))}
            {Object.values(result.bySector).every((v) => v === 0) && (
              <p className="text-ink-faint">Nessun flusso nel periodo selezionato.</p>
            )}
          </div>
        </Panel>

        {(result.missingGniKeyYears.length > 0 ||
          result.gniKeyYearsUsed.some((y) => y.fallback)) && (
          <Callout tone="warn" title="Nota sulla chiave di contributo UE">
            {result.gniKeyYearsUsed
              .filter((y) => y.fallback)
              .map((y) => (
                <div key={y.year}>
                  Per il {y.year} è stata usata la chiave dell&apos;anno {y.year} più vicino
                  disponibile ({fmtPct(y.pct)}).
                </div>
              ))}
            {result.missingGniKeyYears.length > 0 && (
              <div>
                Anni senza chiave di contributo: {result.missingGniKeyYears.join(", ")} — la
                quota UE di quegli anni è esclusa.
              </div>
            )}
          </Callout>
        )}

        <Callout title="Come si legge">
          <p>
            Formula:{" "}
            <span className="tnum">
              (aiuti bilaterali IT + Σ aiuti UE × chiave contributo IT) ÷ denominatore
            </span>
            . La chiave di contributo è la quota con cui l&apos;Italia finanzia il bilancio
            UE (~12%). &laquo;Impegnato&raquo; è quanto annunciato, &laquo;erogato&raquo;
            quanto effettivamente versato: la differenza è spesso la causa dei titoli
            fuorvianti.
          </p>
        </Callout>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line pb-1">
      <span className="text-ink-soft">{label}</span>
      <span className="tnum text-ink">{value}</span>
    </div>
  );
}
