"use client";

import dynamic from "next/dynamic";
import { LazyOnView } from "./LazyOnView";
import type { IndustryPoint } from "./IndustryChartInner";

export type { IndustryPoint };

const IndustryChartInner = dynamic(() => import("./IndustryChartInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[380px] items-center justify-center rounded-lg border border-line bg-bg-subtle text-sm text-ink-faint">
      Grafico in caricamento…
    </div>
  ),
});

export function IndustryChart({
  data,
  companies,
}: {
  data: IndustryPoint[];
  companies: string[];
}) {
  if (!data.length) return null;
  return (
    <LazyOnView minHeight={380}>
      <IndustryChartInner data={data} companies={companies} />
    </LazyOnView>
  );
}
