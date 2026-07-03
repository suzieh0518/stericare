import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/db/index");
  const { accounts, monthlyEntries } = await import("../src/db/schema");
  const { eq, sql, asc } = await import("drizzle-orm");

  const rows = await db.select({
    major: accounts.majorCategory,
    total: sql<string>`SUM(${monthlyEntries.amount}::numeric)`,
  }).from(monthlyEntries)
    .innerJoin(accounts, eq(monthlyEntries.accountId, accounts.id))
    .where(eq(monthlyEntries.month, 5))
    .groupBy(accounts.majorCategory);

  let revenue = 0, labor = 0, sga = 0;
  console.log("▶ 5월 대분류별 합계:");
  for (const r of rows) {
    const v = Number(r.total);
    console.log(`  ${r.major}: ${Math.round(v/1000).toLocaleString()}천원`);
    if (r.major === "매출") revenue = v;
    if (r.major === "노무비") labor = v;
    if (r.major === "판관비") sga = v;
  }
  console.log(`  → 영업이익: ${Math.round((revenue-labor-sga)/1000).toLocaleString()}천원`);

  const all = await db.select({
    major: accounts.majorCategory,
    mid: accounts.midCategory,
    minor: accounts.minorCategory,
    detail: accounts.detail,
  }).from(accounts)
    .orderBy(asc(accounts.majorCategory), asc(accounts.midCategory), asc(accounts.minorCategory));

  console.log("\n▶ 전체 계정:");
  let curMajor = "", curMid = "";
  for (const r of all) {
    if (r.major !== curMajor) {
      curMajor = r.major ?? ""; curMid = "";
      console.log(`\n  [${curMajor}]`);
    }
    if ((r.mid ?? "") !== curMid) {
      curMid = r.mid ?? "";
      console.log(`    중분류: ${curMid || "(없음)"}`);
    }
    console.log(`      ${r.minor || "-"} / ${(r.detail ?? "").substring(0, 55)}`);
  }

  process.exit(0);
}

main().catch(console.error);
