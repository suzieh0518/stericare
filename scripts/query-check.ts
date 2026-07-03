import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { db } = await import("../src/db/index");
  const { sql } = await import("drizzle-orm");

  const rows = await db.execute(sql`
    SELECT a.major_category, ROUND(SUM(me.amount)) as total
    FROM monthly_entries me
    JOIN accounts a ON a.id = me.account_id
    WHERE me.year = 2026 AND me.month = 5
    GROUP BY a.major_category
    ORDER BY a.major_category
  `);

  const data = Array.isArray(rows) ? rows : [];
  let revenue = 0, labor = 0, exp = 0, sga = 0;
  console.log("▶ DB 5월 대분류별 합계:");
  for (const r of data as { major_category: string; total: string }[]) {
    const v = Number(r.total);
    console.log(`  ${r.major_category}: ${Math.round(v/1000).toLocaleString("ko-KR")} 천원`);
    if (r.major_category === "매출") revenue = v;
    if (r.major_category === "노무비") labor = v;
    if (r.major_category === "경비") exp = v;
    if (r.major_category === "판관비") sga = v;
  }
  const op = revenue - labor - exp - sga;
  console.log(`\n영업이익: ${Math.round(op/1000).toLocaleString("ko-KR")} 천원`);
  console.log(`엑셀 R189: -45,952 천원`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
