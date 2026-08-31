// Calcolo del costo pro-capite degli aiuti all'Ucraina per un contribuente italiano.
// TS puro, nessuna dipendenza — testabile in isolamento.
//
// Formula (dalla "Guida Investigativa", Fase 4):
//   costo_italia   = aiuti_bilaterali_IT + quota_UE_IT
//   quota_UE_IT    = Σ ( aiuto_UE_annuo × chiave_contributo_GNI_IT[anno] )
//   pro_capite     = costo_italia / denominatore
//   pro_capite_netto = ( sovvenzioni + prestiti × (1 − tasso_rimborso_atteso) ) / denominatore
//
// I prestiti restano un costo potenziale finché non sono rimborsati: mostriamo
// entrambe le cifre, mai solo quella che fa più impressione.

import type { AidFlow, CountryStats, FinanceType, FlowStatus, Sector } from "./types";

export type Denominator = "population" | "employed" | "taxpayers";

export interface CalcOptions {
  yearFrom: number;
  yearTo: number;
  status: FlowStatus;               // committed | allocated | disbursed
  denominator: Denominator;
  /** quota dei prestiti che si assume verrà rimborsata (0–1). Default 0 = scenario prudente. */
  expectedRepaymentRate: number;
}

export interface CalcInputs {
  /** tutti i flussi rilevanti: donatore = Italia (bilateral) OPPURE istituzione UE */
  flows: AidFlow[];
  /** id dei donatori che rappresentano l'Italia (es. 'italy' + 'kiel-italy') */
  italyDonorIds: string[];
  euInstitutionDonorIds: string[];
  /** statistiche IT per anno, chiave = anno */
  statsByYear: Record<number, CountryStats>;
}

export interface CalcResult {
  yearFrom: number;
  yearTo: number;
  status: FlowStatus;
  denominator: Denominator;
  denominatorLabel: string;
  denominatorValue: number | null;

  italyBilateralEur: number;
  euTotalAidEur: number;
  italyEuShareEur: number;
  totalCostEur: number;             // bilaterale + quota UE, garanzie incluse
  cashCostEur: number;              // totalCostEur meno le garanzie (base del pro-capite)

  /** quanti flussi hanno effettivamente contribuito, per capire la copertura dello stato scelto */
  italyFlowCount: number;
  euFlowCount: number;

  grantEur: number;                 // sovvenzioni + in kind (non rimborsabili)
  loanEur: number;                  // prestiti (rimborsabili)
  guaranteeEur: number;             // garanzie (esposizione potenziale, esclusa dal costo cash)

  netCostEur: number;               // grant + loan × (1 − repaymentRate)
  perCapitaEur: number | null;
  netPerCapitaEur: number | null;

  bySector: Record<Sector, number>;
  /** una voce per ogni anno di flusso per cui è servita una chiave GNI */
  gniKeyYearsUsed: { requestedYear: number; usedYear: number; pct: number; fallback: boolean }[];
  missingGniKeyYears: number[];
}

const DENOM_LABEL: Record<Denominator, string> = {
  population: "popolazione residente",
  employed: "occupati",
  taxpayers: "dichiaranti IRPEF",
};

const yearOf = (isoDate: string) => Number(isoDate.slice(0, 4));

/** Un flusso conta se il suo intervallo [start,end] si sovrappone alla finestra scelta. */
function overlaps(f: AidFlow, yearFrom: number, yearTo: number): boolean {
  const s = yearOf(f.period_start);
  const e = yearOf(f.period_end);
  return s <= yearTo && e >= yearFrom;
}

/** Anno da usare per la chiave GNI di un flusso: l'ultimo anno del flusso dentro la finestra. */
function gniYearFor(f: AidFlow, yearTo: number): number {
  return Math.min(yearTo, yearOf(f.period_end));
}

/** Ripartisce un finance_type nelle 3 categorie di costo. */
function bucketOf(ft: FinanceType): "grant" | "loan" | "guarantee" {
  if (ft === "loan") return "loan";
  if (ft === "guarantee") return "guarantee";
  return "grant"; // grant | in_kind
}

function pickGniKey(
  statsByYear: Record<number, CountryStats>,
  year: number,
): { pct: number; usedYear: number; fallback: boolean } | null {
  const exact = statsByYear[year];
  if (exact?.eu_gni_key_pct != null) {
    return { pct: exact.eu_gni_key_pct, usedYear: year, fallback: false };
  }
  // fallback: anno disponibile più vicino (preferendo il più recente <= year)
  const years = Object.keys(statsByYear)
    .map(Number)
    .filter((y) => statsByYear[y]?.eu_gni_key_pct != null)
    .sort((a, b) => a - b);
  if (years.length === 0) return null;
  const below = years.filter((y) => y <= year).pop();
  const usedYear = below ?? years[0];
  return { pct: statsByYear[usedYear].eu_gni_key_pct as number, usedYear, fallback: true };
}

export function calculate(inputs: CalcInputs, opts: CalcOptions): CalcResult {
  const { flows, italyDonorIds, euInstitutionDonorIds, statsByYear } = inputs;
  const { yearFrom, yearTo, status, denominator, expectedRepaymentRate } = opts;

  const italySet = new Set(italyDonorIds);
  const euSet = new Set(euInstitutionDonorIds);
  const inRange = (f: AidFlow) =>
    f.status === status && overlaps(f, yearFrom, yearTo);

  const bySector: Record<Sector, number> = {
    military: 0,
    financial: 0,
    humanitarian: 0,
    reconstruction: 0,
  };
  let grantEur = 0;
  let loanEur = 0;
  let guaranteeEur = 0;

  let italyBilateralEur = 0;
  let euTotalAidEur = 0;
  let italyEuShareEur = 0;
  let italyFlowCount = 0;
  let euFlowCount = 0;

  const gniUsed = new Map<
    number,
    { requestedYear: number; usedYear: number; pct: number; fallback: boolean }
  >();
  const missingGni = new Set<number>();

  const addBuckets = (ft: FinanceType, amount: number) => {
    const b = bucketOf(ft);
    if (b === "loan") loanEur += amount;
    else if (b === "guarantee") guaranteeEur += amount;
    else grantEur += amount;
  };

  for (const f of flows) {
    if (!inRange(f)) continue;

    if (italySet.has(f.donor_id)) {
      italyFlowCount++;
      italyBilateralEur += f.amount_eur;
      bySector[f.sector] += f.amount_eur;
      addBuckets(f.finance_type, f.amount_eur);
      continue;
    }

    if (euSet.has(f.donor_id)) {
      euFlowCount++;
      euTotalAidEur += f.amount_eur;
      const y = gniYearFor(f, yearTo);
      const key = pickGniKey(statsByYear, y);
      if (!key) {
        missingGni.add(y);
        continue;
      }
      if (!gniUsed.has(y)) {
        gniUsed.set(y, {
          requestedYear: y,
          usedYear: key.usedYear,
          pct: key.pct,
          fallback: key.fallback,
        });
      }
      const share = f.amount_eur * (key.pct / 100);
      italyEuShareEur += share;
      bySector[f.sector] += share;
      addBuckets(f.finance_type, share);
    }
  }

  const totalCostEur = italyBilateralEur + italyEuShareEur;
  const rate = Math.min(1, Math.max(0, expectedRepaymentRate));
  // Le garanzie sono un'esposizione potenziale, non un esborso: fuori dal costo
  // pro-capite (sia lordo sia netto). Restano visibili come voce a parte.
  const cashCostEur = totalCostEur - guaranteeEur;
  const netCostEur = grantEur + loanEur * (1 - rate);

  const stats = statsByYear[yearTo] ?? statsByYear[Object.keys(statsByYear).map(Number).sort().pop() ?? yearTo];
  let denominatorValue: number | null = null;
  if (stats) {
    if (denominator === "population") denominatorValue = stats.population;
    else if (denominator === "employed") denominatorValue = stats.employed_labor_force;
    else denominatorValue = stats.irpef_taxpayers;
  }

  const perCapitaEur =
    denominatorValue && denominatorValue > 0 ? cashCostEur / denominatorValue : null;
  const netPerCapitaEur =
    denominatorValue && denominatorValue > 0 ? netCostEur / denominatorValue : null;

  return {
    yearFrom,
    yearTo,
    status,
    denominator,
    denominatorLabel: DENOM_LABEL[denominator],
    denominatorValue,
    italyBilateralEur,
    euTotalAidEur,
    italyEuShareEur,
    totalCostEur,
    cashCostEur,
    italyFlowCount,
    euFlowCount,
    grantEur,
    loanEur,
    guaranteeEur,
    netCostEur,
    perCapitaEur,
    netPerCapitaEur,
    bySector,
    gniKeyYearsUsed: [...gniUsed.values()].sort((a, b) => a.requestedYear - b.requestedYear),
    missingGniKeyYears: [...missingGni].sort((a, b) => a - b),
  };
}
