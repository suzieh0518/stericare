import { fmtKRW, fmtPct } from "@/lib/format";

type Props = {
  label: string;
  value: number;
  prevValue?: number;
  unit?: "krw" | "pct";
  higherIsBetter?: boolean;
};

export function KpiCard({ label, value, prevValue, unit = "krw", higherIsBetter = true }: Props) {
  const diff = prevValue !== undefined ? value - prevValue : null;
  const diffPct = prevValue && prevValue !== 0 ? (diff! / Math.abs(prevValue)) * 100 : null;
  const isUp = diff !== null && diff > 0;
  const isGood = higherIsBetter ? isUp : !isUp;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${value < 0 ? "text-red-600" : "text-gray-900"}`}>
        {unit === "pct" ? fmtPct(value) : fmtKRW(value)}
        {unit === "krw" && (
          <span className="ml-1 text-sm font-normal text-gray-400">천원</span>
        )}
      </p>
      {diff !== null && diffPct !== null && (
        <p className={`mt-1 text-sm font-medium ${isGood ? "text-emerald-600" : "text-red-500"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(diffPct).toFixed(1)}%
          <span className="ml-1 font-normal text-gray-400">전월比</span>
        </p>
      )}
    </div>
  );
}
