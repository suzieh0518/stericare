import { db } from "@/db";
import { accounts, monthlyEntries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type PLSummaryRow = {
  month: number;
  revenue: number;
  costOfSales: number;
  laborCost: number;
  gyeongbi: number;   // 경비
  sgaExpense: number;
  fiberAsset: number;
  totalCost: number;
  grossProfit: number;
  operatingProfit: number;
  operatingMargin: number;
};

export async function getPLSummary(year: number): Promise<PLSummaryRow[]> {
  const rows = await db
    .select({
      month: monthlyEntries.month,
      majorCategory: accounts.majorCategory,
      total: sql<string>`SUM(${monthlyEntries.amount}::numeric)`,
    })
    .from(monthlyEntries)
    .innerJoin(accounts, eq(monthlyEntries.accountId, accounts.id))
    .where(eq(monthlyEntries.year, year))
    .groupBy(monthlyEntries.month, accounts.majorCategory)
    .orderBy(monthlyEntries.month);

  const monthMap = new Map<number, PLSummaryRow>();

  for (const row of rows) {
    if (!monthMap.has(row.month)) {
      monthMap.set(row.month, {
        month: row.month,
        revenue: 0, costOfSales: 0, laborCost: 0,
        gyeongbi: 0, sgaExpense: 0, fiberAsset: 0,
        totalCost: 0, grossProfit: 0,
        operatingProfit: 0, operatingMargin: 0,
      });
    }
    const m = monthMap.get(row.month)!;
    const v = Number(row.total);
    switch (row.majorCategory) {
      case "매출": m.revenue = v; break;
      case "매출원가": m.costOfSales = v; break;
      case "노무비": m.laborCost = v; break;
      case "경비": m.gyeongbi = v; break;
      case "판관비": m.sgaExpense = v; break;
      case "섬유자산": m.fiberAsset = v; break;
    }
  }

  for (const m of monthMap.values()) {
    // 엑셀 R189 수식 기준: =R27-(R79+R174+R187) → 노무비+경비+판관비
    m.totalCost = m.laborCost + m.gyeongbi + m.sgaExpense;
    m.grossProfit = m.revenue - m.costOfSales;
    m.operatingProfit = m.revenue - m.totalCost;
    m.operatingMargin = m.revenue > 0 ? (m.operatingProfit / m.revenue) * 100 : 0;
  }

  return [...monthMap.values()].sort((a, b) => a.month - b.month);
}

export type AccountDetail = {
  id: number;
  majorCategory: string;
  midCategory: string | null;
  minorCategory: string | null;
  counterparty: string | null;
  detail: string | null;
  months: Record<number, number>;
  yearTotal: number;
};

export async function getAccountDetails(year: number): Promise<AccountDetail[]> {
  const rows = await db
    .select({
      id: accounts.id,
      majorCategory: accounts.majorCategory,
      midCategory: accounts.midCategory,
      minorCategory: accounts.minorCategory,
      counterparty: accounts.counterparty,
      detail: accounts.detail,
      month: monthlyEntries.month,
      amount: sql<string>`${monthlyEntries.amount}::numeric`,
    })
    .from(monthlyEntries)
    .innerJoin(accounts, eq(monthlyEntries.accountId, accounts.id))
    .where(eq(monthlyEntries.year, year))
    .orderBy(
      accounts.majorCategory,
      accounts.midCategory,
      accounts.minorCategory,
      accounts.counterparty,
      monthlyEntries.month
    );

  const accMap = new Map<number, AccountDetail>();
  for (const row of rows) {
    if (!accMap.has(row.id)) {
      accMap.set(row.id, {
        id: row.id,
        majorCategory: row.majorCategory,
        midCategory: row.midCategory,
        minorCategory: row.minorCategory,
        counterparty: row.counterparty,
        detail: row.detail,
        months: {},
        yearTotal: 0,
      });
    }
    const acc = accMap.get(row.id)!;
    const v = Number(row.amount);
    acc.months[row.month] = v;
    acc.yearTotal += v;
  }

  return [...accMap.values()];
}
