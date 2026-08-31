// URL pubblico canonico del sito, in un solo posto (metadataBase, sitemap, robots).
//
// Ordine di risoluzione:
//   1. NEXT_PUBLIC_SITE_URL  — da impostare a mano quando c'è un dominio custom
//   2. VERCEL_PROJECT_PRODUCTION_URL — il dominio di produzione, iniettato da Vercel
//      (anche nelle preview punta alla produzione: giusto per canonical/OG)
//   3. localhost — build ed esecuzione in locale
const raw =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_URL = raw.replace(/\/+$/, "");

export const SITE_NAME = "Aletheia";

export const REPO_URL = "https://github.com/Fr1gh7-dotcom/aletheia";

// --- Trasparenza / footer legale -------------------------------------------
// Chi gestisce il sito: un portale di trasparenza dovrebbe dichiararlo
// (credibilità + eventuale obbligo GDPR come titolare del trattamento).
// Sostituibile con il nome di un ente o un'associazione.
export const SITE_MAINTAINER = "Nicolò Masullo";
// Email di contatto pubblica. Vuota = la riga "Contatto" non compare.
// Consigliata una casella dedicata, non quella personale.
export const SITE_CONTACT_EMAIL = "";

/** Percorsi indicizzabili del sito, con priorità relativa per la sitemap. */
export const SITE_ROUTES: { path: string; priority: number; changeFrequency: "weekly" | "monthly" }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/calcolatore", priority: 0.9, changeFrequency: "weekly" },
  { path: "/flussi", priority: 0.8, changeFrequency: "weekly" },
  { path: "/fonti", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contratti", priority: 0.5, changeFrequency: "monthly" },
  { path: "/industria", priority: 0.5, changeFrequency: "monthly" },
];
