import { UploadForm } from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 text-white px-8 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <a href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
            ← 대시보드
          </a>
          <div>
            <h1 className="text-xl font-bold">데이터 업로드</h1>
            <p className="text-slate-400 text-sm">월별 엑셀 파일로 데이터 갱신</p>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-8 py-12">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800">엑셀 파일 업로드</h2>
            <p className="text-sm text-gray-500 mt-1">
              새 월이 포함된 원가산정 엑셀 파일을 올리면 해당 월 데이터만 갱신됩니다.
              기존 다른 월 데이터는 유지됩니다.
            </p>
          </div>
          <UploadForm />
        </div>
      </main>
    </div>
  );
}
