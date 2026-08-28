-- Aletheia — schema iniziale (Modulo A: Tracciatore Flussi finanziari)
-- Applicare manualmente: Supabase Dashboard -> SQL Editor -> incolla ed esegui.
-- Non usare la Supabase CLI per il push remoto (classifier lo blocca).

-- ============================================================================
-- Estensioni
-- ============================================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================================
-- sources — ogni fonte dati con nota metodologica
-- ============================================================================
create table if not exists public.sources (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,           -- 'kiel', 'eu-fts', 'ted', 'sipri', ...
  name              text not null,
  kind              text not null check (kind in ('dataset','database','registry','report','institutional')),
  url               text not null,
  measures          text,                           -- cosa MISURA esattamente
  estimates         text,                           -- cosa STIMA (e come)
  methodology_note  text,
  update_cadence    text,                           -- 'mensile', 'trimestrale', 'una tantum'
  last_updated      date,
  created_at        timestamptz not null default now()
);

-- ============================================================================
-- donors — paese o istituzione che eroga
-- ============================================================================
create table if not exists public.donors (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,                  -- 'italy', 'eu-commission', 'eu-council-epf'
  name        text not null,
  iso_code    text,                                  -- ISO-3166 alpha-2 per i paesi, null per istituzioni
  type        text not null check (type in ('country','eu_institution')),
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- aid_flows — fact table dei flussi di aiuto verso l'Ucraina
-- ============================================================================
create table if not exists public.aid_flows (
  id                uuid primary key default gen_random_uuid(),
  donor_id          uuid not null references public.donors(id),
  recipient         text not null default 'Ukraine',

  instrument        text not null check (instrument in (
                      'bilateral','ukraine_facility','epf','asap',
                      'macro_financial_assistance','other')),
  sector            text not null check (sector in (
                      'military','financial','humanitarian','reconstruction')),
  finance_type      text not null check (finance_type in (
                      'grant','loan','guarantee','in_kind')),
  status            text not null check (status in (
                      'committed','allocated','disbursed')),

  amount_eur        numeric(16,2) not null,
  amount_original   numeric(16,2),
  currency          text not null default 'EUR',
  fx_date           date,

  period_start      date not null,
  period_end        date not null,

  reliability_tier  text not null check (reliability_tier in (
                      'exact','aggregate_estimate','military_estimate')),

  source_id         uuid not null references public.sources(id),
  source_ref        text not null,                   -- id riga Kiel / notice TED / ecc.
  source_url        text,
  notes             text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (source_id, source_ref)
);

create index if not exists aid_flows_donor_idx   on public.aid_flows (donor_id);
create index if not exists aid_flows_period_idx  on public.aid_flows (period_start, period_end);
create index if not exists aid_flows_facets_idx  on public.aid_flows (sector, finance_type, status, reliability_tier);

-- ============================================================================
-- contractors — aziende beneficiarie
-- ============================================================================
create table if not exists public.contractors (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  country         text,
  sector          text check (sector in ('defense','construction','logistics','energy','ngo','other')),
  parent_company  text,
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- contracts — appalti / sussidi aggiudicati (TED, FTS, ASAP)
-- ============================================================================
create table if not exists public.contracts (
  id              uuid primary key default gen_random_uuid(),
  contractor_id   uuid references public.contractors(id),
  awarding_body   text not null,
  programme       text,                              -- 'ASAP', 'Ukraine Facility - Pillar II', ...
  amount_eur      numeric(16,2) not null,
  finance_type    text check (finance_type in ('grant','loan','guarantee','procurement')),
  award_date      date,
  cpv_code        text,                              -- classificazione appalto UE
  description     text,
  source_id       uuid references public.sources(id),
  source_ref      text not null,
  source_url      text,
  created_at      timestamptz not null default now(),
  unique (source_ref)
);

create index if not exists contracts_contractor_idx on public.contracts (contractor_id);

-- ============================================================================
-- country_stats — denominatori del calcolatore + quota bilancio UE
-- ============================================================================
create table if not exists public.country_stats (
  iso_code             text not null,
  year                 int  not null,
  population            bigint,                       -- popolazione residente
  employed_labor_force  bigint,                      -- occupati (proxy "contribuenti")
  irpef_taxpayers       bigint,                      -- dichiaranti IRPEF (solo IT)
  eu_gni_key_pct        numeric(6,4),                -- % contributo GNI al bilancio UE (0-100)
  population_source     text,
  employed_source       text,
  taxpayers_source      text,
  gni_key_source        text,
  primary key (iso_code, year)
);

-- ============================================================================
-- defense_industry_metrics — serie storiche industria difesa
-- ============================================================================
create table if not exists public.defense_industry_metrics (
  id                uuid primary key default gen_random_uuid(),
  company           text not null,
  country           text,
  period            text not null,                   -- 'FY2021', 'H1-2024', 'Q3-2024'
  period_end        date  not null,
  order_backlog_eur numeric(18,2),
  revenue_eur       numeric(18,2),
  metric_note       text,                            -- citazione testuale dal bilancio
  source_id         uuid references public.sources(id),
  source_url        text,
  created_at        timestamptz not null default now(),
  unique (company, period)
);

-- ============================================================================
-- RLS — portale pubblico in sola lettura
-- ============================================================================
alter table public.sources                  enable row level security;
alter table public.donors                   enable row level security;
alter table public.aid_flows                enable row level security;
alter table public.contractors              enable row level security;
alter table public.contracts                enable row level security;
alter table public.country_stats            enable row level security;
alter table public.defense_industry_metrics enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'sources','donors','aid_flows','contractors','contracts',
    'country_stats','defense_industry_metrics'
  ]
  loop
    execute format(
      'drop policy if exists "public_read_%1$s" on public.%1$s;', t);
    execute format(
      'create policy "public_read_%1$s" on public.%1$s for select using (true);', t);
  end loop;
end $$;

-- Nessuna policy di write: INSERT/UPDATE/DELETE passano solo dal service-role
-- (gli script di import), mai dal client anon.
