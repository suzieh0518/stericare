"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { fmtKRW } from "@/lib/format";

export type MidBreakdownData = {
  major: string;
  slices: { name: string; value: number }[];
};

const COLORS = [
  "#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626",
  "#0891B2", "#BE185D", "#65A30D", "#EA580C", "#0284C7",
  "#9333EA", "#15803D", "#B45309", "#0E7490", "#9F1239",
];

const THRESHOLD = 0.05;

function groupSlices(slices: { name: string; value: number }[]) {
  const total = slices.reduce((s, d) => s + d.value, 0);
  if (total === 0) return { displaySlices: [], total: 0 };
  const significant = slices.filter((d) => d.value / total >= THRESHOLD);
  const otherTotal = slices
    .filter((d) => d.value / total < THRESHOLD)
    .reduce((s, d) => s + d.value, 0);
  const displaySlices =
    otherTotal > 0 ? [...significant, { name: "기타", value: otherTotal }] : significant;
  return { displaySlices, total };
}

function PieTooltipContent({ active, payload }: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { pct: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const e = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 shadow text-xs">
      <p className="font-semibold text-gray-800">{e.name}</p>
      <p className="text-gray-600">
        {fmtKRW(e.value)}천원{" "}
        <span className="text-gray-400">({e.payload.pct}%)</span>
      </p>
    </div>
  );
}

function PieCard({ major, slices }: MidBreakdownData) {
  const { displaySlices, total } = groupSlices(slices);
  const withPct = displaySlices.map((d) => ({
    ...d,
    pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0",
  }));

  if (withPct.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-center text-sm text-gray-400">
        데이터 없음
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">
        {major} 중분류 구성
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={withPct}
            dataKey="value"
            cx="38%"
            cy="50%"
            outerRadius={88}
            innerRadius={52}
            paddingAngle={2}
          >
            {withPct.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltipContent />} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            iconType="circle"
            iconSize={8}
            formatter={(value, entry: any) => (
              <span className="text-xs text-gray-700">
                {value}{" "}
                <span className="text-gray-400 tabular-nums">{entry.payload?.pct}%</span>
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MidCategoryPieCharts({ data }: { data: MidBreakdownData[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {data.map((d) => (
        <PieCard key={d.major} {...d} />
      ))}
    </div>
  );
}
