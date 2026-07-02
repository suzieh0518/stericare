"use client";

import { useState, useRef, DragEvent } from "react";
import type { ImportResult } from "@/lib/import-excel";

type Status = "idle" | "uploading" | "success" | "error";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(2026);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    if (!f.name.endsWith(".xlsx")) {
      setError(".xlsx 파일만 업로드 가능합니다");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
    setStatus("idle");
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0] ?? null);
  }

  async function handleSubmit() {
    if (!file) return;
    setStatus("uploading");
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("year", String(year));

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다");
      setResult(data.result as ImportResult);
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* 연도 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">기준 연도</label>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
      </div>

      {/* 드래그 앤 드롭 업로드 영역 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-slate-500 bg-slate-50"
            : file
            ? "border-emerald-400 bg-emerald-50"
            : "border-gray-300 hover:border-slate-400 hover:bg-gray-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <div className="text-4xl mb-3">{file ? "📊" : "📁"}</div>
        {file ? (
          <>
            <p className="font-semibold text-gray-800">{file.name}</p>
            <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(0)} KB · 클릭해서 다시 선택</p>
          </>
        ) : (
          <>
            <p className="font-medium text-gray-700">엑셀 파일을 드래그하거나 클릭해서 선택</p>
            <p className="text-sm text-gray-400 mt-1">.xlsx 파일만 지원</p>
          </>
        )}
      </div>

      {/* 업로드 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!file || status === "uploading"}
        className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
      >
        {status === "uploading" ? "처리 중..." : "데이터 업로드"}
      </button>

      {/* 에러 */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {/* 성공 결과 */}
      {status === "success" && result && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-5 space-y-3">
          <p className="font-semibold text-emerald-800">✅ 임포트 완료</p>
          <div className="text-sm text-emerald-700 space-y-1">
            <p>• 시트: <span className="font-medium">{result.sheetName}</span></p>
            <p>• 반영 월: <span className="font-medium">{result.months.map((m) => `${m}월`).join(", ")}</span></p>
            <p>• 신규 계정: <span className="font-medium">{result.newAccounts}개</span></p>
            <p>• 월별 데이터: <span className="font-medium">{result.monthlyEntries}건</span></p>
            {result.prepayments > 0 && <p>• 선급금: <span className="font-medium">{result.prepayments}건</span></p>}
            {result.depreciation > 0 && <p>• 감가요약: <span className="font-medium">{result.depreciation}건</span></p>}
          </div>
          <a
            href="/"
            className="block text-center mt-3 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-lg hover:bg-emerald-800 transition-colors"
          >
            대시보드에서 확인 →
          </a>
        </div>
      )}
    </div>
  );
}
