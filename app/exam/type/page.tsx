"use client";

import { useState, useEffect, Suspense } from "react";
import { BookOpen, ArrowRight, ArrowLeft, Loader2, CheckSquare, Square } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface QuestionItem {
  _id: string;
  subject: string;
  examType: string;
  [key: string]: any;
}

function ExamTypeSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSubjectsParam = searchParams.get("subject") || "All";

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedExamTypes, setSelectedExamTypes] = useState<string[]>([]);
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

  // 1. URL 파라미터로 넘어온 복수 과목들을 배열로 분리 및 디코딩
  const targetSubjects =
    selectedSubjectsParam === "All"
      ? []
      : selectedSubjectsParam.split(",").map((s) => decodeURIComponent(s));

  // 2. 선택된 과목들 중 하나라도 포함되는 문제들만 필터링
  const filteredQuestions =
    selectedSubjectsParam === "All"
      ? questions
      : questions.filter((q) => targetSubjects.includes(q.subject));

  // 3. 회차별로 어떤 과목에 속하는지 매핑 정보 생성 (중복 제거 및 과목 매칭용)
  // key: examType, value: Set 형태의 subject 목록들
  const examToSubjectsMap = new Map<string, Set<string>>();
  filteredQuestions.forEach((q) => {
    if (!examToSubjectsMap.has(q.examType)) {
      examToSubjectsMap.set(q.examType, new Set());
    }
    examToSubjectsMap.get(q.examType)!.add(q.subject);
  });

  const availableExamTypes = Array.from(examToSubjectsMap.keys());

  // 회차 선택/해제 토글 핸들러 (복수 선택 지원)
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center text-gray-800 dark:text-gray-200 p-4 transition-colors">
      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-yellow-500" size={22} /> 2단계: 회차 복수 선택
          </h2>
          <Link
            href="/exam/subject"
            className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
          >
            이전으로
          </Link>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 bg-gray-50 dark:bg-[#252526] p-3 rounded-xl border border-gray-200 dark:border-gray-700">
          선택한 과목:{" "}
          <strong className="text-yellow-600 dark:text-yellow-400">
            {selectedSubjectsParam === "All" ? "전체 과목" : targetSubjects.join(", ")}
          </strong>
        </div>

        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-1">
          {/* 전체 회차 선택 토글 버튼 */}
          <button
            onClick={() => handleToggleExamType("All")}
            disabled={isLoading || availableExamTypes.length === 0}
            className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all ${
              isLoading || availableExamTypes.length === 0
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            } ${isAllSelected ? "bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400" : "bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"}`}
          >
            <span>전체 회차 선택 ({availableExamTypes.length}개)</span>
            {isAllSelected ? (
              <CheckSquare size={18} className="text-yellow-500" />
            ) : (
              <Square size={18} className="text-gray-400" />
            )}
          </button>

          {isLoading ? (
            <div className="text-center py-8 text-gray-400 text-xs flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin text-yellow-500" /> 회차 목록 불러오는
              중...
            </div>
          ) : availableExamTypes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              선택한 과목에 등록된 회차가 없습니다.
            </div>
          ) : (
            availableExamTypes.map((exam) => {
              const isChecked = selectedExamTypes.includes(exam);
              const relatedSubjects = Array.from(examToSubjectsMap.get(exam) || []).join(", ");

              return (
                <button
                  key={exam}
                  onClick={() => handleToggleExamType(exam)}
                  className={`w-full p-4 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                    isChecked
                      ? "bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400"
                      : "bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="space-y-1">
                    <span className="font-bold block">{exam}</span>
                    {/* 👈 어떤 과목의 회차인지 보여주는 작은 글씨 */}
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal block">
                      과목: {relatedSubjects}
                    </span>
                  </div>
                  {isChecked ? (
                    <CheckSquare size={18} className="text-yellow-500 shrink-0" />
                  ) : (
                    <Square size={18} className="text-gray-400 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href="/exam/subject"
            className="flex-1 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors text-center flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={16} /> 이전
          </Link>

          <button
            onClick={handleNext}
            disabled={isLoading || selectedExamTypes.length === 0}
            className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-40 text-white dark:text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> 동기화 중
              </>
            ) : (
              <>
                시험 시작 ({selectedExamTypes.length}개 선택) <ArrowRight size={16} />
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center text-gray-400">
          로딩 중...
        </div>
      }
    >
      <ExamTypeSelectionContent />
    </Suspense>
  );
}
