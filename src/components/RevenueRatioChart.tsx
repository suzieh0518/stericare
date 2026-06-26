"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";

export type RatioChartData = {
  month: string;
  매출원가율: number;
  노무비율: number;
  판관비율: number;
  영업이익률: number;
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
          <span className="font-medium tabular-nums">{entry.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueRatioChart({ data }: { data: RatioChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 24, left: 12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
        <XAxis dataKey="month" tick={{ fontSize: 13 }} />
        <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} width={45} />
        <Tooltip content={<TooltipContent />} />
        <Legend />
        <ReferenceLine y={100} stroke="#94A3B8" strokeDasharray="4 4" />
        <Bar dataKey="매출원가율" stackId="a" fill="#DC2626" />
        <Bar dataKey="노무비율" stackId="a" fill="#EA580C" />
        <Bar dataKey="판관비율" stackId="a" fill="#CA8A04" radius={[3, 3, 0, 0]} />
        <Line
          dataKey="영업이익률"
          stroke="#16A34A"
          strokeWidth={2.5}
          dot={{ r: 4 }}
          type="monotone"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
