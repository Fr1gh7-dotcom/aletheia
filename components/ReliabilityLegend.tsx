import { RELIABILITY, TIER_ORDER } from "@/lib/reliability";

export function ReliabilityLegend({ compact = false }: { compact?: boolean }) {
  return (
    <dl
      className={
        compact
          ? "flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft"
          : "space-y-2 text-sm"
      }
    >
      {TIER_ORDER.map((tier) => {
        const t = RELIABILITY[tier];
        return (
          <div key={tier} className={compact ? "flex items-center gap-1.5" : "flex gap-2.5"}>
            <span
              className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${t.dot}`}
              aria-hidden
            />
            <div>
              <dt className="inline font-medium text-ink">{t.label}</dt>
              {!compact && (
                <dd className="text-ink-soft">{t.description}</dd>
              )}
            </div>
          </div>
        );
      })}
    </dl>
  );
}
