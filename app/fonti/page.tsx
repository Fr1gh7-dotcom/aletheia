import type { Metadata } from "next";
import { PageHeader, Panel, Callout } from "@/components/ui";
import { ReliabilityLegend } from "@/components/ReliabilityLegend";
import {
  getAidFlows,
  getContracts,
  getCountryStats,
  getIndustryMetrics,
  getSources,
} from "@/lib/queries";
import { fmtNum } from "@/lib/format";

export const metadata: Metadata = {
  title: "Fonti e metodo",
  description:
    "Ogni fonte usata da Aletheia: cosa misura, cosa stima, con quale cadenza si aggiorna. La formula del calcolatore e i limiti noti dei dati.",
};

// Dinamico: rilegge da Supabase a ogni richiesta (vedi nota in app/page.tsx).
export const dynamic = "force-dynamic";

export default async function FontiPage() {
  const [sources, flows, contracts, stats, industry] = await Promise.all([
    getSources(),
    getAidFlows(),
    getContracts(),
    getCountryStats("IT"),
    getIndustryMetrics(),
  ]);

  const status = [
    { label: "Flussi di aiuto (aid_flows)", n: flows.length },
    { label: "Contratti (contracts)", n: contracts.length },
    { label: "Statistiche Italia (country_stats)", n: stats.length },
    { label: "Metriche industria (defense_industry_metrics)", n: industry.length },
  ];

  return (
    <>
      <PageHeader
        title="Fonti e metodo"
        lead="Aletheia non chiede di fidarsi: chiede di verificare. Qui c'è tutto quello che serve per rifare i conti."
      />
      <div className="mx-auto max-w-4xl space-y-10 px-5 py-8">
        {/* -------- formula -------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Come si calcola il costo pro-capite</h2>
          <Panel className="space-y-2 text-sm">
            <p className="tnum">
              costo_Italia = aiuti_bilaterali_IT + Σ ( aiuti_UE[anno] × chiave_contributo_IT[anno] )
            </p>
            <p className="tnum">pro_capite = costo_Italia ÷ denominatore</p>
            <p className="tnum">
              pro_capite_netto = ( fondo_perduto + prestiti × (1 − tasso_rimborso) ) ÷ denominatore
            </p>
          </Panel>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
            <li>
              <strong>Aiuti bilaterali IT</strong>: forniture e fondi diretti dall&apos;Italia,
              dal dataset Kiel (impegni). Le forniture militari senza prezzo pubblico sono
              valorizzate da Kiel al costo di sostituzione.
            </li>
            <li>
              <strong>Chiave di contributo IT</strong>: quota con cui l&apos;Italia finanzia
              il bilancio UE, ~12% (risorse proprie basate sul RNL). È una{" "}
              <em>stima</em> costante per ora: va rifinita anno per anno.
            </li>
            <li>
              <strong>Denominatore</strong>: popolazione residente, occupati o dichiaranti
              IRPEF. Nessuno dei tre è &ldquo;il&rdquo; numero giusto: mostrano cose diverse.
              Gli occupati sono la proxy della guida investigativa per &ldquo;contribuenti&rdquo;.
            </li>
            <li>
              <strong>Prestiti</strong>: contano nel costo lordo ma sono rimborsabili. Lo
              slider &ldquo;tasso di rimborso&rdquo; permette di vedere lo scenario in cui
              rientrano (in parte grazie ai proventi degli asset russi immobilizzati).
            </li>
            <li>
              <strong>Impegnato / allocato / erogato</strong>: un pacchetto annunciato non è
              denaro già speso. La differenza è la causa più comune dei titoli fuorvianti.
            </li>
          </ul>
        </section>

        {/* -------- affidabilità -------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">I tre livelli di affidabilità</h2>
          <Panel>
            <ReliabilityLegend />
          </Panel>
        </section>

        {/* -------- fonti -------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Le fonti</h2>
          {sources.length === 0 && (
            <Callout tone="warn">
              Elenco fonti temporaneamente non disponibile. Riprova tra qualche minuto.
            </Callout>
          )}
          <div className="space-y-4">
            {sources.map((s) => (
              <Panel key={s.id} className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline decoration-dotted underline-offset-2"
                  >
                    {s.name}
                  </a>
                  {s.update_cadence && (
                    <span className="text-xs text-ink-faint">
                      aggiornamento: {s.update_cadence}
                    </span>
                  )}
                </div>
                {s.measures && (
                  <p className="text-sm">
                    <span className="text-ink-faint">Misura: </span>
                    {s.measures}
                  </p>
                )}
                {s.estimates && (
                  <p className="text-sm">
                    <span className="text-ink-faint">Stima: </span>
                    {s.estimates}
                  </p>
                )}
                {s.methodology_note && (
                  <p className="text-sm text-ink-soft">{s.methodology_note}</p>
                )}
              </Panel>
            ))}
          </div>
        </section>

        {/* -------- denominatori IT -------- */}
        {stats.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Denominatori italiani usati</h2>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="bg-bg-subtle text-left text-xs uppercase tracking-wide text-ink-faint">
                  <tr>
                    <th className="px-3 py-2 font-medium">Anno</th>
                    <th className="px-3 py-2 text-right font-medium">Popolazione</th>
                    <th className="px-3 py-2 text-right font-medium">Occupati</th>
                    <th className="px-3 py-2 text-right font-medium">Dichiaranti IRPEF</th>
                    <th className="px-3 py-2 text-right font-medium">Chiave UE</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.year} className="border-t border-line">
                      <td className="px-3 py-2">{s.year}</td>
                      <td className="tnum px-3 py-2 text-right">
                        {s.population ? fmtNum(s.population) : "—"}
                      </td>
                      <td className="tnum px-3 py-2 text-right">
                        {s.employed_labor_force ? fmtNum(s.employed_labor_force) : "—"}
                      </td>
                      <td className="tnum px-3 py-2 text-right">
                        {s.irpef_taxpayers ? fmtNum(s.irpef_taxpayers) : "—"}
                      </td>
                      <td className="tnum px-3 py-2 text-right">
                        {s.eu_gni_key_pct != null ? `${s.eu_gni_key_pct}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 text-xs text-ink-faint">
              {stats.map((s) => (
                <p key={s.year}>
                  <strong>{s.year}</strong> — {s.population_source}; {s.employed_source};{" "}
                  {s.taxpayers_source}; {s.gni_key_source}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* -------- limiti -------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Limiti noti di questa versione</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
            <li>
              La quota italiana degli aiuti UE è calcolata con una chiave di contributo
              costante (~12%): approssimazione, non dato ufficiale annuale.
            </li>
            <li>
              Dal foglio riassuntivo Kiel non si separano fondo perduto e prestito per gli
              aiuti finanziari: la cifra netta va letta con cautela finché non si integra il
              dettaglio.
            </li>
            <li>
              I dati militari secretati non sono nel calcolo diretto: entrano solo come
              stima (SIPRI) quando disponibili, marcati in rosso.
            </li>
            <li>
              European Peace Facility: l&apos;UE rimborsa gli Stati, non paga le aziende. Le
              tranche EPF indicano importi, non beneficiari finali.
            </li>
            <li>
              I flussi cumulativi (2022→oggi) sono attribuiti all&apos;intero periodo: un
              filtro su un singolo anno li include se il periodo si sovrappone.
            </li>
          </ul>
        </section>

        {/* -------- fuori ambito -------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Fuori ambito</h2>
          <p className="text-sm text-ink-soft">
            Solo tecniche OSINT (fonti aperte). Nessun documento riservato, nessun
            materiale non verificabile, nessuna aggregazione da reti di disinformazione.
            Geopolitica non correlata all&apos;Ucraina esclusa.
          </p>
        </section>

        {/* -------- stato dati -------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Stato di caricamento dei dati</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {status.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm"
              >
                <span className="text-ink-soft">{s.label}</span>
                <span className="tnum">{s.n} righe</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
