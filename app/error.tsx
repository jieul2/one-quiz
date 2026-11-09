"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 프로덕션 에러 로그 기록
    console.error("[One-Quiz Error Boundary caught error]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center ring-4 ring-rose-500/20">
          <AlertTriangle size={28} />
        </div>

        <div className="space-y-2">
          <h1 className="ui-page-title text-lg sm:text-xl font-bold text-on-surface">
            페이지를 불러오는 중 문제가 발생했습니다
          </h1>
          <p className="ui-body text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            일시적인 오류이거나 최신 데이터 동기화 과정에서 예외가 발생했습니다.
            아래 버튼을 눌러 다시 시도하거나 홈 화면으로 이동해주세요.
          </p>
        </div>

        {error?.message && (
          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/60 text-left text-xs font-mono text-on-surface-variant/90 break-all max-h-32 overflow-y-auto">
            <span className="font-bold text-rose-500">Error:</span> {error.message}
          </div>
        )}

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>다시 시도하기</span>
          </button>
          <Link
            href="/"
            className="py-2.5 px-4 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container hover:text-primary font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 border border-outline-variant/60"
          >
            <Home size={14} />
            <span>홈으로</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
