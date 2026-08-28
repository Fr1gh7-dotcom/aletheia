"use client";

import dynamic from "next/dynamic";
import type { SankeyGraph } from "@/lib/sankey";
import { LazyOnView } from "./LazyOnView";

// recharts fuori dal bundle iniziale: caricato solo quando il grafico è in vista.
const FlowsSankeyChart = dynamic(() => import("./FlowsSankeyChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded-lg border border-line bg-bg-subtle text-sm text-ink-faint">
      Grafico in caricamento…
    </div>
  ),
});

export function FlowsSankey({ graph }: { graph: SankeyGraph }) {
  if (!graph.nodes.length || !graph.links.length) {
    return (
      <div className="rounded-lg border border-line bg-bg-subtle px-4 py-10 text-center text-sm text-ink-faint">
        Nessun flusso da visualizzare con i filtri correnti.
      </div>
    );
  }
  return (
    <LazyOnView minHeight={Math.max(360, graph.nodes.length * 24)}>
      <FlowsSankeyChart graph={graph} />
    </LazyOnView>
  );
}
