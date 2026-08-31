import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { CalculatorClient } from "@/components/CalculatorClient";
import { getAidFlows, getCountryStats, getDonors } from "@/lib/queries";
import { buildCalcInputs, YEAR_MAX, YEAR_MIN } from "@/lib/calc-inputs";

export const metadata: Metadata = {
  title: "Calcolatore costo pro-capite",
  description:
    "Stima quanto è costato a un contribuente italiano il sostegno all'Ucraina, con denominatore selezionabile e prestiti separati dal fondo perduto.",
};

// Dinamico: rilegge i flussi da Supabase a ogni richiesta (vedi nota in app/page.tsx).
export const dynamic = "force-dynamic";

export default async function CalcolatorePage() {
  const [flows, donors, stats] = await Promise.all([
    getAidFlows(),
    getDonors(),
    getCountryStats("IT"),
  ]);

  const inputs = buildCalcInputs(flows, donors, stats);
  const statSources = stats.map((s) => ({
    year: s.year,
    population_source: s.population_source,
    employed_source: s.employed_source,
    taxpayers_source: s.taxpayers_source,
    gni_key_source: s.gni_key_source,
  }));

  return (
    <>
      <PageHeader
        title="Calcolatore costo pro-capite"
        lead="Il costo del sostegno all'Ucraina diviso per la popolazione, gli occupati o i dichiaranti IRPEF italiani. Scegli il periodo, lo stato del flusso e quanti prestiti assumi verranno rimborsati."
      />
      <div className="mx-auto max-w-6xl px-5 py-8">
        <CalculatorClient
          inputs={inputs}
          statSources={statSources}
          yearMin={YEAR_MIN}
          yearMax={YEAR_MAX}
        />
      </div>
    </>
  );
}
