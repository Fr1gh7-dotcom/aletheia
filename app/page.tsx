import Link from "next/link";
import { calculate } from "@/lib/calculator";
import { buildCalcInputs, YEAR_MAX, YEAR_MIN } from "@/lib/calc-inputs";
import { getAidFlows, getCountryStats, getDonors, isDbConfigured } from "@/lib/queries";
import { fmtEur2, fmtEurCompact } from "@/lib/format";
import { Panel, Callout } from "@/components/ui";
import { ReliabilityLegend } from "@/components/ReliabilityLegend";

export const revalidate = 3600;

const SECTIONS = [
  {
    href: "/calcolatore",
    title: "Calcolatore costo pro-capite",
    body: "Quanto pesa il sostegno all'Ucraina su ogni contribuente italiano, con denominatore e periodo selezionabili.",
  },
  {
    href: "/flussi",
    title: "Flussi finanziari",
    body: "Da quale donatore, con quale strumento, verso quale settore. Colore per affidabilità del dato.",
  },
  {
    href: "/contratti",
    title: "Contratti e beneficiari",
    body: "Le aziende che hanno vinto appalti e sussidi (TED, FTS, ASAP), con il documento d'origine.",
  },
  {
    href: "/industria",
    title: "Industria della difesa",
    body: "Portafoglio ordini e ricavi dei grandi gruppi, citati dai loro bilanci.",
  },
];

export default async function HomePage() {
  const [flows, donors, stats] = await Promise.all([
    getAidFlows(),
    getDonors(),
    getCountryStats("IT"),
  ]);

  const inputs = buildCalcInputs(flows, donors, stats);
  const res = calculate(inputs, {
    yearFrom: YEAR_MIN,
    yearTo: YEAR_MAX,
    status: "committed",
    denominator: "employed",
    expectedRepaymentRate: 0,
  });

  const hasData = flows.length > 0;

  return (
    <div>
      {/* -------- hero -------- */}
      <section className="border-b border-line-strong bg-bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <p className="text-sm uppercase tracking-wide text-ink-faint">
            Aiuti all&apos;Ucraina · {YEAR_MIN}–{YEAR_MAX}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Quanto costa davvero, a chi paga le tasse in Italia, il sostegno
            all&apos;Ucraina.
          </h1>
          <p className="mt-4 max-w-2xl text-ink-soft">
            Un solo posto per i numeri: aiuti bilaterali e quota italiana di quelli
            europei, prestiti tenuti distinti dal fondo perduto, cifre esatte separate
            dalle stime. Ogni dato ha un link alla fonte istituzionale.
          </p>

          <div className="mt-8 grid gap-4 sm:max-w-md">
            <Panel>
              <div className="text-xs uppercase tracking-wide text-ink-faint">
                Costo lordo stimato · per occupato · impegni {YEAR_MIN}–{YEAR_MAX}
              </div>
              <div className="tnum mt-1 text-4xl font-semibold sm:text-5xl">
                {hasData && res.perCapitaEur != null ? fmtEur2(res.perCapitaEur) : "—"}
              </div>
              <div className="mt-2 text-sm text-ink-soft">
                di cui prestiti (da restituire):{" "}
                <span className="tnum text-ink">{fmtEurCompact(res.loanEur)}</span> ·
                fondo perduto:{" "}
                <span className="tnum text-ink">{fmtEurCompact(res.grantEur)}</span>
              </div>
              <Link
                href="/calcolatore"
                className="mt-3 inline-block text-sm text-accent underline underline-offset-2"
              >
                Cambia periodo e denominatore →
              </Link>
            </Panel>
            <p className="text-xs text-ink-faint">
              Come calcoliamo questo numero:{" "}
              <Link href="/fonti" className="underline">
                Fonti e metodo
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* -------- stato dati -------- */}
      {!hasData && (
        <div className="mx-auto max-w-6xl px-5 pt-8">
          <Callout tone="warn" title="Portale in allestimento">
            Il database non è ancora collegato o è vuoto. La struttura è pronta: appena
            caricato il dataset Kiel e le dotazioni UE, i numeri compaiono ovunque.
            {isDbConfigured() ? " (Supabase configurato, tabelle vuote.)" : " (Supabase non configurato.)"}
          </Callout>
        </div>
      )}

      {/* -------- sezioni -------- */}
      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-lg border border-line bg-bg-panel p-5 transition-colors hover:border-line-strong"
            >
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* -------- legenda affidabilità -------- */}
      <section className="border-t border-line bg-bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
            Come leggiamo l&apos;affidabilità di ogni cifra
          </h2>
          <div className="mt-4 max-w-3xl">
            <ReliabilityLegend />
          </div>
        </div>
      </section>
    </div>
  );
}
