import type { SankeyGraph } from "@/lib/sankey";
import FlowsSankeyChart from "./FlowsSankeyChart";

// Il Sankey è il contenuto principale di /flussi, quindi resa diretta (anche SSR:
// l'SVG finisce nell'HTML — utile per screen reader, no-JS e indicizzazione).
// Il layout è d3-sankey (~5 KB, sincrono): non serve il dynamic()+LazyOnView
// usato per i grafici recharts, più pesanti e secondari.
export function FlowsSankey({ graph }: { graph: SankeyGraph }) {
  if (!graph.nodes.length || !graph.links.length) {
    return (
      <div className="rounded-lg border border-line bg-bg-subtle px-4 py-10 text-center text-sm text-ink-faint">
        Nessun flusso da visualizzare con i filtri correnti.
      </div>
    );
  }
  return <FlowsSankeyChart graph={graph} />;
}
