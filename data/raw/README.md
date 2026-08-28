# data/raw — snapshot grezzi delle fonti

Qui vanno i file scaricati dalle fonti primarie, **committati nel repo** per
riproducibilità (chiunque deve poter rieseguire l'import e ottenere gli stessi numeri).

## Kiel Ukraine Support Tracker

- **File atteso:** `kiel-ukraine-support-tracker.xlsx`
- **Dove scaricarlo:** https://www.kielinstitut.de/publications/ukraine-support-tracker-data-6453
  → sezione "Data set" → file `.xlsx`
- Rinominare il file scaricato in `kiel-ukraine-support-tracker.xlsx` e metterlo in questa cartella.
- Poi: `npm run import:kiel`

Lo script legge i fogli `Country Summary` e (se presente) `Bilateral Assistance, Detail`.
Se la struttura del foglio cambia, aggiornare la mappatura in `scripts/import-kiel.ts`
(le costanti in cima al file).

## ASAP (elenco progetti finanziati)

- **File atteso:** `asap-awarded-projects.pdf`
- **Dove:** cercare "EU ASAP programme awarded projects" sul sito della Commissione
  (DG DEFIS). Trascrivere l'elenco in `../asap-awards.json`.
