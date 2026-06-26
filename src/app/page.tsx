import { getPLSummary, getAccountDetails } from "@/lib/queries";
import { fmtKRW, fmtPct } from "@/lib/format";
import { KpiCard } from "@/components/KpiCard";
import { PLTrendChart, type PLChartData } from "@/components/PLTrendChart";
import { RevenueRatioChart, type RatioChartData } from "@/components/RevenueRatioChart";
import { AccountTable } from "@/components/AccountTable";

const YEAR = 2026;

export default async function Dashboard() {
  const [plSummary, accountDetails] = await Promise.all([
    getPLSummary(YEAR),
    getAccountDetails(YEAR),
  ]);

  const latest = plSummary.at(-1);
  const prev = plSummary.at(-2);

  // P&L 추이 차트 데이터 (천원 단위)
  const plChartData: PLChartData[] = plSummary.map((m) => ({
    month: `${m.month}월`,
    매출: Math.round(m.revenue / 1000),
    매출원가: Math.round(m.costOfSales / 1000),
    노무비: Math.round(m.laborCost / 1000),
    판관비: Math.round(m.sgaExpense / 1000),
    영업이익: Math.round(m.operatingProfit / 1000),
  }));

  // 매출대비 비중 차트 데이터 (%)
  const ratioChartData: RatioChartData[] = plSummary.map((m) => {
    const rev = m.revenue || 1;
    return {
      month: `${m.month}월`,
      매출원가율: +((m.costOfSales / rev) * 100).toFixed(1),
      노무비율: +((m.laborCost / rev) * 100).toFixed(1),
      판관비율: +((m.sgaExpense / rev) * 100).toFixed(1),
      영업이익률: +((m.operatingProfit / rev) * 100).toFixed(1),
    };
  });

  // 최신 월 기준 대분류별 비중 테이블
  const categoryRows = [
    { label: "매출", value: latest?.revenue ?? 0, cost: false },
    { label: "매출원가", value: latest?.costOfSales ?? 0, cost: true },
    { label: "노무비", value: latest?.laborCost ?? 0, cost: true },
    { label: "판관비", value: latest?.sgaExpense ?? 0, cost: true },
    { label: "영업이익", value: latest?.operatingProfit ?? 0, cost: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-slate-900 text-white px-8 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">스테리케어 대시보드</h1>
            <p className="text-slate-400 text-sm">{YEAR}년 손익 · 원가 분석</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">기준월</p>
            <p className="text-lg font-semibold">{latest?.month}월</p>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-8 py-8 space-y-8">

        {/* KPI 카드 */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {latest?.month}월 실적
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard
              label="매출"
              value={latest?.revenue ?? 0}
              prevValue={prev?.revenue}
              higherIsBetter
            />
            <KpiCard
              label="매출원가"
              value={latest?.costOfSales ?? 0}
              prevValue={prev?.costOfSales}
              higherIsBetter={false}
            />
            <KpiCard
              label="노무비"
              value={latest?.laborCost ?? 0}
              prevValue={prev?.laborCost}
              higherIsBetter={false}
            />
            <KpiCard
              label="판관비"
              value={latest?.sgaExpense ?? 0}
              prevValue={prev?.sgaExpense}
              higherIsBetter={false}
            />
            <KpiCard
              label="영업이익"
              value={latest?.operatingProfit ?? 0}
              prevValue={prev?.operatingProfit}
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
          <PLTrendChart data={plChartData} />
        </section>

        {/* 매출 대비 비중 + 대분류 요약 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-800">매출 대비 비중 추이</h2>
              <span className="text-xs text-gray-400">단위: %</span>
            </div>
            <RevenueRatioChart data={ratioChartData} />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              {latest?.month}월 대분류 구성
            </h2>
            <div className="space-y-3">
              {categoryRows.map((row) => {
                const rev = latest?.revenue || 1;
                const pct = row.label === "매출" ? 100 : (row.value / rev) * 100;
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
          <AccountTable data={accountDetails} />
        </section>

      </main>
    </div>
  );
}
