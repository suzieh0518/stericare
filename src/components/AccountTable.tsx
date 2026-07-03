"use client";

import { useState, useMemo } from "react";
import { fmtKRW } from "@/lib/format";
import type { AccountDetail } from "@/lib/queries";

const CATEGORIES = ["전체", "매출", "매출원가", "노무비", "판관비", "섬유자산", "자산"];
const MONTHS = [1, 2, 3, 4, 5];

type Props = { data: AccountDetail[]; selectedMonth?: number | null };

export function AccountTable({ data, selectedMonth }: Props) {
  const [category, setCategory] = useState("전체");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return data.filter((row) => {
      if (category !== "전체" && row.majorCategory !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          row.majorCategory?.toLowerCase().includes(q) ||
          row.midCategory?.toLowerCase().includes(q) ||
          row.minorCategory?.toLowerCase().includes(q) ||
          row.counterparty?.toLowerCase().includes(q) ||
          row.detail?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, category, search]);

  const subtotals = useMemo(() => {
    const totals: Record<number, number> = {};
    let grandTotal = 0;
    for (const m of MONTHS) {
      totals[m] = filtered.reduce((s, r) => s + (r.months[m] ?? 0), 0);
      grandTotal += totals[m];
    }
    return { totals, grandTotal };
  }, [filtered]);

  function colCls(m: number) {
    return selectedMonth === m
      ? "bg-blue-50 text-blue-900 font-semibold"
      : "text-gray-700";
  }
  function thCls(m: number) {
    return selectedMonth === m
      ? "px-3 py-2 text-right font-semibold w-24 bg-blue-100 text-blue-800"
      : "px-3 py-2 text-right font-medium w-24";
  }
  function footCls(m: number) {
    return selectedMonth === m
      ? "px-3 py-2 text-right tabular-nums bg-blue-800"
      : "px-3 py-2 text-right tabular-nums";
  }

  return (
    <div>
      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                category === c
                  ? "bg-slate-800 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ml-auto px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-medium w-20">대분류</th>
              <th className="px-3 py-2 text-left font-medium w-28">중분류</th>
              <th className="px-3 py-2 text-left font-medium w-24">소분류</th>
              <th className="px-3 py-2 text-left font-medium w-28">거래처</th>
              <th className="px-3 py-2 text-left font-medium">상세내역</th>
              {MONTHS.map((m) => (
                <th key={m} className={thCls(m)}>{m}월</th>
              ))}
              <th className="px-3 py-2 text-right font-medium w-28 bg-gray-100">합계</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700 font-medium text-xs">{row.majorCategory}</td>
                <td className="px-3 py-2 text-gray-600 text-xs">{row.midCategory}</td>
                <td className="px-3 py-2 text-gray-600 text-xs">{row.minorCategory}</td>
                <td className="px-3 py-2 text-gray-600 text-xs">{row.counterparty}</td>
                <td className="px-3 py-2 text-gray-800">{row.detail}</td>
                {MONTHS.map((m) => (
                  <td key={m} className={`px-3 py-2 text-right tabular-nums ${colCls(m)}`}>
                    {row.months[m] !== undefined ? fmtKRW(row.months[m]) : "-"}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-900 bg-gray-50">
                  {fmtKRW(row.yearTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800 text-white font-semibold text-xs">
              <td colSpan={5} className="px-3 py-2">소계 ({filtered.length}건)</td>
              {MONTHS.map((m) => (
                <td key={m} className={footCls(m)}>
                  {fmtKRW(subtotals.totals[m] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right tabular-nums">
                {fmtKRW(subtotals.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-gray-400 text-right">단위: 천원</p>
    </div>
  );
}
