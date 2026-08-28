import Link from "next/link";

const NAV = [
  { href: "/calcolatore", label: "Calcolatore" },
  { href: "/flussi", label: "Flussi" },
  { href: "/contratti", label: "Contratti" },
  { href: "/industria", label: "Industria" },
  { href: "/fonti", label: "Fonti e metodo" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-line-strong bg-bg-panel">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
        <Link href="/" className="flex items-baseline gap-2 font-semibold tracking-tight">
          <span className="text-lg">Aletheia</span>
          <span className="hidden text-xs font-normal text-ink-faint sm:inline">
            aiuti Ucraina-UE
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink hover:underline">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
