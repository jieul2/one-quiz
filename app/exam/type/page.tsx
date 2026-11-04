"use client";

import { useState, useEffect, Suspense } from "react";
import { ArrowRight, ArrowLeft, Loader2, CheckSquare, Square, Layers } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMounted } from "@/lib/hooks/useMounted";
import { getQuestions, QuestionItem } from "@/lib/questionsClient";
import { AppShell } from "@/components/layout/AppShell";

function ExamTypeSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSubjectsParam = searchParams.get("subject") || "All";

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedExamTypes, setSelectedExamTypes] = useState<string[]>([]);
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

  // 1. URL 파라미터로 넘어온 복수 과목들을 배열로 분리 및 디코딩
  const targetSubjects =
    selectedSubjectsParam === "All"
      ? []
      : selectedSubjectsParam.split(",").map((s) => decodeURIComponent(s));

  // 2. 활성화된(isActive !== false) 문제 중 선택된 과목에 속하는 문제만 필터링
  const activeQuestions = questions.filter((q) => q.isActive !== false && q.examType);
  const filteredQuestions =
    selectedSubjectsParam === "All"
      ? activeQuestions
      : activeQuestions.filter((q) => targetSubjects.includes(q.subject));

  // 3. 회차별로 어떤 과목에 속하는지 매핑 정보 생성
  const examToSubjectsMap = new Map<string, Set<string>>();
  filteredQuestions.forEach((q) => {
    if (!examToSubjectsMap.has(q.examType)) {
      examToSubjectsMap.set(q.examType, new Set());
    }
    examToSubjectsMap.get(q.examType)!.add(q.subject);
  });

  const availableExamTypes = Array.from(examToSubjectsMap.keys());

  // 회차 선택/해제 토글 핸들러
  const handleToggleExamType = (exam: string) => {
    if (exam === "All") {
      if (selectedExamTypes.length === availableExamTypes.length) {
        setSelectedExamTypes([]);
      } else {
        setSelectedExamTypes([...availableExamTypes]);
      }
      return;
    }

    setSelectedExamTypes((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam],
    );
  };

  const isAllSelected =
    selectedExamTypes.length === availableExamTypes.length && availableExamTypes.length > 0;

  const handleNext = () => {
    if (isLoading) return;
    if (selectedExamTypes.length === 0) {
      alert("최소 한 개 이상의 기출 회차를 선택해주세요.");
      return;
    }

    const examTypeQuery = isAllSelected ? "All" : selectedExamTypes.join(",");
    router.push(
      `/exam?subject=${encodeURIComponent(selectedSubjectsParam)}&examType=${encodeURIComponent(examTypeQuery)}`,
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* 단계 인디케이터 헤더 (라운딩 박스 없이 플랫 헤더) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">회차 선택</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-primary text-[11px] font-semibold font-mono">
              2단계 / 총 2단계
            </span>
          </div>
          <p className="text-xs text-on-surface-variant font-light mt-0.5">
            응시할 시험 회차를 복수로 선택할 수 있습니다.
          </p>
        </div>
        <Link
          href="/exam/subject"
          className="text-xs text-on-surface-variant hover:text-on-surface font-light transition-colors self-start sm:self-auto"
        >
          ← 이전 단계로
        </Link>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant p-5 md:p-6 rounded-lg shadow-xs space-y-5 text-on-surface">
        {/* 선택된 과목 표시 바 */}
        <div className="text-xs text-on-surface-variant bg-surface-container-low p-3.5 rounded-xl border border-outline-variant flex items-center justify-between">
          <span>선택된 과목:</span>
          <strong className="text-primary font-bold">
            {selectedSubjectsParam === "All" ? "전체 과목 통합" : targetSubjects.join(", ")}
          </strong>
        </div>

        {/* 전체 회차 선택 토글 버튼 */}
        <button
          onClick={() => handleToggleExamType("All")}
          disabled={isLoading || availableExamTypes.length === 0}
          className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all ${
            isLoading || availableExamTypes.length === 0
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer"
          } ${
            isAllSelected
              ? "bg-primary/10 border-primary text-primary"
              : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container"
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-primary" />
            <span>전체 회차 선택 ({availableExamTypes.length}개)</span>
          </div>
          {isAllSelected ? (
            <CheckSquare size={18} className="text-primary" />
          ) : (
            <Square size={18} className="text-on-surface-variant" />
          )}
        </button>

        {/* 회차 리스트 */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="text-center py-12 text-on-surface-variant text-xs flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-primary" /> 회차 목록 불러오는 중...
            </div>
          ) : availableExamTypes.length === 0 ? (
            <div className="text-center py-12 text-on-surface-variant text-xs">
              선택한 과목에 등록된 회차가 없습니다.
            </div>
          ) : (
            availableExamTypes.map((exam) => {
              const isChecked = selectedExamTypes.includes(exam);
              const relatedSubjects = Array.from(examToSubjectsMap.get(exam) || []).join(", ");
              const count = filteredQuestions.filter((q) => q.examType === exam).length;

              return (
                <button
                  key={exam}
                  onClick={() => handleToggleExamType(exam)}
                  className={`w-full p-3.5 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                    isChecked
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{exam}</span>
                      <span className="text-xs text-on-surface-variant font-mono">({count}문제)</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant font-normal block">
                      과목: {relatedSubjects}
                    </span>
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
            href="/exam/subject"
            className="flex-1 py-3 bg-surface-container-low text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors text-center flex items-center justify-center gap-1.5 text-xs"
          >
            <ArrowLeft size={15} /> 이전 단계
          </Link>

          <button
            onClick={handleNext}
            disabled={isLoading || selectedExamTypes.length === 0}
            className="flex-1 py-3 bg-primary hover:opacity-90 disabled:opacity-40 text-on-primary font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:cursor-not-allowed cursor-pointer text-xs"
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> 준비 중...
              </>
            ) : (
              <>
                시험 시작하기 ({selectedExamTypes.length}개 회차) <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExamTypeSelectionPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex items-center justify-center text-on-surface-variant">
            로딩 중...
          </div>
        }
      >
        <ExamTypeSelectionContent />
      </Suspense>
    </AppShell>
  );
}
