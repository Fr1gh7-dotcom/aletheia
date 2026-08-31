"use client";

import { useMemo } from "react";
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  type SankeyNodeMinimal,
  type SankeyLinkMinimal,
} from "d3-sankey";
import type { SankeyGraph } from "@/lib/sankey";
import type { ReliabilityTier } from "@/lib/types";
import { fmtEurCompact } from "@/lib/format";

// Layout con d3-sankey (deterministico) + rendering SVG a mano.
// Sostituisce recharts <Sankey>, che con React 19 blocca il main thread
// anche su grafi minuscoli (13 nodi / 16 link).

type NodeExtra = { name: string; layer: number };
type LinkExtra = {
  source: number;
  target: number;
  value: number;
  tier: ReliabilityTier;
  color: string;
};
type SNode = SankeyNodeMinimal<NodeExtra, LinkExtra> & NodeExtra;
type SLink = SankeyLinkMinimal<NodeExtra, LinkExtra> & LinkExtra;

const MARGIN = { top: 14, right: 168, bottom: 14, left: 116 };
const NODE_WIDTH = 10;
const NODE_PADDING = 22;
const WIDTH = 900;

export default function FlowsSankeyChart({ graph }: { graph: SankeyGraph }) {
  const height = Math.max(360, graph.nodes.length * 30);

  const { nodes, links, maxDepth } = useMemo(() => {
    const layout = d3Sankey<NodeExtra, LinkExtra>()
      .nodeWidth(NODE_WIDTH)
      .nodePadding(NODE_PADDING)
      .extent([
        [MARGIN.left, MARGIN.top],
        [WIDTH - MARGIN.right, height - MARGIN.bottom],
      ]);
    const g = layout({
      nodes: graph.nodes.map((n) => ({ ...n })),
      links: graph.links.map((l) => ({ ...l })),
    }) as { nodes: SNode[]; links: SLink[] };
    return { ...g, maxDepth: Math.max(...g.nodes.map((n) => n.depth ?? 0)) };
  }, [graph, height]);

  const path = sankeyLinkHorizontal<NodeExtra, LinkExtra>();

  return (
    <div className="overflow-x-auto">
      <svg
        width={WIDTH}
        height={height}
        style={{ minWidth: 680 }}
        role="img"
        aria-label="Diagramma di Sankey: origine, strumento, settore e tipo di finanziamento degli aiuti all'Ucraina"
      >
        <g strokeOpacity={0.33}>
          {links.map((link, i) => (
            <path
              key={i}
              d={path(link) ?? undefined}
              fill="none"
              stroke={link.color}
              strokeWidth={Math.max(1, link.width ?? 1)}
            >
              <title>
                {`${nodeName(link.source)} → ${nodeName(link.target)}: ${fmtEurCompact(link.value)}`}
              </title>
            </path>
          ))}
        </g>

        <g>
          {nodes.map((node, i) => {
            const x0 = node.x0 ?? 0;
            const x1 = node.x1 ?? 0;
            const y0 = node.y0 ?? 0;
            const y1 = node.y1 ?? 0;
            const depth = node.depth ?? 0;

            // Colonna 0 → etichetta a sinistra (nel margine); ultima colonna →
            // a destra (nel margine); colonne di mezzo → sopra il nodo, così
            // non si sovrappongono ai nastri.
            let tx: number;
            let ty: number;
            let anchor: "start" | "end" | "middle";
            if (depth === 0) {
              tx = x0 - 6;
              ty = (y0 + y1) / 2;
              anchor = "end";
            } else if (depth === maxDepth) {
              tx = x1 + 6;
              ty = (y0 + y1) / 2;
              anchor = "start";
            } else {
              tx = (x0 + x1) / 2;
              ty = y0 - 6;
              anchor = "middle";
            }

            return (
              <g key={i}>
                <rect
                  x={x0}
                  y={y0}
                  width={Math.max(1, x1 - x0)}
                  height={Math.max(1, y1 - y0)}
                  fill="var(--ink-faint)"
                  fillOpacity={0.6}
                >
                  <title>{`${node.name}: ${fmtEurCompact(node.value ?? 0)}`}</title>
                </rect>
                <text
                  x={tx}
                  y={ty}
                  textAnchor={anchor}
                  dominantBaseline={depth === 0 || depth === maxDepth ? "middle" : "auto"}
                  fontSize={12}
                  fill="var(--ink)"
                  stroke="var(--bg-panel)"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function nodeName(end: SLink["source"]): string {
  return typeof end === "object" && end !== null && "name" in end
    ? (end as SNode).name
    : String(end);
}
