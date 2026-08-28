# Aletheia

Portale pubblico per la trasparenza sugli aiuti all'Ucraina (UE + bilaterali) e sul loro
costo pro-capite per i contribuenti italiani.

**Principio editoriale:** taglio neutro-dati. Ogni cifra pubblicata riporta la fonte
istituzionale primaria e indica se è un *dato esatto* o una *stima*. Prestiti e fondo
perduto restano sempre distinti.

MVP = **Modulo A: Tracciatore Flussi finanziari**. Modulo B (cronaca notizie) è fase 2.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4
- Supabase (Postgres + RLS, regione EU) — sola lettura pubblica
- Recharts (lazy-loaded) per Sankey e grafici
- Script di import in TypeScript (`tsx`)

## Setup

```bash
npm install
cp .env.example .env.local     # poi riempire con le chiavi Supabase
```

1. Creare un progetto Supabase (regione EU).
2. Nel Dashboard → SQL Editor: incollare ed eseguire `supabase/migrations/0001_init.sql`.
3. Riempire `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`).
4. Caricare i dati:
   ```bash
   npm run seed          # fonti, donatori, statistiche IT, dotazioni legislative UE
   # scaricare lo .xlsx Kiel in data/raw/ (vedi data/raw/README.md), poi:
   npm run import:kiel
   ```
5. `npm run dev`

Il sito è compilabile e navigabile **anche senza Supabase**: le pagine mostrano stati
vuoti finché i dati non sono caricati.

## Comandi

| comando | cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` | build di produzione |
| `npm run type-check` | `tsc --noEmit` |
| `npm run seed` | seed idempotente di tutto tranne Kiel |
| `npm run import:kiel` | import del dataset Kiel Ukraine Support Tracker |
| `npm run data:all` | `seed` + `import:kiel` |

## Struttura

```
app/                 pagine (Server Components)
  calcolatore/       calcolatore costo pro-capite (client interattivo)
  flussi/            Sankey origine → strumento → settore → tipo
  contratti/         beneficiari di appalti e sussidi
  industria/         portafoglio ordini industria difesa
  fonti/             metodologia, fonti, limiti — ancora di fiducia
components/          UI condivisa + grafici lazy
lib/                 calculator (TS puro), sankey, tipi, query Supabase, formato
scripts/             import (seed.ts, import-kiel.ts)
data/                JSON di seed + snapshot grezzi (data/raw/)
supabase/migrations/ schema SQL (applicare a mano nel Dashboard)
```

## Note sul modello

- `aid_flows.status` distingue **impegnato / allocato / erogato**.
- `aid_flows.reliability_tier`: `exact` (verde) / `aggregate_estimate` (giallo) /
  `military_estimate` (rosso).
- La quota italiana degli aiuti UE = Σ(aiuto UE × chiave contributo GNI ~12%). Chiave
  costante per ora — da rifinire per anno.
- Limiti noti elencati in `/fonti`.
