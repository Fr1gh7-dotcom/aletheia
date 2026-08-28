// Formattazione numeri/valute in italiano.

const eur0 = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eur2 = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const num0 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });

/** Valuta senza decimali: € 1.300.000.000 */
export const fmtEur = (v: number) => eur0.format(v);

/** Valuta con 2 decimali: € 52,74 — per i valori pro-capite */
export const fmtEur2 = (v: number) => eur2.format(v);

/** Numero intero con separatori: 58.990.000 */
export const fmtNum = (v: number) => num0.format(v);

/** Compatta un importo in scala leggibile: "1,3 mld", "480 mln" */
export function fmtEurCompact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `€ ${num1.format(v / 1e9)} mld`;
  if (abs >= 1e6) return `€ ${num0.format(v / 1e6)} mln`;
  if (abs >= 1e3) return `€ ${num0.format(v / 1e3)} mila`;
  return eur0.format(v);
}

/** Percentuale: 12,3% */
export const fmtPct = (v: number) => `${num1.format(v)}%`;
