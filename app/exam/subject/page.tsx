"use client";

import { useState, useEffect, Suspense } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckSquare,
  Square,
  Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMounted } from "@/lib/hooks/useMounted";
import Link from "next/link";
import { getQuestions, QuestionItem } from "@/lib/questionsClient";
import { AppShell } from "@/components/layout/AppShell";

function SubjectSelectionContent() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useMounted();

  useEffect(() => {
    let ignore = false;
    async function fetchQuestions() {
      setIsLoading(true);
      try {
        const data = await getQuestions();
        if (!ignore) {
          setQuestions(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    fetchQuestions();
    return () => {
      ignore = true;
    };
  }, []);

  if (!mounted) return null;

  // 활성화된(isActive !== false) 문제가 1개 이상 존재하는 과목만 추출
  const activeQuestions = questions.filter((q) => q.isActive !== false && q.subject);
  const subjects = Array.from(new Set(activeQuestions.map((q) => q.subject)));

  // 과목 선택/해제 토글 핸들러
  const handleToggleSubject = (sub: string) => {
    if (sub === "All") {
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

    const subjectQuery = isAllSelected ? "All" : selectedSubjects.join(",");
    router.push(`/exam/type?subject=${encodeURIComponent(subjectQuery)}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 단계 인디케이터 헤더 (라운딩 박스 없이 플랫 헤더) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">과목 선택</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-[11px] font-semibold font-mono">
              1단계 / 총 2단계
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-light mt-0.5">
            응시할 과목을 복수로 선택할 수 있습니다.
          </p>
        </div>
        <Link
          href="/"
          className="text-xs text-on-surface-variant hover:text-on-surface font-light transition-colors self-start sm:self-auto"
        >
          ← 메인으로
        </Link>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant p-5 md:p-6 rounded-lg shadow-xs space-y-5 text-on-surface">
        {/* 전체 선택 토글 */}
        <button
          onClick={() => handleToggleSubject("All")}
          disabled={isLoading || subjects.length === 0}
          className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all ${
            isLoading || subjects.length === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          } ${
            isAllSelected
              ? "bg-primary/10 border-primary text-primary"
              : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container"
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-primary" />
            <span>전체 과목 선택 ({subjects.length}개)</span>
          </div>
          {isAllSelected ? (
            <CheckSquare size={18} className="text-primary" />
          ) : (
            <Square size={18} className="text-on-surface-variant" />
          )}
        </button>

        {/* 과목 리스트 */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="text-center py-12 text-on-surface-variant text-xs flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-primary" /> 과목 목록 불러오는 중...
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant text-xs">
              현재 활성화된 문제가 있는 과목이 없습니다.
            </div>
          ) : (
            subjects.map((sub) => {
              const isChecked = selectedSubjects.includes(sub);
              const count = activeQuestions.filter((q) => q.subject === sub).length;

              return (
                <button
                  key={sub}
                  onClick={() => handleToggleSubject(sub)}
                  className={`w-full p-3.5 rounded-xl border text-left font-semibold text-sm flex justify-between items-center transition-all cursor-pointer ${
                    isChecked
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{sub}</span>
                    <span className="text-xs text-on-surface-variant font-mono">({count}문제)</span>
                  </div>
                  {isChecked ? (
                    <CheckSquare size={18} className="text-primary shrink-0" />
                  ) : (
                    <Square size={18} className="text-on-surface-variant shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3 pt-4 border-t border-outline-variant">
          <Link
            href="/"
            className="flex-1 py-3 bg-surface-container-low text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors text-center flex items-center justify-center gap-1.5 text-xs"
          >
            <ArrowLeft size={15} /> 메인으로
          </Link>

          <button
            onClick={handleNext}
            disabled={isLoading || selectedSubjects.length === 0}
            className="flex-1 py-3 bg-primary hover:opacity-90 disabled:opacity-40 text-on-primary font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:cursor-not-allowed cursor-pointer text-xs"
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> 불러오는 중
              </>
            ) : (
              <>
                다음: 회차 선택 ({selectedSubjects.length}개 선택됨) <ArrowRight size={15} />
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
    <AppShell>
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex items-center justify-center text-on-surface-variant">
            로딩 중...
          </div>
        }
      >
        <SubjectSelectionContent />
      </Suspense>
    </AppShell>
  );
}
