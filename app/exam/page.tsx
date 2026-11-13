"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useMounted } from "@/lib/hooks/useMounted";
import {
  Trophy,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings2,
  Info,
  AlertCircle,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import {
  getQuestions,
  updateCachedQuestionHistory,
  invalidateQuestionsCache,
  QuestionItem as QuestionType,
} from "@/lib/questionsClient";
import { toast } from "@/lib/toast";
import { alertModal } from "@/lib/alert";
import { AppShell } from "@/components/layout/AppShell";

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 공통 마크다운 렌더러 컴포넌트
const MarkdownRenderer = ({
  content,
  currentTheme,
}: {
  content: string;
  currentTheme?: string;
}) => {
  const isDark = currentTheme === "dark";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children, style: _style, ...props }: React.ComponentPropsWithoutRef<"code"> & { inline?: boolean; node?: unknown }) {
          const match = /language-(\w+)/.exec(className || "");
          return !inline && match ? (
            <SyntaxHighlighter
              style={isDark ? atomDark : oneLight}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code
              className="px-1.5 py-0.5 rounded bg-surface-container-low text-primary font-mono text-xs border border-outline-variant"
              style={_style}
              {...props}
            >
              {children}
            </code>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4 rounded-xl border border-outline-variant shadow-xs">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return (
            <thead className="bg-surface-container-low text-on-surface">
              {children}
            </thead>
          );
        },
        th({ children }) {
          return (
            <th className="border-b border-outline-variant px-4 py-2.5 font-bold">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border-b border-outline-variant px-4 py-2.5 text-on-surface-variant">
              {children}
            </td>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
        },
        strong({ children }) {
          return <strong className="font-extrabold text-on-surface">{children}</strong>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

function ExamContent() {
  const searchParams = useSearchParams();
  const paramSubject = searchParams.get("subject") || "All";
  const paramExamType = searchParams.get("examType") || "All";
  const { data: session } = useSession();

  const [rawQuestions, setRawQuestions] = useState<QuestionType[]>([]);
  const [displayQuestions, setDisplayQuestions] = useState<QuestionType[]>([]);

  // 사용자 답안 및 채점 결과
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});

  // 셔플된 보기 및 변환된 정답을 저장하는 매핑 상태
  const [shuffledOptionsMap, setShuffledOptionsMap] = useState<
    Record<
      string,
      {
        options: string[];
        newCorrectAnswer: string[] | string;
      }
    >
  >({});

  // 문제별 풀이 기록 툴팁 열림 상태 관리
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  // 상단 컨트롤 바 설정 상태 (임시 상태)
  const [pendingCountMode, setPendingCountMode] = useState<"10" | "20" | "30" | "all">("10");
  const [pendingUnsolved, setPendingUnsolved] = useState(false);
  const [pendingSequential, setPendingSequential] = useState(false);

  // 실제 적용된 설정 상태
  const [appliedCountMode, setAppliedCountMode] = useState<"10" | "20" | "30" | "all">("10");
  const [appliedUnsolved, setAppliedUnsolved] = useState(false);
  const [appliedSequential, setAppliedSequential] = useState(false);

  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const { theme } = useTheme();
  const mounted = useMounted();
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // 변경사항 감지
  const hasSettingsChanged =
    pendingCountMode !== appliedCountMode ||
    pendingUnsolved !== appliedUnsolved ||
    pendingSequential !== appliedSequential;

  // 2. 필터링 및 문제 뽑기 함수
  const filterAndSelectQuestions = useCallback(
    (
      sourceQuestions: QuestionType[],
      countMode: "10" | "20" | "30" | "all",
      unsolvedOnly: boolean,
      sequential: boolean,
    ) => {
      let filtered = sourceQuestions.filter((q) => q.isActive !== false);

      // 과목 필터링
      if (paramSubject !== "All") {
        const subjects = paramSubject.split(",").map((s) => decodeURIComponent(s));
        filtered = filtered.filter((q) => subjects.includes(q.subject));
      }

      // 회차 필터링
      if (paramExamType !== "All") {
        const examTypes = paramExamType.split(",").map((t) => decodeURIComponent(t));
        filtered = filtered.filter((q) => examTypes.includes(q.examType));
      }

      // 안 푼 문제 우선
      if (unsolvedOnly) {
        filtered = filtered.filter((q) => !q.history || q.history.length === 0);
      }

      // 순서 정렬
      if (sequential) {
        filtered.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
      } else {
        filtered = shuffleArray(filtered);
      }

      // 개수 제한
      if (countMode !== "all") {
        const limit = parseInt(countMode, 10);
        filtered = filtered.slice(0, limit);
      }

      setDisplayQuestions(filtered);

      // 보기 무작위 셔플 생성
      const newShuffleMap: Record<
        string,
        {
          options: string[];
          newCorrectAnswer: string[] | string;
        }
      > = {};

      filtered.forEach((q) => {
        if (q.options && q.options.length > 0 && q.options[0] !== "") {
          const originalWithIndex = q.options.map((opt, idx) => ({
            text: opt,
            originalIndex: idx + 1,
          }));

          const shuffled = sequential
            ? [...originalWithIndex]
            : shuffleArray(originalWithIndex);

          const newOptions = shuffled.map((item) => item.text);

          let newCorrect: string[] | string;
          if (Array.isArray(q.correctAnswer)) {
            newCorrect = q.correctAnswer.map((ans) => {
              const numAns = parseInt(ans, 10);
              const foundIdx = shuffled.findIndex((item) => item.originalIndex === numAns);
              return foundIdx !== -1 ? String(foundIdx + 1) : ans;
            });
          } else {
            const numAns = parseInt(q.correctAnswer, 10);
            const foundIdx = shuffled.findIndex((item) => item.originalIndex === numAns);
            newCorrect = foundIdx !== -1 ? String(foundIdx + 1) : q.correctAnswer;
          }

          newShuffleMap[q._id] = {
            options: newOptions,
            newCorrectAnswer: newCorrect,
          };
        }
      });

      setShuffledOptionsMap(newShuffleMap);
      setUserAnswers({});
      setResults({});
      setShowExplanation({});
    },
    [paramSubject, paramExamType],
  );

  const userEmail = session?.user?.email;

  // 1. 문제 리스트 로드 (사용자 계정 상태에 따라 캐시 무효화 및 유저별 독립 풀이 이력 로드)
  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        invalidateQuestionsCache();
        const data = await getQuestions(true);
        if (!ignore) {
          setRawQuestions(data);
          filterAndSelectQuestions(data, appliedCountMode, appliedUnsolved, appliedSequential);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, [filterAndSelectQuestions, appliedCountMode, appliedUnsolved, appliedSequential, userEmail]);

  const handleApplyNewSet = () => {
    setAppliedCountMode(pendingCountMode);
    setAppliedUnsolved(pendingUnsolved);
    setAppliedSequential(pendingSequential);
    filterAndSelectQuestions(rawQuestions, pendingCountMode, pendingUnsolved, pendingSequential);
    setIsSettingOpen(false);
  };

  const handleOptionSelect = (qId: string, optionNumber: string) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: optionNumber }));
  };

  const handleTextChange = (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: e.target.value }));
  };

  const handleSubmit = async (qId: string, question: QuestionType) => {
    const rawAnswer = userAnswers[qId]?.trim() || "";
    const userAnswer = rawAnswer.toLowerCase();
    if (!userAnswer) return;

    const activeCorrectAnswer =
      shuffledOptionsMap[qId]?.newCorrectAnswer ?? question.correctAnswer;

    let isCorrect = false;
    if (Array.isArray(activeCorrectAnswer)) {
      isCorrect = activeCorrectAnswer.some((ans) => ans.trim().toLowerCase() === userAnswer);
    } else {
      isCorrect = String(activeCorrectAnswer).trim().toLowerCase() === userAnswer;
    }

    setResults((prev) => ({ ...prev, [qId]: isCorrect }));
    setShowExplanation((prev) => ({ ...prev, [qId]: true }));

    // 캐시 및 DB 업데이트 (유저별 독립 이력)
    const newAttempt = { isCorrect, timestamp: new Date().toISOString() };
    const updatedHistory = [...(question.history || []), newAttempt];
    updateCachedQuestionHistory(qId, updatedHistory);

    try {
      const res = await fetch(`/api/questions/${qId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCorrect, userAnswer: rawAnswer }),
      });
      if (res.status === 401) {
        toast.info("로그인하면 문제 풀이 기록과 정답률이 나만의 계정에 안전하게 저장됩니다.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToQuestion = (qId: string) => {
    const el = document.getElementById(`question-${qId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const correctCount = displayQuestions.filter((q) => results[q._id]).length;
  const answeredCount = displayQuestions.filter((q) => results[q._id] !== undefined).length;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  if (!mounted) return null;

  return (
    <div className="w-full flex flex-col xl:flex-row gap-5 text-on-surface items-start relative">
      {/* 메인 문제 풀이 영역 */}
      <main ref={mainScrollRef} className="flex-1 min-w-0 space-y-5 w-full">
        {/* 상단 통합 컨트롤 툴바 (라운딩 박스 없이 플랫 헤더) */}
        <div className="pb-3 border-b border-outline-variant space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-on-surface truncate">
              <span className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight mr-1">
                기출 풀이
              </span>
              <span className="px-2.5 py-0.5 bg-surface-container rounded-full font-medium text-xs text-on-surface">
                {paramSubject}
              </span>
              <span className="px-2.5 py-0.5 bg-secondary/10 rounded-full font-medium text-xs text-secondary">
                {paramExamType}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* 우측 정답률 & 문제 바로가기 패널 열기/닫기 토글 버튼 */}
              <button
                type="button"
                onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border font-medium transition-colors cursor-pointer ${
                  isSidePanelOpen
                    ? "bg-primary text-on-primary border-primary shadow-xs font-semibold"
                    : "bg-surface-container-low text-on-surface hover:bg-surface-container border-outline-variant"
                }`}
                title="실시간 현황 & 바로가기 패널 열기/닫기"
              >
                <Trophy size={13} />
                <span>정답률 {accuracy}%</span>
                {isSidePanelOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
              </button>

              <button
                onClick={() => setIsSettingOpen(!isSettingOpen)}
                className="lg:hidden flex items-center gap-1.5 text-xs bg-surface-container-low px-3 py-1.5 rounded-md border border-outline-variant text-on-surface shrink-0 cursor-pointer"
              >
                <Settings2 size={13} /> 설정변경
              </button>
            </div>
          </div>

          {/* 세부 필터 및 다시 뽑기 툴바 */}
          <div
            className={`flex-wrap lg:flex-row gap-2.5 items-center w-full pt-1.5 ${
              isSettingOpen ? "flex" : "hidden lg:flex"
            }`}
          >
            <select
              value={pendingCountMode}
              onChange={(e) => setPendingCountMode(e.target.value as "10" | "20" | "30" | "all")}
              className="bg-surface-container-low border border-outline-variant rounded-md px-3 py-1.5 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer font-medium"
            >
              <option value="10">10문제</option>
              <option value="20">20문제</option>
              <option value="30">30문제</option>
              <option value="all">전체 문제</option>
            </select>

            <label className="flex items-center gap-2 cursor-pointer bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-md text-xs sm:text-sm text-on-surface select-none font-medium">
              <input
                type="checkbox"
                checked={pendingUnsolved}
                onChange={(e) => setPendingUnsolved(e.target.checked)}
                className="accent-primary w-3.5 h-3.5 cursor-pointer"
              />
              <span>안 푼 문제 우선</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer bg-surface-container-low border border-outline-variant px-3 py-1.5 rounded-md text-xs sm:text-sm text-on-surface select-none font-medium">
              <input
                type="checkbox"
                checked={pendingSequential}
                onChange={(e) => setPendingSequential(e.target.checked)}
                className="accent-primary w-3.5 h-3.5 cursor-pointer"
              />
              <span>순차적 보기 (번호순)</span>
            </label>

            <button
              onClick={handleApplyNewSet}
              className="ml-auto flex items-center gap-1.5 bg-primary hover:opacity-90 text-on-primary font-medium rounded-md px-3.5 py-1.5 text-xs sm:text-sm transition-all cursor-pointer"
            >
              <RefreshCw size={13} /> <span>새로 뽑기</span>
            </button>
          </div>

          {hasSettingsChanged && (
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary px-3 py-1.5 rounded-xl text-xs">
              <AlertCircle size={14} className="shrink-0" />
              <span>
                설정이 변경되었습니다. 적용하려면 <strong>[새로 뽑기]</strong> 버튼을 눌러주세요!
              </span>
            </div>
          )}
        </div>

        {/* 문제 카드 목록 */}
        <div className="space-y-6 pb-20">
          {displayQuestions.length === 0 ? (
            <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 text-on-surface-variant text-sm">
              해당 조건에 맞는 문제가 없습니다. 이전 단계에서 과목과 회차를 다시 선택해주세요.
            </div>
          ) : (
            displayQuestions.map((q, idx) => {
              const isSubmitted = results[q._id] !== undefined;

              const currentOptions = shuffledOptionsMap[q._id]?.options || q.options;
              const activeCorrectAnswer: string[] | string =
                shuffledOptionsMap[q._id]?.newCorrectAnswer ?? q.correctAnswer;

              const isMultipleChoice =
                q.questionType === "multiple-choice" ||
                (Array.isArray(currentOptions) &&
                  currentOptions.length > 0 &&
                  currentOptions[0] !== "");

              const attemptCount = q.history?.length || 0;
              const correctCount = q.history?.filter((h) => h.isCorrect).length || 0;
              const isHistoryOpen = openHistoryId === q._id;

              return (
                <div
                  key={q._id}
                  id={`question-${q._id}`}
                  className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden shadow-xs"
                >
                  {/* 카드 상단 배지 헤더 */}
                  <div className="bg-surface-container-low px-4 sm:px-5 py-3 text-on-surface text-xs sm:text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant">
                    <div className="flex flex-wrap items-center gap-2 break-words">
                      <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0">
                        기출
                      </span>
                      <span className="font-bold text-on-surface">{q.examType}</span>
                      <span className="opacity-30 hidden sm:inline">•</span>
                      <span className="text-on-surface-variant font-medium">
                        {q.subject}
                      </span>
                    </div>

                    <div className="relative self-end sm:self-auto">
                      <button
                        onClick={() => setOpenHistoryId(isHistoryOpen ? null : q._id)}
                        className="flex items-center gap-1.5 text-on-surface-variant text-[11px] sm:text-xs bg-surface-container-lowest px-3 py-1 rounded-xl shadow-2xs border border-outline-variant cursor-pointer font-bold transition-colors hover:text-on-surface"
                      >
                        <span>
                          Q. {idx + 1} / {displayQuestions.length}
                        </span>
                        <Info size={13} className="text-primary" />
                      </button>

                      <div
                        className={`absolute right-0 top-full mt-2 w-52 bg-surface-container-lowest text-on-surface text-xs rounded-xl p-3.5 transition-all z-50 shadow-xl border border-outline-variant ${
                          isHistoryOpen
                            ? "opacity-100 visible"
                            : "opacity-0 invisible sm:group-hover:opacity-100 sm:group-hover:visible"
                        }`}
                      >
                        <div className="font-bold mb-2 border-b border-outline-variant pb-1.5 flex justify-between items-center text-primary">
                          <span>나의 풀이 기록</span>
                          <span>({attemptCount}회)</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-on-surface-variant">누적 정답:</span>{" "}
                          <span className="text-emerald-500 font-bold">{correctCount}회</span>
                        </div>
                        <div className="flex justify-between mb-2">
                          <span className="text-on-surface-variant">누적 오답:</span>{" "}
                          <span className="text-destructive font-bold">
                            {attemptCount - correctCount}회
                          </span>
                        </div>

                        {q.history && q.history.length > 0 ? (
                          <div className="space-y-1 mt-2 border-t border-outline-variant pt-2 max-h-32 overflow-y-auto scrollbar-thin">
                            {q.history.map((h, i) => (
                              <div
                                key={i}
                                className="flex justify-between text-[11px] text-on-surface-variant"
                              >
                                <span>{i + 1}회차:</span>
                                <span
                                  className={
                                    h.isCorrect
                                      ? "text-emerald-500 font-bold"
                                      : "text-destructive font-bold"
                                  }
                                >
                                  {h.isCorrect ? "정답" : "오답"}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-on-surface-variant italic text-center mt-1">
                            아직 풀이 기록이 없습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 본문 문제 영역 */}
                  <div className="p-5 sm:p-6 md:p-8">
                    <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <span className="text-primary font-black text-xl sm:text-2xl shrink-0 mt-0.5">
                        {q.questionNumber || idx + 1}.
                      </span>
                      <div className="text-base sm:text-lg font-bold text-on-surface leading-relaxed prose dark:prose-invert max-w-none">
                        <MarkdownRenderer content={q.title} currentTheme={theme} />
                      </div>
                    </div>

                    {q.codeSnippet && (
                      <div className="bg-surface-container-low rounded-xl border border-outline-variant overflow-hidden mb-6 sm:mb-8 ml-0 sm:ml-10 shadow-inner p-4 prose dark:prose-invert max-w-none">
                        <MarkdownRenderer content={q.codeSnippet} currentTheme={theme} />
                      </div>
                    )}

                    <div className="ml-0 sm:ml-10">
                      {isMultipleChoice ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
                          {currentOptions?.map((option, oIdx) => {
                            const optionNum = String(oIdx + 1);
                            const isSelected = userAnswers[q._id] === optionNum;

                            let buttonClass =
                              "bg-surface-container-low border-outline-variant hover:bg-surface-container text-on-surface";
                            if (isSelected)
                              buttonClass =
                                "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary";

                            if (isSubmitted) {
                              const isOptCorrect = Array.isArray(activeCorrectAnswer)
                                ? activeCorrectAnswer.includes(optionNum)
                                : activeCorrectAnswer === optionNum;

                              if (isOptCorrect)
                                buttonClass =
                                  "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500 z-10";
                              else if (isSelected && !isOptCorrect)
                                buttonClass =
                                  "bg-destructive/15 border-destructive text-destructive ring-1 ring-destructive";
                              else
                                buttonClass =
                                  "bg-surface-container-low border-outline-variant text-on-surface-variant opacity-50 cursor-not-allowed";
                            }

                            return (
                              <button
                                key={oIdx}
                                onClick={() =>
                                  !isSubmitted && handleOptionSelect(q._id, optionNum)
                                }
                                disabled={isSubmitted}
                                className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-center gap-3 sm:gap-4 ${buttonClass} cursor-pointer`}
                              >
                                <span
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 shadow-xs ${
                                    isSubmitted &&
                                    (Array.isArray(activeCorrectAnswer)
                                      ? activeCorrectAnswer.includes(optionNum)
                                      : activeCorrectAnswer === optionNum)
                                      ? "bg-emerald-500 text-white"
                                      : isSubmitted && isSelected
                                        ? "bg-destructive text-white"
                                        : isSelected
                                          ? "bg-primary text-on-primary"
                                          : "bg-surface-container text-on-surface-variant border border-outline-variant"
                                  }`}
                                >
                                  {optionNum}
                                </span>
                                <span className="text-sm font-medium leading-snug">
                                  {option}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-2 sm:mt-4">
                          <input
                            type="text"
                            value={userAnswers[q._id] || ""}
                            onChange={(e) => handleTextChange(q._id, e)}
                            disabled={isSubmitted}
                            placeholder="주관식 정답을 입력하세요"
                            className="w-full max-w-md bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 sm:py-3.5 text-sm sm:text-base text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 정답 제출 및 해설 영역 */}
                  <div className="bg-surface-container-low p-4 sm:p-5 border-t border-outline-variant">
                    {!isSubmitted ? (
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleSubmit(q._id, q)}
                          disabled={!userAnswers[q._id] || userAnswers[q._id].trim() === ""}
                          className="w-full sm:w-auto bg-primary hover:opacity-90 disabled:opacity-30 text-on-primary font-bold py-3 sm:py-2.5 px-6 sm:px-8 rounded-xl transition-all shadow-xs text-sm cursor-pointer"
                        >
                          정답 제출 및 기록 저장
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div
                          className={`p-3.5 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-3 font-bold text-sm sm:text-base shadow-xs ${
                            results[q._id]
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-destructive/10 text-destructive border border-destructive/20"
                          }`}
                        >
                          {results[q._id] ? (
                            <CheckCircle size={20} className="shrink-0" />
                          ) : (
                            <XCircle size={20} className="shrink-0" />
                          )}
                          <span>{results[q._id] ? "정답입니다!" : "오답입니다."}</span>
                        </div>

                        {showExplanation[q._id] && (
                          <div className="p-4 sm:p-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xs space-y-3">
                            <div className="text-sm sm:text-base font-bold text-primary mb-2 sm:mb-3">
                              정답:{" "}
                              {Array.isArray(activeCorrectAnswer)
                                ? activeCorrectAnswer.join(", ")
                                : activeCorrectAnswer}
                            </div>
                            {q.explanation ? (
                              <div className="text-on-surface text-xs sm:text-sm leading-relaxed bg-surface-container-low p-3 sm:p-4 rounded-xl border border-outline-variant prose dark:prose-invert max-w-none">
                                <span className="font-bold text-on-surface-variant block mb-1 sm:mb-2">
                                  해설
                                </span>
                                <MarkdownRenderer content={q.explanation} currentTheme={theme} />
                              </div>
                            ) : (
                              <div className="text-on-surface-variant text-xs sm:text-sm italic">
                                등록된 해설이 없습니다.
                              </div>
                            )}

                            <div className="flex justify-end pt-2 border-t border-outline-variant">
                              <button
                                onClick={async () => {
                                  const reason = prompt(
                                    "어떤 부분이 잘못되었나요? (예: 정답이 틀렸어요, 오탈자가 있어요)",
                                  );
                                  if (!reason) return;
                                  try {
                                    const res = await fetch("/api/admin/reports", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        questionId: q._id,
                                        subject: q.subject,
                                        examType: q.examType,
                                        questionNumber: q.questionNumber,
                                        questionText: q.title,
                                        userEmail: session?.user?.email || "anonymous",
                                        reportReason: reason,
                                      }),
                                    });
                                    if (res.ok) {
                                      alertModal.success(
                                        "관리자에게 문제 오류 신고가 접수되었습니다. 검토 후 신속히 반영하겠습니다!",
                                        "신고 접수 완료"
                                      );
                                    } else {
                                      alertModal.error("신고 접수 중 오류가 발생했습니다.");
                                    }
                                  } catch (e) {
                                    console.error(e);
                                    alertModal.error("서버 통신 중 오류가 발생했습니다.");
                                  }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                <AlertCircle size={14} /> 문제 오류 신고하기
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* 우측 사이드 패널: 실시간 정답률 & 문제 바로가기 (열고 닫기 지원) */}
      {isSidePanelOpen && (
        <aside className="w-full xl:w-72 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col gap-4 shrink-0 xl:sticky xl:top-6">
          {/* 상단 성적 위젯 */}
          <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                <Trophy size={16} className="text-primary" />
                <span>실시간 정답률</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black text-primary font-mono">{accuracy}%</span>
                <button
                  type="button"
                  onClick={() => setIsSidePanelOpen(false)}
                  className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="패널 닫기"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* 프로그레스 바 */}
            <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${accuracy}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-on-surface-variant font-medium pt-1">
              <span>푼 문제: {answeredCount} / {displayQuestions.length}</span>
              <span className="font-bold text-primary">{correctCount}개 정답</span>
            </div>
          </div>

          {/* 문제 바로가기 번호 그리드 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-on-surface-variant px-1">
              <span>문제 번호 바로가기</span>
              <span className="text-[11px] font-mono">총 {displayQuestions.length}문항</span>
            </div>

            <ScrollArea orientation="vertical" maxHeight="320px" className="pr-1">
              <ul className="grid grid-cols-5 gap-1.5">
                {displayQuestions.map((q, idx) => {
                  const isSubmitted = results[q._id] !== undefined;
                  const isCorrect = results[q._id];
                  let btnClass =
                    "bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant";
                  if (isSubmitted) {
                    btnClass = isCorrect
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-extrabold"
                      : "bg-destructive/15 text-destructive border-destructive/30 font-extrabold";
                  }
                  return (
                    <li key={q._id} className="shrink-0">
                      <button
                        onClick={() => scrollToQuestion(q._id)}
                        className={`w-full aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all shadow-2xs ${btnClass} cursor-pointer`}
                      >
                        {idx + 1}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>
        </aside>
      )}

      {/* 🌟 최상단으로 이동 플로팅 버튼 */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-6 right-6 z-30 p-3 bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant hover:border-primary text-on-surface hover:text-primary rounded-full shadow-lg transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold group"
        title="최상단으로 이동"
      >
        <ArrowUp size={16} className="group-hover:-translate-y-0.5 transition-transform" />
        <span className="hidden sm:inline">TOP</span>
      </button>
    </div>
  );
}

export default function ExamPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-on-surface-variant text-sm">
            시험 문제를 불러오는 중...
          </div>
        }
      >
        <ExamContent />
      </Suspense>
    </AppShell>
  );
}
