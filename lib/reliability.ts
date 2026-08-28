import type { ReliabilityTier } from "./types";

// Legenda affidabilità del dato — coerente con la "Guida Investigativa":
// verde = dato esatto da fonte contrattuale, giallo = stima aggregata,
// rosso = stima militare ricostruita.
export const RELIABILITY: Record<
  ReliabilityTier,
  { label: string; short: string; color: string; dot: string; description: string }
> = {
  exact: {
    label: "Dato esatto",
    short: "Esatto",
    color: "#15803d",
    dot: "bg-emerald-600",
    description:
      "Cifra presa da un documento contrattuale o di bilancio ufficiale (TED, EU FTS, atti UE, bilanci aziendali). Nessuna stima.",
  },
  aggregate_estimate: {
    label: "Stima aggregata",
    short: "Stima",
    color: "#b45309",
    dot: "bg-amber-600",
    description:
      "Totale compilato da un istituto di ricerca incrociando annunci di governi e documenti pubblici (Kiel Institute). Alcune voci sono valorizzate a costo di rimpiazzo.",
  },
  military_estimate: {
    label: "Stima militare",
    short: "Stima militare",
    color: "#b91c1c",
    dot: "bg-red-700",
    description:
      "Valore ricostruito per forniture d'arma i cui contratti sono secretati, a partire dai movimenti fisici (SIPRI Arms Transfers) e da report aziendali. Margine di incertezza alto.",
  },
};

export const TIER_ORDER: ReliabilityTier[] = [
  "exact",
  "aggregate_estimate",
  "military_estimate",
];
