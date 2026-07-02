import { NextRequest, NextResponse } from "next/server";
import { importExcelBuffer } from "@/lib/import-excel";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const yearStr = formData.get("year") as string | null;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }
    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json({ error: ".xlsx 파일만 업로드 가능합니다" }, { status: 400 });
    }

    const year = yearStr ? parseInt(yearStr) : 2026;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importExcelBuffer(buffer, year);

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "임포트 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
