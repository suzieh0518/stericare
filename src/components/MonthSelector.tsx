"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function MonthSelector({ months }: { months: number[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const current = searchParams.get("month") ? parseInt(searchParams.get("month")!) : null;

  function select(m: number | null) {
    const p = new URLSearchParams(searchParams.toString());
    if (m === null) p.delete("month");
    else p.set("month", String(m));
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      <button
        onClick={() => select(null)}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
          current === null
            ? "bg-white text-slate-900"
            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
        }`}
      >
        전체
      </button>
      {months.map((m) => (
        <button
          key={m}
          onClick={() => select(m)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            current === m
              ? "bg-white text-slate-900"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          {m}월
        </button>
      ))}
    </div>
  );
}
