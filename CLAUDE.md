# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Turbopack) — defaults to :3000, falls back to :3001
npm run build        # Production build
npm run lint         # ESLint

npm run db:push      # Apply schema to Supabase directly (dev)
npm run db:generate  # Generate SQL migration files
npm run db:migrate   # Run pending migrations
npm run db:studio    # Open Drizzle Studio (DB GUI)
npm run db:import    # Re-import Excel data into DB (scripts/import-excel.ts)
```

## Environment Variables

Copy `.env.local.example` to `.env.local` before running locally.

- `DATABASE_URL` — session-mode pooler (port 5432) used by drizzle-kit CLI. Direct host is blocked on this network; use the Supavisor host at port 5432 instead.
- `DATABASE_POOLER_URL` — transaction-mode pooler (port 6543) used at app runtime
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase JS client (browser-safe, currently unused)

## Architecture

**Data source:** `260624_스테리케어 원가산정(5월말 기준)_v1.xlsx` — original Excel workbook. All DB tables are derived from this file via `npm run db:import`.

**DB layer (`src/db/`):**
- `index.ts` — exports `db` (Drizzle + postgres-js). Server-side only; never import in Client Components.
- `schema/accounts.ts` — `accounts`: 5-level hierarchy (`대분류 → 중분류 → 소분류 → 상대거래처 → 상세내역`)
- `schema/financials.ts` — three fact tables: `monthly_entries` (core P&L), `prepayments` (선급금), `depreciation_summary` (감가요약)

**Data flow: Excel → DB (`scripts/import-excel.ts`):**
- Reads the xlsx with `xlsx` library; `dotenv` loads `.env.local` before the DB module initialises (dynamic `import()` pattern required)
- P&L sheet uses carry-forward logic for the hierarchy columns (upper-level cells are merged in Excel)
- **Known exclusion:** rows where `소분류 LIKE '매출-(%'` or containing `'총 비용'`/`'월별 손익'` are손익 analysis reference rows, not real expense entries — filtered by `isSubtotal()` in the script and absent from the DB

**Dashboard (`src/app/page.tsx`):** single Server Component that runs two queries (`getPLSummary`, `getAccountDetails` from `src/lib/queries.ts`), derives chart/table data, and passes it as props to three Client Components:
- `PLTrendChart` — recharts ComposedChart (stacked cost bars + revenue/profit lines)
- `RevenueRatioChart` — recharts ComposedChart (cost % stacked bars + operating margin line)
- `AccountTable` — filterable/searchable table with client-side state

**Number conventions:**
- DB stores raw KRW (`numeric(18,4)`); `fmtKRW()` in `src/lib/format.ts` divides by 1 000 for 천원 display
- Chart data is pre-divided by 1 000 (천원); Y-axis formatter divides by another 1 000 to label as "백만원 (M)"
- `revenue_ratio` is the raw decimal (0.04 = 4%)

## Excel sheet → DB table mapping

| Excel 시트 | DB 테이블 |
|---|---|
| 26년 5월 | `accounts` + `monthly_entries` |
| 선급금(daily) | `prepayments` |
| 감가요약(25.12.31) | `depreciation_summary` |
| 주요비율산정표(%), 월별원가(류), 가운출고량(류), 감가상각 상세 | not yet modelled |

## Auth / access pattern

인증 없는 내부 전용 대시보드. DB 쿼리는 Server Components/Route Handlers에서만 수행한다. Drizzle은 postgres superuser로 직접 연결하므로 RLS를 우회한다. RLS는 anon key(PostgREST 경로) 차단용으로만 활성화되어 있다. Client Components에서 DB를 직접 호출하지 않는다.
