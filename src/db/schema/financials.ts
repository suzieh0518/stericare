import { pgTable, serial, integer, numeric, text, date, index } from "drizzle-orm/pg-core";
import { accounts } from "./accounts";

// 월별 손익 데이터 (엑셀의 월별 금액 + 비율계상 컬럼)
export const monthlyEntries = pgTable(
  "monthly_entries",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1~12
    amount: numeric("amount", { precision: 18, scale: 4 }),
    revenueRatio: numeric("revenue_ratio", { precision: 10, scale: 8 }), // 매출 대비 비율
  },
  (table) => [
    index("monthly_entries_account_year_month_idx").on(
      table.accountId,
      table.year,
      table.month
    ),
  ]
);

// 선급금 내역 (엑셀 '선급금(daily)' 시트)
export const prepayments = pgTable("prepayments", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  accountCategory: text("account_category"),    // 계정과목 구분
  amount: numeric("amount", { precision: 18, scale: 4 }),
  transactionDate: date("transaction_date"),    // 일자
  itemName: text("item_name"),                  // 상품명
  vendor: text("vendor"),                       // 업체명
  requestAmount: numeric("request_amount", { precision: 18, scale: 4 }),
  note: text("note"),                           // 비고
});

// 감가상각 요약 (엑셀 '감가요약' 시트)
export const depreciationSummary = pgTable("depreciation_summary", {
  id: serial("id").primaryKey(),
  assetType: text("asset_type").notNull(),       // 과목 (기계장치, 공구와기구 등)
  openingValue: numeric("opening_value", { precision: 18, scale: 4 }),
  annualDepreciation: numeric("annual_depreciation", { precision: 18, scale: 4 }),
  accumulatedDepreciation: numeric("accumulated_depreciation", { precision: 18, scale: 4 }),
  bookValue: numeric("book_value", { precision: 18, scale: 4 }),
  monthlyDepreciation: numeric("monthly_depreciation", { precision: 18, scale: 4 }),
  baseDate: date("base_date"),                   // 기준일자
});
