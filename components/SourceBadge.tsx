import { RELIABILITY } from "@/lib/reliability";
import type { ReliabilityTier } from "@/lib/types";

/**
 * Pallino colorato (tier di affidabilità) + link alla fonte primaria.
 * Da usare accanto a OGNI cifra pubblicata.
 */
export function SourceBadge({
  tier,
  sourceName,
  sourceUrl,
  className = "",
}: {
  tier: ReliabilityTier;
  sourceName: string;
  sourceUrl?: string | null;
  className?: string;
}) {
  const t = RELIABILITY[tier];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-ink-faint ${className}`}>
      <span
        className={`inline-block h-2 w-2 shrink-0 rounded-full ${t.dot}`}
        title={t.label}
        aria-hidden
      />
      <span className="sr-only">{t.label}: </span>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-ink"
        >
          {sourceName}
        </a>
      ) : (
        <span>{sourceName}</span>
      )}
    </span>
  );
}
