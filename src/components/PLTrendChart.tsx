"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea,
} from "recharts";

export type PLChartData = {
  month: string;
  매출: number;
  매출원가: number;
  노무비: number;
  판관비: number;
  영업이익: number;
};

const COLORS = {
  매출: "#2563EB",
  매출원가: "#DC2626",
  노무비: "#EA580C",
  판관비: "#CA8A04",
  영업이익: "#16A34A",
};

function TooltipContent({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-6">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-medium tabular-nums">
            {entry.value.toLocaleString("ko-KR")}천원
          </span>
        </div>
      ))}
    </div>
  );
}

export function PLTrendChart({ data, selectedMonth }: { data: PLChartData[]; selectedMonth?: number | null }) {
  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 10, right: 24, left: 12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="month" tick={{ fontSize: 13 }} />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}M`}
          tick={{ fontSize: 12 }}
          width={52}
        />
        <Tooltip content={<TooltipContent />} />
        <Legend />
        {selectedMonth && (
          <ReferenceArea
            x1={`${selectedMonth}월`}
            x2={`${selectedMonth}월`}
            fill="#DBEAFE"
            fillOpacity={0.5}
          />
        )}
        <Bar dataKey="매출원가" stackId="cost" fill={COLORS.매출원가} />
        <Bar dataKey="노무비" stackId="cost" fill={COLORS.노무비} />
        <Bar dataKey="판관비" stackId="cost" fill={COLORS.판관비} radius={[3, 3, 0, 0]} />
        <Line dataKey="매출" stroke={COLORS.매출} strokeWidth={2.5} dot={{ r: 4 }} type="monotone" />
        <Line dataKey="영업이익" stroke={COLORS.영업이익} strokeWidth={2.5} dot={{ r: 4 }} type="monotone" strokeDasharray="6 3" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
