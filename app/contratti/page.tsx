import type { Metadata } from "next";
import { PageHeader, Panel, EmptyState } from "@/components/ui";
import { getContractors, getContracts, getSources } from "@/lib/queries";
import { fmtEur } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contratti e beneficiari",
  description:
    "Aziende che hanno ricevuto appalti e sussidi legati all'Ucraina (TED, EU FTS, ASAP), con il documento d'origine.",
};

export const revalidate = 3600;

export default async function ContrattiPage() {
  const [contracts, contractors, sources] = await Promise.all([
    getContracts(),
    getContractors(),
    getSources(),
  ]);
  const nameById = Object.fromEntries(contractors.map((c) => [c.id, c.name]));
  const srcById = Object.fromEntries(sources.map((s) => [s.id, s]));

  return (
    <>
      <PageHeader
        title="Contratti e beneficiari"
        lead="Dove i fondi civili e i sussidi diretti all'industria finiscono per nome e cognome. Ogni riga rimanda al bando o alla decisione di aggiudicazione."
      />
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        {contracts.length === 0 ? (
          <EmptyState title="Nessun contratto ancora caricato">
            Le fonti da spogliare sono{" "}
            <a
              className="underline"
              href="https://ted.europa.eu/"
              target="_blank"
              rel="noopener noreferrer"
            >
              TED
            </a>
            ,{" "}
            <a
              className="underline"
              href="https://ec.europa.eu/budget/financial-transparency-system/"
              target="_blank"
              rel="noopener noreferrer"
            >
              EU FTS
            </a>{" "}
            e l&apos;elenco progetti{" "}
            <a
              className="underline"
              href="https://defence-industry-space.ec.europa.eu/eu-defence-industry/act-support-ammunition-production-asap_en"
              target="_blank"
              rel="noopener noreferrer"
            >
              ASAP
            </a>
            . Compilare <code>data/asap-awards.json</code> e rieseguire <code>npm run seed</code>.
          </EmptyState>
        ) : (
          <Panel className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-subtle text-left text-xs uppercase tracking-wide text-ink-faint">
                  <tr>
                    <th className="px-3 py-2 font-medium">Beneficiario</th>
                    <th className="px-3 py-2 font-medium">Programma</th>
                    <th className="px-3 py-2 font-medium">Ente</th>
                    <th className="px-3 py-2 text-right font-medium">Importo</th>
                    <th className="px-3 py-2 font-medium">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} className="border-t border-line">
                      <td className="px-3 py-2">
                        {c.contractor_id ? nameById[c.contractor_id] : c.description ?? "—"}
                      </td>
                      <td className="px-3 py-2">{c.programme ?? "—"}</td>
                      <td className="px-3 py-2">{c.awarding_body}</td>
                      <td className="tnum px-3 py-2 text-right">{fmtEur(c.amount_eur)}</td>
                      <td className="px-3 py-2">
                        {c.source_url ? (
                          <a
                            className="underline decoration-dotted underline-offset-2"
                            href={c.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {srcById[c.source_id ?? ""]?.name ?? "fonte"}
                          </a>
                        ) : (
                          srcById[c.source_id ?? ""]?.name ?? "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
