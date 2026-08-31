import type { Metadata } from "next";
import { PageHeader, Panel, Callout } from "@/components/ui";
import { ReliabilityLegend } from "@/components/ReliabilityLegend";
import { SourceBadge } from "@/components/SourceBadge";
import { FlowsSankey } from "@/components/charts/FlowsSankey";
import { getAidFlows, getDonors, getSources } from "@/lib/queries";
import { buildSankey } from "@/lib/sankey";
import { fmtEurCompact } from "@/lib/format";
import type { AidFlow } from "@/lib/types";

export const metadata: Metadata = {
  title: "Flussi finanziari",
  description:
    "Sankey dei flussi di aiuto verso l'Ucraina: origine, strumento, settore, tipo di finanziamento. Colore per affidabilità del dato.",
};

// Dinamico: rilegge i flussi da Supabase a ogni richiesta (vedi nota in app/page.tsx).
export const dynamic = "force-dynamic";

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

function groupBy(flows: AidFlow[], key: (f: AidFlow) => string) {
  const m = new Map<string, { total: number; flows: AidFlow[] }>();
  for (const f of flows) {
    const k = key(f);
    if (!m.has(k)) m.set(k, { total: 0, flows: [] });
    const g = m.get(k)!;
    g.total += f.amount_eur;
    g.flows.push(f);
  }
  return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
}

export default async function FlussiPage() {
  const [allFlows, donors, sources] = await Promise.all([
    getAidFlows(),
    getDonors(),
    getSources(),
  ]);
  const srcById = Object.fromEntries(sources.map((s) => [s.id, s]));

  // Il dataset contiene sia gli impegni (committed) sia gli stanziamenti
  // (allocated): questa pagina mostra gli IMPEGNI, per non sommare le due serie.
  // Il confronto impegnato/allocato/erogato è nel calcolatore.
  const flows = allFlows.filter((f) => f.status === "committed");
  const graph = buildSankey(flows, donors);

  const byInstrument = groupBy(flows, (f) => f.instrument);
  const bySector = groupBy(flows, (f) => f.sector);

  return (
    <>
      <PageHeader
        title="Flussi finanziari"
        lead="Come si muove il denaro: dall'origine (Italia, altri Stati, istituzioni UE) allo strumento, al settore, al tipo di finanziamento. Lo spessore è proporzionale all'importo; il colore indica quanto è affidabile la cifra."
      />
      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        {flows.length === 0 ? (
          <Callout tone="warn" title="Dati temporaneamente non disponibili">
            I flussi non sono al momento raggiungibili. Riprova tra qualche minuto.
          </Callout>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              Vista sugli <strong>impegni</strong> (aiuti annunciati). Lo stanziato e
              l&apos;erogato si confrontano nel{" "}
              <a className="underline hover:text-ink" href="/calcolatore">
                calcolatore
              </a>
              .
            </p>

            <Panel>
              <FlowsSankey graph={graph} />
              <div className="mt-4 border-t border-line pt-3">
                <ReliabilityLegend compact />
              </div>
            </Panel>

            <div className="grid gap-6 md:grid-cols-2">
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                  Per strumento
                </h2>
                <div className="space-y-2">
                  {byInstrument.map(([k, g]) => (
                    <div
                      key={k}
                      className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5 text-sm"
                    >
                      <span>{INSTRUMENT_LABEL[k] ?? k}</span>
                      <span className="tnum">{fmtEurCompact(g.total)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                  Per settore
                </h2>
                <div className="space-y-2">
                  {bySector.map(([k, g]) => (
                    <div
                      key={k}
                      className="flex items-baseline justify-between gap-3 border-b border-line pb-1.5 text-sm"
                    >
                      <span>{SECTOR_LABEL[k] ?? k}</span>
                      <span className="tnum">{fmtEurCompact(g.total)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                Voci in archivio
              </h2>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-sm">
                  <thead className="bg-bg-subtle text-left text-xs uppercase tracking-wide text-ink-faint">
                    <tr>
                      <th className="px-3 py-2 font-medium">Strumento</th>
                      <th className="px-3 py-2 font-medium">Settore</th>
                      <th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 font-medium">Stato</th>
                      <th className="px-3 py-2 text-right font-medium">Importo</th>
                      <th className="px-3 py-2 font-medium">Fonte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flows
                      .slice()
                      .sort((a, b) => b.amount_eur - a.amount_eur)
                      .map((f) => (
                        <tr key={f.id} className="border-t border-line">
                          <td className="px-3 py-2">{INSTRUMENT_LABEL[f.instrument] ?? f.instrument}</td>
                          <td className="px-3 py-2">{SECTOR_LABEL[f.sector] ?? f.sector}</td>
                          <td className="px-3 py-2">{f.finance_type}</td>
                          <td className="px-3 py-2">{f.status}</td>
                          <td className="tnum px-3 py-2 text-right">{fmtEurCompact(f.amount_eur)}</td>
                          <td className="px-3 py-2">
                            <SourceBadge
                              tier={f.reliability_tier}
                              sourceName={srcById[f.source_id]?.name ?? "fonte"}
                              sourceUrl={f.source_url ?? srcById[f.source_id]?.url}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
