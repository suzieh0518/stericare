import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

// 계정 마스터 (엑셀의 대분류/중분류/소분류/상대거래처/상세내역 계층 구조)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  majorCategory: varchar("major_category", { length: 100 }).notNull(), // 대분류 (매출, 매출원가, 판관비 등)
  midCategory: varchar("mid_category", { length: 100 }),              // 중분류
  minorCategory: varchar("minor_category", { length: 100 }),          // 소분류
  counterparty: varchar("counterparty", { length: 100 }),             // 상대거래처
  detail: text("detail"),                                             // 상세내역
});
