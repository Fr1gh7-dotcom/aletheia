import type { AidFlow, Donor, ReliabilityTier } from "./types";
import { RELIABILITY } from "./reliability";

export interface SankeyGraph {
  nodes: { name: string; layer: number }[];
  links: { source: number; target: number; value: number; tier: ReliabilityTier; color: string }[];
}

const INSTRUMENT_LABEL: Record<string, string> = {
  bilateral: "Bilaterale",
  ukraine_facility: "Ukraine Facility",
  epf: "European Peace Facility",
  asap: "ASAP",
  macro_financial_assistance: "Assistenza macro-finanziaria",
  other: "Altro",
};
const SECTOR_LABEL: Record<string, string> = {
  military: "Militare",
  financial: "Finanziario",
  humanitarian: "Umanitario",
  reconstruction: "Ricostruzione",
};
const FINANCE_LABEL: Record<string, string> = {
  grant: "Fondo perduto",
  loan: "Prestito",
  guarantee: "Garanzia",
  in_kind: "In natura",
};

/** Tier prevalente (per valore) di un gruppo di flussi. */
function modalTier(flows: AidFlow[]): ReliabilityTier {
  const by: Record<string, number> = {};
  for (const f of flows) by[f.reliability_tier] = (by[f.reliability_tier] ?? 0) + f.amount_eur;
  return (Object.entries(by).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "aggregate_estimate") as ReliabilityTier;
}

export function buildSankey(flows: AidFlow[], donors: Donor[]): SankeyGraph {
  const donorById = new Map(donors.map((d) => [d.id, d]));
  const originOf = (f: AidFlow): string => {
    const d = donorById.get(f.donor_id);
    if (!d) return "Altri Stati";
    if (d.type === "eu_institution") return "Istituzioni UE";
    if (d.iso_code === "IT" || /ital(y|ia)/i.test(d.name)) return "Italia";
    return "Altri Stati";
  };

  const nodeIndex = new Map<string, number>();
  const nodes: { name: string; layer: number }[] = [];
  const nodeId = (key: string, label: string, layer: number) => {
    if (!nodeIndex.has(key)) {
      nodeIndex.set(key, nodes.length);
      nodes.push({ name: label, layer });
    }
    return nodeIndex.get(key)!;
  };

  // accumulatori per coppia di nodi
  const edges = new Map<string, { source: number; target: number; value: number; flows: AidFlow[] }>();
  const addEdge = (s: number, t: number, f: AidFlow) => {
    const k = `${s}->${t}`;
    if (!edges.has(k)) edges.set(k, { source: s, target: t, value: 0, flows: [] });
    const e = edges.get(k)!;
    e.value += f.amount_eur;
    e.flows.push(f);
  };

  for (const f of flows) {
    if (f.amount_eur <= 0) continue;
    const o = nodeId(`O:${originOf(f)}`, originOf(f), 0);
    const i = nodeId(`I:${f.instrument}`, INSTRUMENT_LABEL[f.instrument] ?? f.instrument, 1);
    const s = nodeId(`S:${f.sector}`, SECTOR_LABEL[f.sector] ?? f.sector, 2);
    const c = nodeId(`F:${f.finance_type}`, FINANCE_LABEL[f.finance_type] ?? f.finance_type, 3);
    addEdge(o, i, f);
    addEdge(i, s, f);
    addEdge(s, c, f);
  }

  const links = [...edges.values()].map((e) => {
    const tier = modalTier(e.flows);
    return {
      source: e.source,
      target: e.target,
      value: Math.round(e.value),
      tier,
      color: RELIABILITY[tier].color,
    };
  });

  return { nodes, links };
}
