import type { ReactNode } from "react";
import Link from "next/link";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-line bg-bg-panel p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Callout({
  title,
  children,
  tone = "neutral",
}: {
  title?: string;
  children: ReactNode;
  tone?: "neutral" | "warn";
}) {
  const border = tone === "warn" ? "border-l-tier-aggregate" : "border-l-accent";
  return (
    <div className={`border-l-2 ${border} bg-bg-subtle px-4 py-3 text-sm text-ink-soft`}>
      {title && <p className="mb-1 font-medium text-ink">{title}</p>}
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <Panel className="text-center">
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-soft">{children}</div>}
      <p className="mt-3 text-xs text-ink-faint">
        Metodologia e fonti:{" "}
        <Link href="/fonti" className="underline">
          Fonti e metodo
        </Link>
        .
      </p>
    </Panel>
  );
}

export function PageHeader({
  title,
  lead,
}: {
  title: string;
  lead?: ReactNode;
}) {
  return (
    <div className="border-b border-line bg-bg-panel">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {lead && <p className="mt-2 max-w-2xl text-ink-soft">{lead}</p>}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="tnum mt-0.5 text-xl text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-soft">{sub}</div>}
    </div>
  );
}
