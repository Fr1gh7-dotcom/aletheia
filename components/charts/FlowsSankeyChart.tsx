"use client";

import { Sankey, Tooltip, Rectangle, Layer } from "recharts";
import type { SankeyGraph } from "@/lib/sankey";
import { fmtEurCompact } from "@/lib/format";

type NodeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  containerWidth?: number;
  payload?: { name?: string };
};

function SankeyNode({ x = 0, y = 0, width = 0, height = 0, containerWidth = 900, payload }: NodeProps) {
  const isRight = x + width > containerWidth - 150;
  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={Math.max(height, 1)}
        fill="var(--ink-faint)"
        fillOpacity={0.55}
      />
      <text
        x={isRight ? x - 6 : x + width + 6}
        y={y + height / 2}
        textAnchor={isRight ? "end" : "start"}
        dominantBaseline="middle"
        fontSize={12}
        fill="var(--ink)"
      >
        {payload?.name}
      </text>
    </Layer>
  );
}

type LinkProps = {
  sourceX?: number;
  targetX?: number;
  sourceY?: number;
  targetY?: number;
  sourceControlX?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: { color?: string };
};

function SankeyLink({
  sourceX = 0,
  targetX = 0,
  sourceY = 0,
  targetY = 0,
  sourceControlX = 0,
  targetControlX = 0,
  linkWidth = 0,
  payload,
}: LinkProps) {
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      stroke={payload?.color ?? "var(--ink-faint)"}
      strokeWidth={Math.max(linkWidth, 1)}
      strokeOpacity={0.32}
      fill="none"
    />
  );
}

export default function FlowsSankeyChart({ graph }: { graph: SankeyGraph }) {
  const width = 900;
  const height = Math.max(360, graph.nodes.length * 24);

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 680 }}>
        <Sankey
          width={width}
          height={height}
          data={graph}
          nodePadding={24}
          nodeWidth={10}
          linkCurvature={0.5}
          iterations={64}
          node={<SankeyNode containerWidth={width} />}
          link={<SankeyLink />}
          margin={{ top: 12, right: 150, bottom: 12, left: 95 }}
        >
          <Tooltip
            formatter={(v) => fmtEurCompact(Number(v as number))}
            contentStyle={{
              background: "var(--bg-panel)",
              border: "1px solid var(--line-strong)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
        </Sankey>
      </div>
    </div>
  );
}
