"use client";

import { useState, useEffect, Suspense } from "react";
import {
  BookOpen,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function SubjectSelectionContent() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]); // 👈 복수 선택을 위한 배열 상태
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchQuestions() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/questions");
        const data = await res.json();
        setQuestions(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchQuestions();
  }, []);

  if (!mounted) return null;

  // 중복 제거된 과목 목록 추출
  const subjects = Array.from(new Set(questions.map((q) => q.subject)));

  // 과목 선택/해제 토글 핸들러
  const handleToggleSubject = (sub: string) => {
    if (sub === "All") {
      // '전체 과목 통합 응시'를 누르면 전체 선택 혹은 해제
      if (selectedSubjects.length === subjects.length) {
        setSelectedSubjects([]);
      } else {
        setSelectedSubjects([...subjects]);
      }
      return;
    }

    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  };

  const isAllSelected = selectedSubjects.length === subjects.length && subjects.length > 0;

  const handleNext = () => {
    if (isLoading) return;
    if (selectedSubjects.length === 0) {
      alert("최소 한 개 이상의 과목을 선택해주세요.");
      return;
    }

    // 선택된 과목들을 쉼표(,)로 묶어서 쿼리 파라미터로 전달
    const subjectQuery = isAllSelected ? "All" : selectedSubjects.join(",");
    router.push(`/exam/type?subject=${encodeURIComponent(subjectQuery)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center text-gray-800 dark:text-gray-200 p-4 transition-colors">
      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-yellow-500" size={22} /> 1단계: 과목 복수 선택
          </h2>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
          >
            처음으로
          </Link>
        </div>

        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-1">
          {/* 전체 선택 토글 버튼 */}
          <button
            onClick={() => handleToggleSubject("All")}
            disabled={isLoading}
            className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all ${
              isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            } ${isAllSelected ? "bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400" : "bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"}`}
          >
            <span>전체 과목 선택 ({subjects.length}개)</span>
            {isAllSelected ? (
              <CheckSquare size={18} className="text-yellow-500" />
            ) : (
              <Square size={18} className="text-gray-400" />
            )}
          </button>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-xs flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-yellow-500" /> 과목 목록 불러오는
              중...
            </div>
          ) : (
            subjects.map((sub) => {
              const isChecked = selectedSubjects.includes(sub);
              return (
                <button
                  key={sub}
                  onClick={() => handleToggleSubject(sub)}
                  className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all cursor-pointer ${
                    isChecked
                      ? "bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400"
                      : "bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <span>{sub}</span>
                  {isChecked ? (
                    <CheckSquare size={18} className="text-yellow-500" />
                  ) : (
                    <Square size={18} className="text-gray-400" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href="/"
            className="flex-1 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors text-center flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={16} /> 취소
          </Link>

          <button
            onClick={handleNext}
            disabled={isLoading || selectedSubjects.length === 0}
            className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white dark:text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> 동기화 중
              </>
            ) : (
              <>
                다음 ({selectedSubjects.length}개 선택) <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubjectSelectionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center text-gray-400">
          로딩 중...
        </div>
      }
    >
      <SubjectSelectionContent />
    </Suspense>
  );
}
