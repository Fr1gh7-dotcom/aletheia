"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { fmtEurCompact } from "@/lib/format";

export interface IndustryPoint {
  period: string;
  [company: string]: string | number | null;
}

const PALETTE = ["#2f4a6b", "#7a5c3e", "#4a6b2f", "#6b2f4a"];

export default function IndustryChartInner({
  data,
  companies,
}: {
  data: IndustryPoint[];
  companies: string[];
}) {
  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--ink-soft)" }}
            tickFormatter={(v) => fmtEurCompact(Number(v as number))}
            width={70}
          />
          <Tooltip
            formatter={(v) => fmtEurCompact(Number(v as number))}
            contentStyle={{
              background: "var(--bg-panel)",
              border: "1px solid var(--line-strong)",
              borderRadius: 6,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {companies.map((c, i) => (
            <Bar key={c} dataKey={c} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
