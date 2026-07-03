import { Suspense } from "react";
import { getPLSummary, getAccountDetails } from "@/lib/queries";
import { fmtKRW, fmtPct } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { PLTrendChart, type PLChartData } from "@/components/PLTrendChart";
import { RevenueRatioChart, type RatioChartData } from "@/components/RevenueRatioChart";
import { AccountTable } from "@/components/AccountTable";
import { MonthSelector } from "@/components/MonthSelector";

const YEAR = 2026;

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function Dashboard({ searchParams }: Props) {
  const params = await searchParams;
  const selectedMonth = params.month ? parseInt(params.month) : null;

  const [plSummary, accountDetails] = await Promise.all([
    getPLSummary(YEAR),
    getAccountDetails(YEAR),
  ]);

  const availableMonths = plSummary.map((m) => m.month);

  // KPI 데이터 결정
  type KpiRow = {
    revenue: number;
    costOfSales: number;
    laborCost: number;
    gyeongbi: number;
    sgaExpense: number;
    operatingProfit: number;
    operatingMargin: number;
  };

  let kpi: KpiRow;
  let kpiPrev: KpiRow | undefined;
  let kpiLabel: string;
  const isYtd = selectedMonth === null;

  if (selectedMonth !== null) {
    const cur = plSummary.find((m) => m.month === selectedMonth);
    const prevM = plSummary.find((m) => m.month === selectedMonth - 1);
    kpi = cur ?? { revenue: 0, costOfSales: 0, laborCost: 0, gyeongbi: 0, sgaExpense: 0, operatingProfit: 0, operatingMargin: 0 };
    kpiPrev = prevM;
    kpiLabel = `${selectedMonth}월 실적`;
  } else {
    const ytd = plSummary.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.revenue,
        costOfSales: acc.costOfSales + m.costOfSales,
        laborCost: acc.laborCost + m.laborCost,
        gyeongbi: acc.gyeongbi + m.gyeongbi,
        sgaExpense: acc.sgaExpense + m.sgaExpense,
        operatingProfit: acc.operatingProfit + m.operatingProfit,
        operatingMargin: 0,
      }),
      { revenue: 0, costOfSales: 0, laborCost: 0, gyeongbi: 0, sgaExpense: 0, operatingProfit: 0, operatingMargin: 0 }
    );
    ytd.operatingMargin = ytd.revenue > 0 ? (ytd.operatingProfit / ytd.revenue) * 100 : 0;
    kpi = ytd;
    kpiLabel = `${YEAR}년 누계 (1~${availableMonths.at(-1)}월)`;
  }

  // 대분류 구성 패널 기준 월 (선택 없으면 마지막 월)
  const refMonth = selectedMonth ?? plSummary.at(-1)?.month ?? 1;
  const refData = plSummary.find((m) => m.month === refMonth) ?? plSummary.at(-1);

  // 차트 데이터
  const plChartData: PLChartData[] = plSummary.map((m) => ({
    month: `${m.month}월`,
    매출: Math.round(m.revenue / 1000),
    매출원가: Math.round(m.costOfSales / 1000),
    노무비: Math.round(m.laborCost / 1000),
    경비: Math.round(m.gyeongbi / 1000),
    판관비: Math.round(m.sgaExpense / 1000),
    영업이익: Math.round(m.operatingProfit / 1000),
  }));

  const ratioChartData: RatioChartData[] = plSummary.map((m) => {
    const rev = m.revenue || 1;
    return {
      month: `${m.month}월`,
      매출원가율: +((m.costOfSales / rev) * 100).toFixed(1),
      노무비율: +((m.laborCost / rev) * 100).toFixed(1),
      경비율: +((m.gyeongbi / rev) * 100).toFixed(1),
      판관비율: +((m.sgaExpense / rev) * 100).toFixed(1),
      영업이익률: +((m.operatingProfit / rev) * 100).toFixed(1),
    };
  });

  const categoryRows = [
    { label: "매출", value: isYtd ? kpi.revenue : (refData?.revenue ?? 0), cost: false },
    { label: "매출원가", value: isYtd ? kpi.costOfSales : (refData?.costOfSales ?? 0), cost: true },
    { label: "노무비", value: isYtd ? kpi.laborCost : (refData?.laborCost ?? 0), cost: true },
    { label: "경비", value: isYtd ? kpi.gyeongbi : (refData?.gyeongbi ?? 0), cost: true },
    { label: "판관비", value: isYtd ? kpi.sgaExpense : (refData?.sgaExpense ?? 0), cost: true },
    { label: "영업이익", value: isYtd ? kpi.operatingProfit : (refData?.operatingProfit ?? 0), cost: false },
  ];

  const categoryBase = categoryRows[0].value || 1;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-slate-900 text-white px-8 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">스테리케어 대시보드</h1>
            <p className="text-slate-400 text-sm">{YEAR}년 손익 · 원가 분석</p>
          </div>
          <div className="flex items-center gap-4">
            <Suspense>
              <MonthSelector months={availableMonths} />
            </Suspense>
            <a
              href="/upload"
              className="px-3 py-1.5 text-sm font-medium bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors whitespace-nowrap"
            >
              + 데이터 업로드
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-8 py-8 space-y-8">

        {/* KPI 카드 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {kpiLabel}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              label="매출"
              value={kpi.revenue}
              prevValue={kpiPrev?.revenue}
              higherIsBetter
            />
            <KpiCard
              label="매출원가"
              value={kpi.costOfSales}
              prevValue={kpiPrev?.costOfSales}
              higherIsBetter={false}
            />
            <KpiCard
              label="노무비"
              value={kpi.laborCost}
              prevValue={kpiPrev?.laborCost}
              higherIsBetter={false}
            />
            <KpiCard
              label="판관비"
              value={kpi.sgaExpense}
              prevValue={kpiPrev?.sgaExpense}
              higherIsBetter={false}
            />
            <KpiCard
              label="영업이익"
              value={kpi.operatingProfit}
              prevValue={kpiPrev?.operatingProfit}
              higherIsBetter
            />
          </div>
        </section>

        {/* 손익 월별 추이 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">손익 월별 추이</h2>
            <span className="text-xs text-gray-400">단위: 천원</span>
          </div>
          <PLTrendChart data={plChartData} selectedMonth={selectedMonth} />
        </section>

        {/* 매출 대비 비중 + 대분류 요약 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">매출 대비 비중 추이</h2>
              <span className="text-xs text-gray-400">단위: %</span>
            </div>
            <RevenueRatioChart data={ratioChartData} selectedMonth={selectedMonth} />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              {isYtd ? `누계 대분류 구성` : `${refMonth}월 대분류 구성`}
            </h2>
            <div className="space-y-3">
              {categoryRows.map((row) => {
                const pct = row.label === "매출" ? 100 : (row.value / categoryBase) * 100;
                const isProfit = row.label === "영업이익";
                const isNeg = row.value < 0;
                return (
                  <div key={row.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{row.label}</span>
                      <span className={`font-semibold tabular-nums ${isNeg ? "text-red-600" : "text-gray-900"}`}>
                        {fmtKRW(row.value)}천원
                        {row.label !== "매출" && (
                          <span className="ml-2 text-gray-400 font-normal">
                            ({fmtPct(Math.abs(pct))})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          isProfit && isNeg ? "bg-red-400" :
                          isProfit ? "bg-emerald-500" :
                          row.cost ? "bg-orange-400" : "bg-blue-500"
                        }`}
                        style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* 계정별 상세 */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">계정별 상세</h2>
            <span className="text-xs text-gray-400">{accountDetails.length}개 계정</span>
          </div>
          <AccountTable data={accountDetails} selectedMonth={selectedMonth} />
        </section>

      </main>
    </div>
  );
}
