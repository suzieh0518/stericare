import { config } from "dotenv";
config({ path: ".env.local" });

import XLSX from "xlsx";
import path from "path";

const EXCEL_PATH = path.resolve(
  "260624_스테리케어 원가산정(5월말 기준)_v1.xlsx"
);
const YEAR = 2026;

// P&L 시트 월별 컬럼 인덱스 (0-based)
// C=2(대분류) D=3(중분류) E=4(소분류) F=5(상대거래처) G=6(상세내역)
// H=7(1월) I=8(1월비율) J=9(2월) K=10(2월비율) L=11(3월) M=12(3월비율)
// N=13(1분기합계 skip) O=14(1분기비율 skip)
// P=15(4월) Q=16(4월비율) R=17(5월) S=18(5월비율)
const MONTH_COLS = [
  { month: 1, amtIdx: 7, ratioIdx: 8 },
  { month: 2, amtIdx: 9, ratioIdx: 10 },
  { month: 3, amtIdx: 11, ratioIdx: 12 },
  { month: 4, amtIdx: 15, ratioIdx: 16 },
  { month: 5, amtIdx: 17, ratioIdx: 18 },
];

function toNumStr(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && !isNaN(v)) return String(v);
  return null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function isSubtotal(cells: (string | null)[]): boolean {
  return cells.some(
    (c) =>
      c &&
      (c.includes("합계") ||
        c.includes("소계") ||
        c.includes("합 계") ||
        c.includes("매출-(") ||   // 손익 계산 참조행
        c.includes("총 비용") ||
        c.includes("월별 손익"))
  );
}

async function main() {
  // 동적 임포트: dotenv.config() 실행 후 DB 모듈 로드
  const { db } = await import("../src/db/index");
  const schema = await import("../src/db/schema/index");
  const { sql } = await import("drizzle-orm");

  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  console.log("Excel sheets:", wb.SheetNames.join(", "));

  // ── 기존 데이터 초기화 ─────────────────────────────────────────────
  console.log("\nClearing existing data...");
  await db.execute(
    sql`TRUNCATE monthly_entries, prepayments, depreciation_summary, accounts RESTART IDENTITY CASCADE`
  );

  // ── 1. P&L 손익 데이터 (26년 5월 시트) ────────────────────────────
  console.log("\n[1/3] Importing P&L (26년 5월)...");
  const plRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["26년 5월"], {
    header: 1,
  });

  // 계층 carry-forward 상태
  let prev = { major: "", mid: "", minor: "", counterparty: "" };
  // 엑셀 B열("매출-노무비" 마커) 기준으로 경비 섹션 감지
  let pendingMajor: string | null = null;

  const acctMap = new Map<string, typeof schema.accounts.$inferInsert>();
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

    const b1 = str(raw[1]); // B열: 섹션 구분 라벨
    const major = str(raw[2]);
    const mid = str(raw[3]);
    const minor = str(raw[4]);
    const counterparty = str(raw[5]);
    const detail = str(raw[6]);

    // B열 "매출-노무비" → 이후 C열 없는 행들은 경비 섹션
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

    // 상세내역 없는 행(카테고리 헤더/소계) 스킵
    if (!prev.major || !detail) continue;

    const row = {
      majorCategory: prev.major,
      midCategory: prev.mid || null,
      minorCategory: prev.minor || null,
      counterparty: prev.counterparty || null,
      detail,
    };

    if (
      isSubtotal([
        row.majorCategory,
        row.midCategory,
        row.minorCategory,
        row.counterparty,
        row.detail,
      ])
    )
      continue;

    const hasData = MONTH_COLS.some(({ amtIdx }) => typeof raw[amtIdx] === "number");
    if (!hasData) continue;

    const key = `${row.majorCategory}|${row.midCategory}|${row.minorCategory}|${row.counterparty}|${row.detail}`;
    if (!acctMap.has(key)) acctMap.set(key, row);

    for (const { month, amtIdx, ratioIdx } of MONTH_COLS) {
      const amount = toNumStr(raw[amtIdx]);
      if (amount === null) continue;
      entryRows.push({
        key,
        year: YEAR,
        month,
        amount,
        revenueRatio: toNumStr(raw[ratioIdx]),
      });
    }
  }

  const acctList = [...acctMap.values()];
  console.log(`  Inserting ${acctList.length} accounts...`);
  const inserted = await db.insert(schema.accounts).values(acctList).returning();

  const idMap = new Map<string, number>();
  for (const acc of inserted) {
    const k = `${acc.majorCategory}|${acc.midCategory}|${acc.minorCategory}|${acc.counterparty}|${acc.detail}`;
    idMap.set(k, acc.id);
  }

  const entries = entryRows
    .map(({ key, ...e }) => ({ ...e, accountId: idMap.get(key)! }))
    .filter((e) => e.accountId !== undefined);

  console.log(`  Inserting ${entries.length} monthly entries...`);
  const BATCH = 500;
  for (let i = 0; i < entries.length; i += BATCH) {
    await db.insert(schema.monthlyEntries).values(entries.slice(i, i + BATCH));
  }

  // ── 2. 선급금 (선급금(daily) 시트) ────────────────────────────────
  // XLSX column layout (A열 자동 제거):
  // idx 0=월구분  1=계정과목  2=계정별금액  3=일자  4=상품명  5=업체명  6=요청금액  7=요청자  8=비고
  console.log("\n[2/3] Importing prepayments...");
  const ppRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["선급금(daily)"], {
    header: 1,
  });

  let prevMonth = 1;
  let prevAccountCategory: string | null = null;
  const ppData: (typeof schema.prepayments.$inferInsert)[] = [];

  for (const raw of ppRows.slice(3) as unknown[][]) {
    if (!raw || raw.every((v) => v == null)) continue;

    const monthStr = str(raw[0])?.replace("월", "");
    const monthNum = monthStr ? parseInt(monthStr, 10) : NaN;
    if (!isNaN(monthNum)) prevMonth = monthNum;

    const accountCategory = str(raw[1]);
    if (accountCategory) prevAccountCategory = accountCategory;

    const requestAmount = toNumStr(raw[6]);
    let txDate: string | null = null;
    if (raw[3] instanceof Date) {
      txDate = (raw[3] as Date).toISOString().split("T")[0];
    } else if (typeof raw[3] === "string" && raw[3]) {
      txDate = (raw[3] as string).split("T")[0];
    }

    if (!txDate && !requestAmount) continue;

    ppData.push({
      year: YEAR,
      month: prevMonth,
      accountCategory: prevAccountCategory,
      amount: toNumStr(raw[2]),
      transactionDate: txDate,
      itemName: str(raw[4]),
      vendor: str(raw[5]),
      requestAmount,
      note: str(raw[8]),
    });
  }

  console.log(`  Inserting ${ppData.length} prepayment records...`);
  if (ppData.length > 0) {
    await db.insert(schema.prepayments).values(ppData);
  }

  // ── 3. 감가상각 요약 (감가요약(25.12.31) 시트) ────────────────────
  // XLSX column layout (A열 자동 제거):
  // idx 0=순번  1=과목  2=기초가액  3=당기상각비  4=누계액  5=미상각잔액  6=월상각비
  console.log("\n[3/3] Importing depreciation summary...");
  const depRows = XLSX.utils.sheet_to_json<unknown[]>(
    wb.Sheets["감가요약(25.12.31)"],
    { header: 1 }
  );

  const depData: (typeof schema.depreciationSummary.$inferInsert)[] = [];

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

  console.log(`  Inserting ${depData.length} depreciation records...`);
  if (depData.length > 0) {
    await db.insert(schema.depreciationSummary).values(depData);
  }

  console.log("\n✓ Import complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
