import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line-strong bg-bg-panel text-sm text-ink-soft">
      <div className="mx-auto max-w-6xl px-5 py-8 space-y-3">
        <p className="max-w-2xl">
          Aletheia aggrega dati pubblici (OSINT) da fonti istituzionali e di ricerca. Non
          pubblica documenti riservati. Ogni cifra riporta la fonte primaria e indica se è
          un <strong>dato esatto</strong> o una <strong>stima</strong>.
        </p>
        <p className="text-ink-faint">
          Metodologia completa e limiti dei dati:{" "}
          <Link href="/fonti" className="underline hover:text-ink">
            Fonti e metodo
          </Link>
          . I prestiti non sono equiparati al fondo perduto: vengono mostrati separatamente.
        </p>
      </div>
    </footer>
  );
}
