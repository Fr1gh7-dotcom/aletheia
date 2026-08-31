import Link from "next/link";
import { REPO_URL, SITE_CONTACT_EMAIL, SITE_MAINTAINER } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line-strong bg-bg-panel text-sm text-ink-soft">
      <div className="mx-auto max-w-6xl px-5 py-10 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="font-semibold text-ink">Cos&apos;è Aletheia</p>
            <p className="max-w-prose">
              Aletheia aggrega dati pubblici (OSINT) da fonti istituzionali e di ricerca per
              stimare quanto il sostegno all&apos;Ucraina pesa su un contribuente italiano. Non
              pubblica documenti riservati. Ogni cifra riporta la fonte primaria e indica se è
              un <strong>dato esatto</strong> o una <strong>stima</strong>; i prestiti non sono
              equiparati al fondo perduto.
            </p>
            <p className="text-ink-faint">
              Metodologia completa, fonti e limiti dei dati:{" "}
              <Link href="/fonti" className="underline hover:text-ink">
                Fonti e metodo
              </Link>
              .
            </p>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-ink">Gestione e trasparenza</p>
            <p>
              Progetto indipendente, curato da {SITE_MAINTAINER}.
              {SITE_CONTACT_EMAIL ? (
                <>
                  {" "}
                  Contatto:{" "}
                  <a href={`mailto:${SITE_CONTACT_EMAIL}`} className="underline hover:text-ink">
                    {SITE_CONTACT_EMAIL}
                  </a>
                  .
                </>
              ) : null}
            </p>
            <p>
              <strong>Nessuna affiliazione.</strong> Aletheia non è affiliata né sostenuta da
              alcuna istituzione dell&apos;Unione Europea, dal Governo italiano o da alcun
              governo, partito o organizzazione. Non riceve finanziamenti legati ai temi
              trattati.
            </p>
            <p className="text-ink-faint">
              Codice sorgente e cronologia delle modifiche ai dati:{" "}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-ink"
              >
                GitHub
              </a>
              .
            </p>
          </div>
        </div>

        <p className="border-t border-line pt-4 text-xs text-ink-faint">
          I dati sono forniti «così come sono», senza garanzia di completezza o assenza di
          errori: verificare sempre sulla fonte primaria linkata accanto a ogni cifra. Ogni
          dataset resta soggetto alla licenza della fonte originale (Kiel Institute, Commissione
          europea, ISTAT, MEF e altre). © {year} Aletheia.
        </p>
      </div>
    </footer>
  );
}
