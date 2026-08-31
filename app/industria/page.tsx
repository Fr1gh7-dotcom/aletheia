import type { Metadata } from "next";
import { PageHeader, Panel, EmptyState, Callout } from "@/components/ui";
import { IndustryChart, type IndustryPoint } from "@/components/charts/IndustryChart";
import { getIndustryMetrics } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Industria della difesa",
  description:
    "Portafoglio ordini e ricavi dei grandi gruppi europei della difesa, citati direttamente dai loro bilanci.",
};

// Dinamico: rilegge da Supabase a ogni richiesta (vedi nota in app/page.tsx).
export const dynamic = "force-dynamic";

// nota: importa "type IndustryPoint" da un componente client va bene (solo tipo).
export default async function IndustriaPage() {
  const metrics = await getIndustryMetrics();

  const companies = [...new Set(metrics.map((m) => m.company))];
  const periods = [...new Set(metrics.map((m) => m.period))].sort();
  const data: IndustryPoint[] = periods.map((period) => {
    const row: IndustryPoint = { period };
    for (const c of companies) {
      const m = metrics.find((x) => x.period === period && x.company === c);
      row[c] = m?.order_backlog_eur ?? null;
    }
    return row;
  });

  return (
    <>
      <PageHeader
        title="Industria della difesa"
        lead="Lo svuotamento dei magazzini per l'Ucraina si traduce in commesse governative per ricostituire le scorte. Qui l'andamento del portafoglio ordini dei principali gruppi, con la citazione esatta dal bilancio."
      />
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <Callout>
          Questa sezione mostra <strong>correlazione documentata</strong>, non un nesso
          causale diretto: le aziende stesse, nei loro bilanci, attribuiscono la crescita
          degli ordini alla ricostituzione delle scorte post-Ucraina. Le citazioni sono
          riportate testualmente.
        </Callout>

        {metrics.length === 0 ? (
          <EmptyState title="In arrivo: gli ordini dell'industria della difesa">
            <p>
              Qui l&apos;andamento del portafoglio ordini e dei ricavi dei grandi gruppi
              europei — Rheinmetall, Leonardo, Thales, BAE Systems — con la citazione
              testuale dalla relazione finanziaria in cui l&apos;azienda stessa lega la
              crescita degli ordini alla ricostituzione delle scorte.
            </p>
            <p className="mt-2">
              I dati vengono dai bilanci ufficiali e dalle presentazioni agli investitori.
              Previsto entro l&apos;autunno 2026.
            </p>
          </EmptyState>
        ) : (
          <>
            <Panel>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                Portafoglio ordini per esercizio
              </h2>
              <IndustryChart data={data} companies={companies} />
            </Panel>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
                Cosa dicono i bilanci
              </h2>
              {metrics
                .filter((m) => m.metric_note)
                .map((m) => (
                  <Panel key={m.id}>
                    <div className="text-sm font-medium">
                      {m.company} · {m.period}
                    </div>
                    <blockquote className="mt-1 border-l-2 border-line-strong pl-3 text-sm text-ink-soft">
                      &ldquo;{m.metric_note}&rdquo;
                    </blockquote>
                    {m.source_url && (
                      <a
                        className="mt-2 inline-block text-xs underline decoration-dotted"
                        href={m.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Documento
                      </a>
                    )}
                  </Panel>
                ))}
            </section>
          </>
        )}
      </div>
    </>
  );
}
