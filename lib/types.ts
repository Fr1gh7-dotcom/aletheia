// Tipi condivisi — rispecchiano lo schema in supabase/migrations/0001_init.sql

export type Instrument =
  | "bilateral"
  | "ukraine_facility"
  | "epf"
  | "asap"
  | "macro_financial_assistance"
  | "other";

export type Sector = "military" | "financial" | "humanitarian" | "reconstruction";

export type FinanceType = "grant" | "loan" | "guarantee" | "in_kind";

export type FlowStatus = "committed" | "allocated" | "disbursed";

export type ReliabilityTier = "exact" | "aggregate_estimate" | "military_estimate";

export interface Source {
  id: string;
  slug: string;
  name: string;
  kind: "dataset" | "database" | "registry" | "report" | "institutional";
  url: string;
  measures: string | null;
  estimates: string | null;
  methodology_note: string | null;
  update_cadence: string | null;
  last_updated: string | null;
}

export interface Donor {
  id: string;
  slug: string;
  name: string;
  iso_code: string | null;
  type: "country" | "eu_institution";
}

export interface AidFlow {
  id: string;
  donor_id: string;
  recipient: string;
  instrument: Instrument;
  sector: Sector;
  finance_type: FinanceType;
  status: FlowStatus;
  amount_eur: number;
  amount_original: number | null;
  currency: string;
  fx_date: string | null;
  period_start: string;
  period_end: string;
  reliability_tier: ReliabilityTier;
  source_id: string;
  source_ref: string;
  source_url: string | null;
  notes: string | null;
}

export interface Contractor {
  id: string;
  slug: string;
  name: string;
  country: string | null;
  sector: "defense" | "construction" | "logistics" | "energy" | "ngo" | "other" | null;
  parent_company: string | null;
}

export interface Contract {
  id: string;
  contractor_id: string | null;
  awarding_body: string;
  programme: string | null;
  amount_eur: number;
  finance_type: "grant" | "loan" | "guarantee" | "procurement" | null;
  award_date: string | null;
  cpv_code: string | null;
  description: string | null;
  source_id: string | null;
  source_ref: string;
  source_url: string | null;
}

export interface CountryStats {
  iso_code: string;
  year: number;
  population: number | null;
  employed_labor_force: number | null;
  irpef_taxpayers: number | null;
  eu_gni_key_pct: number | null;
  population_source: string | null;
  employed_source: string | null;
  taxpayers_source: string | null;
  gni_key_source: string | null;
}

export interface DefenseIndustryMetric {
  id: string;
  company: string;
  country: string | null;
  period: string;
  period_end: string;
  order_backlog_eur: number | null;
  revenue_eur: number | null;
  metric_note: string | null;
  source_id: string | null;
  source_url: string | null;
}
