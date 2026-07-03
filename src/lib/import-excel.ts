import * as XLSX from "xlsx";
import { db } from "@/db";
import { accounts, monthlyEntries, prepayments, depreciationSummary } from "@/db/schema";
import { and, inArray, eq } from "drizzle-orm";

export type ImportResult = {
  newAccounts: number;
  monthlyEntries: number;
  prepayments: number;
  depreciation: number;
  months: number[];
  year: number;
  sheetName: string;
};

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toNumStr(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && !isNaN(v)) return String(v);
  return null;
}

function isSubtotal(cells: (string | null)[]): boolean {
  return cells.some(
    (c) =>
      c &&
      (c.includes("합계") ||
        c.includes("소계") ||
        c.includes("합 계") ||
        c.includes("매출-(") ||
        c.includes("총 비용") ||
        c.includes("월별 손익"))
  );
}

function makeKey(a: {
  majorCategory?: string | null;
  midCategory?: string | null;
  minorCategory?: string | null;
  counterparty?: string | null;
  detail?: string | null;
}): string {
  return `${a.majorCategory}|${a.midCategory}|${a.minorCategory}|${a.counterparty}|${a.detail}`;
}

// 분기 합계 컬럼(2개)을 고려한 월별 컬럼 인덱스 계산
// Q1(1-3월) → 7~12, 1분기합계 13-14 skip, Q2(4-6월) → 15~20, 2분기합계 21-22 skip, ...
function buildMonthCols(maxMonth: number) {
  const cols: { month: number; amtIdx: number; ratioIdx: number }[] = [];
  for (let m = 1; m <= maxMonth; m++) {
    const quarterSkip = Math.floor((m - 1) / 3) * 2;
    const amtIdx = 7 + (m - 1) * 2 + quarterSkip;
    cols.push({ month: m, amtIdx, ratioIdx: amtIdx + 1 });
  }
  return cols;
}

export async function importExcelBuffer(buffer: Buffer, year = 2026): Promise<ImportResult> {
  const wb = XLSX.read(buffer, { cellDates: true });

  // 손익 시트 찾기: "26년 5월", "26년 6월" 패턴
  const plSheetName =
    wb.SheetNames.find((n) => /\d+년 \d+월/.test(n)) ?? wb.SheetNames[0];
  const maxMonthMatch = plSheetName.match(/(\d+)월/);
  const maxMonth = maxMonthMatch ? parseInt(maxMonthMatch[1]) : 5;
  const MONTH_COLS = buildMonthCols(maxMonth);

  // ── P&L 파싱 ───────────────────────────────────────────────────────
  const plRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[plSheetName], { header: 1 });

  let prev = { major: "", mid: "", minor: "", counterparty: "" };
  let pendingMajor: string | null = null;
  const acctList: (typeof accounts.$inferInsert)[] = [];
  const acctKeySet = new Set<string>();
  type EntryRow = {
    key: string;
    year: number;
    month: number;
    amount: string | null;
    revenueRatio: string | null;
  };
  const entryRows: EntryRow[] = [];

  for (const raw of plRows.slice(3) as unknown[][]) {
    if (!raw) continue;
    const b1 = str(raw[1]);
    const major = str(raw[2]);
    const mid = str(raw[3]);
    const minor = str(raw[4]);
    const counterparty = str(raw[5]);
    const detail = str(raw[6]);

    if (b1 === "매출-노무비") pendingMajor = "경비";

    if (major) {
      prev = { major, mid: "", minor: "", counterparty: "" };
      pendingMajor = null;
    } else {
      if (pendingMajor && prev.major !== pendingMajor) {
        prev = { major: pendingMajor, mid: "", minor: "", counterparty: "" };
      }
      if (mid) { prev.mid = mid; prev.minor = ""; prev.counterparty = ""; }
      else if (minor) { prev.minor = minor; prev.counterparty = ""; }
      else if (counterparty) { prev.counterparty = counterparty; }
    }

    if (!prev.major || !detail) continue;

    const row = {
      majorCategory: prev.major,
      midCategory: prev.mid || null,
      minorCategory: prev.minor || null,
      counterparty: prev.counterparty || null,
      detail,
    };

    if (isSubtotal([row.majorCategory, row.midCategory, row.minorCategory, row.counterparty, row.detail])) continue;
    if (!MONTH_COLS.some(({ amtIdx }) => typeof raw[amtIdx] === "number")) continue;

    const key = makeKey(row);
    if (!acctKeySet.has(key)) { acctKeySet.add(key); acctList.push(row); }

    for (const { month, amtIdx, ratioIdx } of MONTH_COLS) {
      const amount = toNumStr(raw[amtIdx]);
      if (amount === null) continue;
      entryRows.push({ key, year, month, amount, revenueRatio: toNumStr(raw[ratioIdx]) });
    }
  }

  // ── 선급금 파싱 ────────────────────────────────────────────────────
  const ppSheetName = wb.SheetNames.find((n) => n.includes("선급금")) ?? null;
  type PrepayRow = typeof prepayments.$inferInsert;
  const ppData: PrepayRow[] = [];

  if (ppSheetName) {
    const ppRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[ppSheetName], { header: 1 });
    let prevMonth = 1;
    let prevAccountCategory: string | null = null;

    for (const raw of ppRows.slice(3) as unknown[][]) {
      if (!raw || raw.every((v) => v == null)) continue;
      const monthStr = str(raw[0])?.replace("월", "");
      const monthNum = monthStr ? parseInt(monthStr, 10) : NaN;
      if (!isNaN(monthNum)) prevMonth = monthNum;
      const accountCategory = str(raw[1]);
      if (accountCategory) prevAccountCategory = accountCategory;

      const requestAmount = toNumStr(raw[6]);
      let txDate: string | null = null;
      if (raw[3] instanceof Date) txDate = (raw[3] as Date).toISOString().split("T")[0];
      else if (typeof raw[3] === "string" && raw[3]) txDate = (raw[3] as string).split("T")[0];
      if (!txDate && !requestAmount) continue;

      ppData.push({
        year, month: prevMonth, accountCategory: prevAccountCategory,
        amount: toNumStr(raw[2]), transactionDate: txDate,
        itemName: str(raw[4]), vendor: str(raw[5]),
        requestAmount, note: str(raw[8]),
      });
    }
  }

  // ── 감가요약 파싱 ──────────────────────────────────────────────────
  const depSheetName = wb.SheetNames.find((n) => n.includes("감가요약")) ?? null;
  type DepRow = typeof depreciationSummary.$inferInsert;
  const depData: DepRow[] = [];

  if (depSheetName) {
    const depRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[depSheetName], { header: 1 });
    for (const raw of depRows.slice(3) as unknown[][]) {
      if (!raw || !raw[1]) continue;
      const assetType = String(raw[1]).trim();
      if (!assetType || isSubtotal([assetType])) continue;
      depData.push({
        assetType,
        openingValue: toNumStr(raw[2]),
        annualDepreciation: toNumStr(raw[3]),
        accumulatedDepreciation: toNumStr(raw[4]),
        bookValue: toNumStr(raw[5]),
        monthlyDepreciation: toNumStr(raw[6]),
        baseDate: "2025-12-31",
      });
    }
  }

  // ── DB upsert (트랜잭션) ───────────────────────────────────────────
  const importedMonths = [...new Set(entryRows.map((e) => e.month))].sort((a, b) => a - b);

  const result = await db.transaction(async (tx) => {
    // 1. 기존 계정 조회 → key→id 맵
    const existing = await tx.select().from(accounts);
    const idMap = new Map<string, number>();
    for (const acc of existing) idMap.set(makeKey(acc), acc.id);

    // 2. 신규 계정만 삽입
    const newAccts = acctList.filter((a) => !idMap.has(makeKey(a)));
    if (newAccts.length > 0) {
      const inserted = await tx.insert(accounts).values(newAccts).returning();
      for (const acc of inserted) idMap.set(makeKey(acc), acc.id);
    }

    // 3. 해당 연/월 monthly_entries 삭제 후 재삽입
    if (importedMonths.length > 0) {
      await tx.delete(monthlyEntries).where(
        and(eq(monthlyEntries.year, year), inArray(monthlyEntries.month, importedMonths))
      );
    }

    const entries = entryRows
      .map(({ key, ...e }) => ({ ...e, accountId: idMap.get(key)! }))
      .filter((e) => e.accountId !== undefined);

    const BATCH = 500;
    for (let i = 0; i < entries.length; i += BATCH) {
      await tx.insert(monthlyEntries).values(entries.slice(i, i + BATCH));
    }

    // 4. 선급금 — 해당 월 삭제 후 재삽입
    const ppMonths = [...new Set(ppData.map((p) => p.month))];
    if (ppMonths.length > 0) {
      await tx.delete(prepayments).where(
        and(eq(prepayments.year, year), inArray(prepayments.month, ppMonths))
      );
    }
    if (ppData.length > 0) await tx.insert(prepayments).values(ppData);

    // 5. 감가요약 — 전체 교체
    if (depData.length > 0) {
      await tx.delete(depreciationSummary);
      await tx.insert(depreciationSummary).values(depData);
    }

    return {
      newAccounts: newAccts.length,
      monthlyEntries: entries.length,
      prepayments: ppData.length,
      depreciation: depData.length,
      months: importedMonths,
      year,
      sheetName: plSheetName,
    };
  });

  return result;
}
