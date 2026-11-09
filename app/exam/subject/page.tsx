"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import {
  ArrowRight,
  Loader2,
  CheckSquare,
  Square,
  Layers,
  RotateCcw,
  GraduationCap,
  BookOpen,
  Calendar,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useMounted } from "@/lib/hooks/useMounted";
import Link from "next/link";
import { getQuestions, QuestionItem } from "@/lib/questionsClient";
import { AppShell } from "@/components/layout/AppShell";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { alertModal } from "@/lib/alert";

function SubjectSelectionContent() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedExamTypes, setSelectedExamTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mounted = useMounted();

  // 🌟 네비게이션 메뉴 클릭 또는 외부 초기화 이벤트 수신 시 선택 상태 초기화 (Rule 42)
  useEffect(() => {
    const handleReset = () => {
      setSelectedSubjects([]);
      setSelectedExamTypes([]);
    };
    window.addEventListener("onequiz:reset-exam-selection", handleReset);
    return () => {
      window.removeEventListener("onequiz:reset-exam-selection", handleReset);
    };
  }, []);

  // 전체 기출문제 로드
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

  // 1. 활성화된(isActive !== false) 전체 문제 목록
  const activeQuestions = useMemo(() => {
    return questions.filter((q) => q.isActive !== false && q.subject);
  }, [questions]);

  // 2. 전체 과목 목록 (가나다 순 정렬)
  const subjects = useMemo(() => {
    return Array.from(new Set(activeQuestions.map((q) => q.subject))).sort();
  }, [activeQuestions]);

  // 3. 선택된 과목들에 속하는 활성 문제들
  const questionsForSelectedSubjects = useMemo(() => {
    if (selectedSubjects.length === 0) return [];
    return activeQuestions.filter((q) => selectedSubjects.includes(q.subject));
  }, [activeQuestions, selectedSubjects]);

  // 4. 선택된 과목들에 존재하는 회차 목록 (최신순 내림차순 정렬)
  const availableExamTypes = useMemo(() => {
    const set = new Set<string>();
    questionsForSelectedSubjects.forEach((q) => {
      if (q.examType) set.add(q.examType);
    });
    return Array.from(set).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true, sensitivity: "base" })
    );
  }, [questionsForSelectedSubjects]);

  // 5. 유효한 선택 회차 (현재 선택된 과목들에 속하는 회차만 유효하게 동기화 - 렌더 단계 계산으로 cascading render 차단)
  const effectiveSelectedExamTypes = useMemo(() => {
    return selectedExamTypes.filter((et) => availableExamTypes.includes(et));
  }, [selectedExamTypes, availableExamTypes]);

  // 6. 최종적으로 선택된 과목 및 회차에 해당하는 총 문제 목록
  const finalSelectedQuestions = useMemo(() => {
    if (selectedSubjects.length === 0 || effectiveSelectedExamTypes.length === 0) return [];
    return questionsForSelectedSubjects.filter((q) => effectiveSelectedExamTypes.includes(q.examType));
  }, [selectedSubjects.length, questionsForSelectedSubjects, effectiveSelectedExamTypes]);

  // 과목 선택 토글
  const handleToggleSubject = (sub: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  // 전체 과목 선택 토글
  const isAllSubjectsSelected =
    selectedSubjects.length === subjects.length && subjects.length > 0;
  const handleToggleAllSubjects = () => {
    if (isAllSubjectsSelected) {
      setSelectedSubjects([]);
      setSelectedExamTypes([]);
    } else {
      setSelectedSubjects([...subjects]);
    }
  };

  // 회차 선택 토글
  const handleToggleExamType = (exam: string) => {
    setSelectedExamTypes((prev) =>
      prev.includes(exam) ? prev.filter((e) => e !== exam) : [...prev, exam]
    );
  };

  // 전체 회차 선택 토글
  const isAllExamTypesSelected =
    effectiveSelectedExamTypes.length === availableExamTypes.length && availableExamTypes.length > 0;
  const handleToggleAllExamTypes = () => {
    if (isAllExamTypesSelected) {
      setSelectedExamTypes([]);
    } else {
      setSelectedExamTypes([...availableExamTypes]);
    }
  };

  // 전체 선택 초기화 (과목 & 회차)
  const handleResetAll = () => {
    setSelectedSubjects([]);
    setSelectedExamTypes([]);
  };

  // 기출문제 풀이 시작
  const handleStartExam = () => {
    if (isLoading) return;
    if (selectedSubjects.length === 0) {
      alertModal.warning("최소 한 개 이상의 과목을 선택해주세요.");
      return;
    }
    if (effectiveSelectedExamTypes.length === 0) {
      alertModal.warning("최소 한 개 이상의 기출 회차를 선택해주세요.");
      return;
    }

    const isAllSubjects = selectedSubjects.length === subjects.length && subjects.length > 0;
    const isAllExams =
      effectiveSelectedExamTypes.length === availableExamTypes.length && availableExamTypes.length > 0;

    const subjectQuery = isAllSubjects ? "All" : selectedSubjects.join(",");
    const examTypeQuery = isAllExams ? "All" : effectiveSelectedExamTypes.join(",");

    router.push(
      `/exam?subject=${encodeURIComponent(subjectQuery)}&examType=${encodeURIComponent(examTypeQuery)}`
    );
  };

  if (!mounted) return null;

  return (
    <div className="w-full space-y-6 pb-12 text-on-surface">
      {/* 1. 상단 플랫 헤더 (Rule 52: Full-Width 100% 가득 활용, 다른 페이지와 통일된 상단 액션 버튼 배치) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="ui-page-title">기출문제 학습 설정</h1>
            <span className="ui-badge px-2.5 py-0.5 rounded-full bg-surface-container text-primary font-mono font-bold">
              과목 {selectedSubjects.length}/{subjects.length}개 · 회차 {effectiveSelectedExamTypes.length}/
              {availableExamTypes.length}개
            </span>
            {finalSelectedQuestions.length > 0 && (
              <span className="ui-badge px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-mono font-bold animate-in fade-in-50">
                총 {finalSelectedQuestions.length}문제 준비
              </span>
            )}
          </div>
          <p className="ui-page-subtitle mt-0.5">
            {selectedSubjects.length === 0
              ? "응시할 과목을 선택하면 해당 과목의 출제 기출 회차가 우측에 나타납니다."
              : effectiveSelectedExamTypes.length === 0
              ? "우측에서 원하는 기출 회차를 1개 이상 선택한 후 상단의 시작 버튼을 누르세요."
              : `선택된 ${selectedSubjects.length}개 과목 · ${effectiveSelectedExamTypes.length}개 회차의 기출문제(${finalSelectedQuestions.length}문항)를 풀이합니다.`}
          </p>
        </div>

        {/* 우측 상단 액션 버튼군 */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto shrink-0">
          {(selectedSubjects.length > 0 || effectiveSelectedExamTypes.length > 0) && (
            <button
              type="button"
              onClick={handleResetAll}
              className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-destructive text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="과목 및 회차 선택 모두 초기화"
            >
              <RotateCcw size={14} />
              <span>전체 초기화</span>
            </button>
          )}

          <Link
            href="/"
            className="px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors"
          >
            ← 메인으로
          </Link>

          {/* 🌟 최상단 기출문제 풀이 시작하기 메인 버튼 */}
          <button
            type="button"
            onClick={handleStartExam}
            disabled={
              isLoading ||
              selectedSubjects.length === 0 ||
              effectiveSelectedExamTypes.length === 0 ||
              finalSelectedQuestions.length === 0
            }
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-primary hover:opacity-90 disabled:opacity-40 text-on-primary font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center gap-2 disabled:cursor-not-allowed cursor-pointer"
            title={
              selectedSubjects.length === 0
                ? "과목을 1개 이상 선택해주세요"
                : effectiveSelectedExamTypes.length === 0
                ? "회차를 1개 이상 선택해주세요"
                : "선택한 과목 및 회차 기출문제 풀이 시작"
            }
          >
            <GraduationCap size={16} />
            <span>기출문제 풀이 시작하기</span>
            {finalSelectedQuestions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-mono font-bold">
                {finalSelectedQuestions.length}문제
              </span>
            )}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* 2. 2열 반응형 통합 선택 그리드 (좌측: 과목 선택 / 우측: 회차 선택) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* ================= 좌측: 1. 과목 선택 (5열) ================= */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-xs space-y-4 text-on-surface">
            {/* 섹션 헤더 */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center font-mono">
                  1
                </span>
                <h2 className="ui-section-title">과목 선택</h2>
              </div>
              <span className="ui-badge px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono">
                {selectedSubjects.length} / {subjects.length}개 선택
              </span>
            </div>

            {/* 전체 과목 선택 토글 및 초기화 */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleToggleAllSubjects}
                disabled={isLoading || subjects.length === 0}
                className={`flex-1 p-3 rounded-xl border text-left font-bold flex justify-between items-center transition-all ${
                  isLoading || subjects.length === 0
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                } ${
                  isAllSubjectsSelected
                    ? "bg-primary/10 border-primary text-primary shadow-xs"
                    : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layers size={17} className="text-primary shrink-0" />
                  <span className="text-xs sm:text-sm truncate">
                    전체 과목 선택 ({subjects.length}개)
                  </span>
                </div>
                {isAllSubjectsSelected ? (
                  <CheckSquare size={17} className="text-primary shrink-0 ml-1.5" />
                ) : (
                  <Square size={17} className="text-on-surface-variant shrink-0 ml-1.5" />
                )}
              </button>

              {selectedSubjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubjects([]);
                    setSelectedExamTypes([]);
                  }}
                  className="px-3 py-3 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-destructive text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="선택된 과목 모두 해제"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline">초기화</span>
                </button>
              )}
            </div>

            {/* 과목 목록 리스트 */}
            {isLoading ? (
              <div className="text-center py-14 text-on-surface-variant text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin text-primary" />
                <span>과목 목록을 불러오는 중입니다...</span>
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-14 text-on-surface-variant text-xs bg-surface-container-low/30 rounded-xl border border-dashed border-outline-variant">
                현재 활성화된 문제가 있는 과목이 없습니다.
              </div>
            ) : (
              <ScrollArea maxHeight="540px" className="pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                  {subjects.map((sub) => {
                    const isChecked = selectedSubjects.includes(sub);
                    const subjectQuestions = activeQuestions.filter((q) => q.subject === sub);
                    const count = subjectQuestions.length;
                    const examCount = new Set(
                      subjectQuestions.map((q) => q.examType).filter(Boolean)
                    ).size;

                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => handleToggleSubject(sub)}
                        className={`p-3.5 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                          isChecked
                            ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/30"
                            : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-bold text-sm text-on-surface block truncate">
                            {sub}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono mt-0.5">
                            <span className="text-primary font-semibold">{count}문제</span>
                            <span>·</span>
                            <span>{examCount}개 회차</span>
                          </div>
                        </div>
                        {isChecked ? (
                          <CheckSquare size={18} className="text-primary shrink-0" />
                        ) : (
                          <Square size={18} className="text-on-surface-variant shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* ================= 우측: 2. 회차 선택 (7열) ================= */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl shadow-xs space-y-4 text-on-surface">
            {/* 섹션 헤더 */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center font-mono">
                  2
                </span>
                <h2 className="ui-section-title">기출 회차 선택</h2>
              </div>
              <span className="ui-badge px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono">
                {effectiveSelectedExamTypes.length} / {availableExamTypes.length}개 선택
              </span>
            </div>

            {/* 과목 미선택 시 가이드 안내 영역 */}
            {selectedSubjects.length === 0 ? (
              <div className="py-20 px-6 flex flex-col items-center justify-center text-center gap-3 bg-surface-container-low/30 rounded-xl border border-dashed border-outline-variant">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  <BookOpen size={24} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-on-surface">
                    좌측에서 응시할 과목을 먼저 선택해주세요
                  </p>
                  <p className="text-xs text-on-surface-variant max-w-md">
                    과목을 1개 이상 선택하면 해당 과목의 출제 기출 회차가 이곳에 실시간으로 표시됩니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubjects([...subjects])}
                  disabled={isLoading || subjects.length === 0}
                  className="mt-2 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-xs font-bold transition-colors cursor-pointer border border-primary/25 disabled:opacity-50"
                >
                  모든 과목 전체 선택하기
                </button>
              </div>
            ) : availableExamTypes.length === 0 ? (
              <div className="py-20 px-6 flex flex-col items-center justify-center text-center gap-2 bg-surface-container-low/30 rounded-xl border border-dashed border-outline-variant">
                <p className="font-bold text-sm text-on-surface">등록된 기출 회차가 없습니다</p>
                <p className="text-xs text-on-surface-variant">
                  선택하신 과목에 등록된 회차 데이터가 없습니다.
                </p>
              </div>
            ) : (
              <>
                {/* 선택된 활성 과목 필터 뱃지 바 */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-on-surface-variant font-medium shrink-0 flex items-center gap-1">
                    <BookOpen size={13} className="text-primary" />
                    선택 과목:
                  </span>
                  {isAllSubjectsSelected ? (
                    <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary font-bold">
                      전체 과목 통합 ({subjects.length}개)
                    </span>
                  ) : (
                    selectedSubjects.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md bg-surface-container text-on-surface font-semibold text-xs border border-outline-variant/60"
                      >
                        {s}
                      </span>
                    ))
                  )}
                </div>

                {/* 전체 회차 선택 토글 및 초기화 바 */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAllExamTypes}
                    disabled={availableExamTypes.length === 0}
                    className={`flex-1 p-3 rounded-xl border text-left font-bold flex justify-between items-center transition-all ${
                      availableExamTypes.length === 0
                        ? "opacity-50 cursor-not-allowed"
                        : "cursor-pointer"
                    } ${
                      isAllExamTypesSelected
                        ? "bg-primary/10 border-primary text-primary shadow-xs"
                        : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Layers size={17} className="text-primary shrink-0" />
                      <span className="text-xs sm:text-sm truncate">
                        전체 회차 선택 ({availableExamTypes.length}개)
                      </span>
                    </div>
                    {isAllExamTypesSelected ? (
                      <CheckSquare size={17} className="text-primary shrink-0 ml-1.5" />
                    ) : (
                      <Square size={17} className="text-on-surface-variant shrink-0 ml-1.5" />
                    )}
                  </button>

                  {effectiveSelectedExamTypes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedExamTypes([])}
                      className="px-3 py-3 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-destructive text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      title="선택된 회차 모두 해제"
                    >
                      <RotateCcw size={14} />
                      <span className="hidden sm:inline">초기화</span>
                    </button>
                  )}
                </div>

                {/* 회차 2열 카드 그리드 리스트 */}
                <ScrollArea maxHeight="470px" className="pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableExamTypes.map((exam) => {
                      const isChecked = effectiveSelectedExamTypes.includes(exam);
                      const count = questionsForSelectedSubjects.filter(
                        (q) => q.examType === exam
                      ).length;
                      const coveredSubjects = Array.from(
                        new Set(
                          questionsForSelectedSubjects
                            .filter((q) => q.examType === exam)
                            .map((q) => q.subject)
                        )
                      );

                      return (
                        <button
                          key={exam}
                          type="button"
                          onClick={() => handleToggleExamType(exam)}
                          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                            isChecked
                              ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/30"
                              : "bg-surface-container-low border-outline-variant text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 w-full">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <Calendar size={14} className="text-primary shrink-0" />
                                <span className="font-bold text-sm text-on-surface truncate">
                                  {exam}
                                </span>
                              </div>
                              <span className="text-xs font-mono font-semibold text-primary block mt-0.5">
                                {count}문제 출제
                              </span>
                            </div>

                            {isChecked ? (
                              <CheckSquare size={18} className="text-primary shrink-0 mt-0.5" />
                            ) : (
                              <Square size={18} className="text-on-surface-variant shrink-0 mt-0.5" />
                            )}
                          </div>

                          {/* 포함된 과목 태그 */}
                          <div className="flex flex-wrap gap-1">
                            {coveredSubjects.map((subName) => (
                              <span
                                key={subName}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium truncate max-w-[140px]"
                              >
                                {subName}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SubjectSelectionWrapper() {
  const pathname = usePathname();
  return <SubjectSelectionContent key={pathname} />;
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
        <SubjectSelectionWrapper />
      </Suspense>
    </AppShell>
  );
}
