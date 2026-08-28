import type { CalcInputs } from "./calculator";
import type { AidFlow, CountryStats, Donor } from "./types";

/** Costruisce gli input del calcolatore dai dati grezzi caricati lato server. */
export function buildCalcInputs(
  flows: AidFlow[],
  donors: Donor[],
  stats: CountryStats[],
): CalcInputs {
  const italyDonorIds = donors
    .filter(
      (d) =>
        d.type === "country" &&
        (d.iso_code === "IT" || /ital(y|ia)/i.test(d.name) || /ital(y|ia)/i.test(d.slug)),
    )
    .map((d) => d.id);

  const euInstitutionDonorIds = donors
    .filter((d) => d.type === "eu_institution")
    .map((d) => d.id);

  const statsByYear: Record<number, CountryStats> = Object.fromEntries(
    stats.map((s) => [s.year, s]),
  );

  return { flows, italyDonorIds, euInstitutionDonorIds, statsByYear };
}

export const YEAR_MIN = 2022;
export const YEAR_MAX = new Date().getFullYear();
