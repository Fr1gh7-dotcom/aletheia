// Fetcher lato server. Se il DB non è configurato o è vuoto restituiscono
// strutture vuote, così il sito è compilabile e navigabile anche prima
// che Supabase sia collegato.
import { getSupabaseServer } from "./supabase/server";
import type {
  AidFlow,
  Contract,
  Contractor,
  CountryStats,
  DefenseIndustryMetric,
  Donor,
  Source,
} from "./types";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[queries] fallback:", (err as Error).message);
    }
    return fallback;
  }
}

export const isDbConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function getSources() {
  return safe<Source[]>(async () => {
    const sb = getSupabaseServer();
    const { data, error } = await sb.from("sources").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Source[];
  }, []);
}

export function getDonors() {
  return safe<Donor[]>(async () => {
    const sb = getSupabaseServer();
    const { data, error } = await sb.from("donors").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Donor[];
  }, []);
}

export function getAidFlows() {
  return safe<AidFlow[]>(async () => {
    const sb = getSupabaseServer();
    const { data, error } = await sb.from("aid_flows").select("*");
    if (error) throw error;
    return (data ?? []) as AidFlow[];
  }, []);
}

export function getContractors() {
  return safe<Contractor[]>(async () => {
    const sb = getSupabaseServer();
    const { data, error } = await sb.from("contractors").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Contractor[];
  }, []);
}

export function getContracts() {
  return safe<Contract[]>(async () => {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("contracts")
      .select("*")
      .order("amount_eur", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Contract[];
  }, []);
}

export function getCountryStats(iso = "IT") {
  return safe<CountryStats[]>(async () => {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("country_stats")
      .select("*")
      .eq("iso_code", iso)
      .order("year");
    if (error) throw error;
    return (data ?? []) as CountryStats[];
  }, []);
}

export function getIndustryMetrics() {
  return safe<DefenseIndustryMetric[]>(async () => {
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("defense_industry_metrics")
      .select("*")
      .order("period_end");
    if (error) throw error;
    return (data ?? []) as DefenseIndustryMetric[];
  }, []);
}

/** Mappa slug -> Source, comoda per collegare i badge alle fonti. */
export function sourceMap(sources: Source[]): Record<string, Source> {
  return Object.fromEntries(sources.map((s) => [s.slug, s]));
}
