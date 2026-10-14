"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import {
  Trophy,
  CheckCircle,
  XCircle,
  Home,
  Filter,
  Moon,
  Sun,
  RefreshCw,
  Settings2,
  Info,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism"; // 👈 다크모드용 테마
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism"; // 👈 라이트모드용 테마

interface HistoryAttempt {
  isCorrect: boolean;
  timestamp: string;
}

interface QuestionType {
  _id: string;
  subject: string;
  examType: string;
  questionNumber: number;
  questionType?: "multiple-choice" | "short-answer";
  title: string;
  codeSnippet?: string;
  options?: string[];
  correctAnswer: string[] | string;
  explanation?: string;
  isActive?: boolean;
  history?: HistoryAttempt[];
}

const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 공통 마크다운 렌더러 컴포넌트 (다크/라이트 모드 테마 자동 대응)
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
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || "");
          return !inline && match ? (
            <SyntaxHighlighter
              style={isDark ? atomDark : oneLight} // 👈 테마 자동 전환
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code
              className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-[#333] text-pink-600 dark:text-pink-400 font-mono text-xs"
              {...props}
            >
              {children}
            </code>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <table className="w-full border-collapse text-left text-xs sm:text-sm">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return (
            <thead className="bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-200">
              {children}
            </thead>
          );
        },
        th({ children }) {
          return (
            <th className="border-b border-gray-200 dark:border-gray-700 px-4 py-2.5 font-bold">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border-b border-gray-100 dark:border-gray-800 px-4 py-2.5 text-gray-800 dark:text-gray-300">
              {children}
            </td>
          );
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

  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [displayQuestions, setDisplayQuestions] = useState<QuestionType[]>([]);

  const [questionCountMode, setQuestionCountMode] = useState<"10" | "20" | "30" | "all">("20");
  const [prioritizeUnsolved, setPrioritizeUnsolved] = useState(false);
  const [isSequential, setIsSequential] = useState(false);

  const [pendingCountMode, setPendingCountMode] = useState<"10" | "20" | "30" | "all">("20");
  const [pendingUnsolved, setPendingUnsolved] = useState(false);
  const [pendingSequential, setPendingSequential] = useState(false);

  const hasSettingsChanged =
    pendingCountMode !== questionCountMode ||
    pendingUnsolved !== prioritizeUnsolved ||
    pendingSequential !== isSequential;

  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [showExplanation, setShowExplanation] = useState<Record<string, boolean>>({});
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSettingOpen, setIsSettingOpen] = useState(false);

  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMounted(true);
    async function fetchQuestions() {
      try {
        const res = await fetch("/api/questions");
        const data = await res.json();
        setQuestions(data);
        generateExamSet(data, "20", false, false);
      } catch (e) {
        console.error(e);
      }
    }
    fetchQuestions();
  }, [paramSubject, paramExamType]);

  const handleApplyNewSet = () => {
    setQuestionCountMode(pendingCountMode);
    setPrioritizeUnsolved(pendingUnsolved);
    setIsSequential(pendingSequential);
    generateExamSet(questions, pendingCountMode, pendingUnsolved, pendingSequential);

    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const generateExamSet = (
    baseQuestions = questions,
    countMode = questionCountMode,
    unsolved = prioritizeUnsolved,
    sequential = isSequential,
  ) => {
    if (baseQuestions.length === 0) return;

    const targetSubjects =
      paramSubject === "All" ? [] : paramSubject.split(",").map((s) => decodeURIComponent(s));
    const targetExamTypes =
      paramExamType === "All" ? [] : paramExamType.split(",").map((e) => decodeURIComponent(e));

    let filtered = baseQuestions.filter((q) => {
      if (q.isActive === false) return false;

      const matchSubject = paramSubject === "All" || targetSubjects.includes(q.subject);
      const matchExamType = paramExamType === "All" || targetExamTypes.includes(q.examType);
      return matchSubject && matchExamType;
    });

    if (unsolved) {
      filtered.sort((a, b) => {
        const aCount = a.history?.length || 0;
        const bCount = b.history?.length || 0;
        if (aCount !== bCount) return aCount - bCount;
        return Math.random() - 0.5;
      });
    } else if (sequential) {
      filtered.sort((a, b) => {
        if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
        if (a.examType !== b.examType) return a.examType.localeCompare(b.examType);
        return a.questionNumber - b.questionNumber;
      });
    } else {
      filtered = shuffleArray(filtered);
    }

    if (countMode !== "all") {
      const limit = Number(countMode);
      filtered = filtered.slice(0, limit);
    }

    setDisplayQuestions(filtered);
    setUserAnswers({});
    setResults({});
    setShowExplanation({});
    setOpenHistoryId(null);
  };

  const scrollToQuestion = (id: string) => {
    const element = document.getElementById(`question-${id}`);
    const container = mainScrollRef.current;
    if (element && container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset = 20;
      const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - offset;

      const startScrollTop = container.scrollTop;
      const distance = targetScrollTop - startScrollTop;
      const duration = Math.min(Math.max(Math.abs(distance) / 3, 200), 500);
      let startTime: number | null = null;

      const animation = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);

        container.scrollTop = startScrollTop + distance * ease;

        if (progress < 1) {
          requestAnimationFrame(animation);
        }
      };

      requestAnimationFrame(animation);
    }
  };

  const handleOptionSelect = (qId: string, optionNumber: string) =>
    setUserAnswers((prev) => ({ ...prev, [qId]: optionNumber }));
  const handleTextChange = (qId: string, e: React.ChangeEvent<HTMLInputElement>) =>
    setUserAnswers((prev) => ({ ...prev, [qId]: e.target.value }));

  const handleSubmit = async (qId: string, currentQ: QuestionType) => {
    if (!userAnswers[qId]) return;

    const userAnswer = userAnswers[qId].trim().toLowerCase();
    let isCorrect = false;

    if (Array.isArray(currentQ.correctAnswer)) {
      isCorrect = currentQ.correctAnswer.some((ans) => ans.trim().toLowerCase() === userAnswer);
    } else if (typeof currentQ.correctAnswer === "string") {
      isCorrect = userAnswer === currentQ.correctAnswer.trim().toLowerCase();
    }

    setResults((prev) => ({ ...prev, [qId]: isCorrect }));
    setShowExplanation((prev) => ({ ...prev, [qId]: true }));

    try {
      const res = await fetch("/api/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: qId, isCorrect }),
      });

      if (res.ok) {
        const updatedRes = await res.json();
        const updatedData = updatedRes.data;

        setDisplayQuestions((prev) =>
          prev.map((q) => (q._id === qId ? { ...q, history: updatedData.history } : q)),
        );
        setQuestions((prev) =>
          prev.map((q) => (q._id === qId ? { ...q, history: updatedData.history } : q)),
        );
      }
    } catch (error) {
      console.error("기록 저장 실패");
    }
  };

  const correctCount = displayQuestions.filter((q) => results[q._id]).length;
  const answeredCount = displayQuestions.filter((q) => results[q._id] !== undefined).length;
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

  if (!mounted) return null;

  return (
    <div className="flex flex-col lg:flex-row h-screen overflow-hidden bg-gray-50 dark:bg-[#121212] transition-colors">
      <aside className="w-full lg:w-64 bg-white dark:bg-[#1e1e1e] border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0 z-30 shadow-md">
        <div className="flex flex-row lg:flex-col justify-between items-center lg:items-stretch p-3 lg:p-0">
          <div className="lg:p-4 lg:border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a] rounded-lg lg:rounded-none flex justify-between items-center">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors font-bold px-2 lg:px-0 cursor-pointer"
            >
              <Home size={16} /> <span className="hidden sm:inline lg:inline">oneQuiz 홈</span>
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="lg:hidden p-1.5 bg-gray-200 dark:bg-[#252526] rounded-md text-gray-600 dark:text-gray-400 cursor-pointer"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <div className="lg:p-4 lg:border-b border-gray-200 dark:border-gray-800 flex items-center lg:block">
            <div className="hidden lg:flex items-center gap-2 mb-4 text-sm font-semibold text-gray-800 dark:text-gray-200">
              <Trophy size={16} className="text-yellow-600 dark:text-yellow-500" />{" "}
              <span>나의 성적</span>
            </div>
            <div className="flex lg:hidden items-center gap-3 bg-gray-100 dark:bg-[#252526] px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">
              <Trophy size={14} className="text-yellow-600 dark:text-yellow-500" />
              <span className="text-sm font-bold text-yellow-600 dark:text-yellow-500">
                {accuracy}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({correctCount}/{displayQuestions.length})
              </span>
            </div>
            <div className="hidden lg:flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#252526] rounded-lg border border-gray-200 dark:border-gray-700 shadow-inner">
              <p className="text-xs text-gray-500 dark:text-gray-400">현재 정답률</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{accuracy}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {displayQuestions.length}문제 중 {correctCount} 정답
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto lg:overflow-y-auto p-3 lg:p-4 lg:flex-1 scrollbar-hide border-t border-gray-200 dark:border-gray-800 lg:border-t-0 bg-gray-50 dark:bg-transparent">
          <div className="hidden lg:flex items-center gap-2 mb-4 text-sm font-semibold text-gray-500 dark:text-gray-400">
            <span>문제 바로가기</span>
          </div>
          <ul className="flex flex-row lg:grid lg:grid-cols-5 gap-2 pb-1 lg:pb-0">
            {displayQuestions.map((q, idx) => {
              const isSubmitted = results[q._id] !== undefined;
              const isCorrect = results[q._id];
              let btnClass =
                "bg-white dark:bg-[#2d2d2d] hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
              if (isSubmitted) {
                btnClass = isCorrect
                  ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700"
                  : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700";
              }
              return (
                <li key={q._id} className="shrink-0">
                  <button
                    onClick={() => scrollToQuestion(q._id)}
                    className={`w-9 h-9 lg:w-full lg:aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all shadow-sm ${btnClass} cursor-pointer`}
                  >
                    {idx + 1}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <main
        ref={mainScrollRef as any}
        className="flex-1 flex flex-col h-full relative overflow-y-auto"
      >
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-3 sm:p-4 shadow-sm w-full">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 truncate">
                <Filter size={16} className="text-yellow-600 dark:text-yellow-500 shrink-0" />
                <span className="truncate">
                  과목:{" "}
                  <strong className="text-yellow-600 dark:text-yellow-400">{paramSubject}</strong> /
                  회차:{" "}
                  <strong className="text-yellow-600 dark:text-yellow-400">{paramExamType}</strong>
                </span>
              </div>
              <button
                onClick={() => setIsSettingOpen(!isSettingOpen)}
                className="lg:hidden flex items-center gap-1 text-xs bg-gray-100 dark:bg-[#252526] px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 shrink-0 cursor-pointer"
              >
                <Settings2 size={14} /> 설정변경
              </button>
            </div>

            <div
              className={`flex flex-wrap lg:flex-row gap-2 lg:gap-4 items-center w-full ${isSettingOpen ? "flex" : "hidden lg:flex"}`}
            >
              <select
                value={pendingCountMode}
                onChange={(e) => setPendingCountMode(e.target.value as any)}
                className="flex-1 lg:flex-none bg-gray-50 dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer"
              >
                <option value="10">10문제</option>
                <option value="20">20문제</option>
                <option value="30">30문제</option>
                <option value="all">전체 문제</option>
              </select>

              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg text-xs sm:text-sm text-gray-800 dark:text-gray-200 select-none flex-1 lg:flex-none justify-center">
                <input
                  type="checkbox"
                  checked={pendingUnsolved}
                  onChange={(e) => setPendingUnsolved(e.target.checked)}
                  className="accent-yellow-500 w-4 h-4 cursor-pointer"
                />
                안 푼 문제 우선
              </label>

              <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-lg text-xs sm:text-sm text-gray-800 dark:text-gray-200 select-none flex-1 lg:flex-none justify-center">
                <input
                  type="checkbox"
                  checked={pendingSequential}
                  onChange={(e) => setPendingSequential(e.target.checked)}
                  className="accent-yellow-500 w-4 h-4 cursor-pointer"
                />
                순차적 보기 (번호순)
              </label>

              <div className="flex gap-2 flex-1 lg:flex-none w-full lg:w-auto mt-2 lg:mt-0 lg:ml-auto">
                <button
                  onClick={handleApplyNewSet}
                  className="flex-1 flex justify-center items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold border border-transparent rounded-lg px-4 py-2 text-xs sm:text-sm transition-colors shadow-sm cursor-pointer"
                >
                  <RefreshCw size={14} /> <span>새로 뽑기</span>
                </button>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="hidden lg:block p-2 bg-gray-100 dark:bg-[#252526] rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors border border-gray-300 dark:border-gray-700 cursor-pointer"
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
            </div>

            {hasSettingsChanged && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-lg text-xs animate-pulse">
                <AlertCircle size={14} className="shrink-0" />
                <span>
                  설정이 변경되었습니다. 적용하려면 <strong>[새로 뽑기]</strong> 버튼을 눌러주세요!
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-32">
          <div className="max-w-4xl mx-auto space-y-8 sm:space-y-12">
            {displayQuestions.length === 0 ? (
              <div className="text-center text-gray-500 mt-20 text-sm">
                해당 조건에 맞는 문제가 없습니다. 이전 단계에서 과목과 회차를 다시 선택해주세요.
              </div>
            ) : (
              displayQuestions.map((q, idx) => {
                const isSubmitted = results[q._id] !== undefined;
                const isMultipleChoice =
                  q.questionType === "multiple-choice" ||
                  (Array.isArray(q.options) && q.options.length > 0 && q.options[0] !== "");

                const attemptCount = q.history?.length || 0;
                const correctCount = q.history?.filter((h) => h.isCorrect).length || 0;
                const isHistoryOpen = openHistoryId === q._id;

                return (
                  <div
                    key={q._id}
                    id={`question-${q._id}`}
                    className="bg-white dark:bg-[#252526] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl dark:shadow-2xl"
                  >
                    <div className="bg-gray-100 dark:bg-[#8b2323] px-4 sm:px-5 py-3 text-gray-800 dark:text-white text-xs sm:text-sm font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-transparent">
                      <div className="flex flex-wrap items-center gap-2 break-words">
                        <span className="bg-white dark:bg-red-700 border border-gray-300 dark:border-transparent px-2 py-0.5 rounded text-[10px] sm:text-xs shadow-sm shrink-0">
                          기출
                        </span>
                        <span className="break-words font-medium">{q.examType}</span>
                        <span className="opacity-30 dark:opacity-50 hidden sm:inline">|</span>
                        <span className="text-gray-600 dark:text-gray-200 font-normal break-words">
                          {q.subject}
                        </span>
                      </div>

                      <div className="relative self-end sm:self-auto">
                        <button
                          onClick={() => setOpenHistoryId(isHistoryOpen ? null : q._id)}
                          className="flex items-center gap-1.5 text-gray-600 dark:text-gray-200 text-[11px] sm:text-xs bg-white/90 dark:bg-black/40 px-3 py-1 rounded-full shadow-inner border border-gray-200 dark:border-white/10 cursor-pointer font-bold transition-colors hover:bg-gray-200 dark:hover:bg-black/60"
                        >
                          <span>
                            Q. {idx + 1} / {displayQuestions.length}
                          </span>
                          <Info size={13} className="opacity-80 text-yellow-500" />
                        </button>

                        <div
                          className={`absolute right-0 top-full mt-2 w-52 bg-gray-900 dark:bg-[#1a1a1a] text-white text-xs rounded-xl p-3.5 transition-all z-50 shadow-2xl border border-gray-700 ${
                            isHistoryOpen
                              ? "opacity-100 visible"
                              : "opacity-0 invisible sm:group-hover:opacity-100 sm:group-hover:visible"
                          }`}
                        >
                          <div className="font-bold mb-2 border-b border-gray-700 pb-1.5 flex justify-between items-center text-yellow-400">
                            <span>📝 내 풀이 상세 기록</span>
                            <span>({attemptCount}회)</span>
                          </div>
                          <div className="flex justify-between mb-1">
                            <span>누적 정답:</span>{" "}
                            <span className="text-green-400 font-bold">{correctCount}회</span>
                          </div>
                          <div className="flex justify-between mb-2">
                            <span>누적 오답:</span>{" "}
                            <span className="text-red-400 font-bold">
                              {attemptCount - correctCount}회
                            </span>
                          </div>

                          {q.history && q.history.length > 0 ? (
                            <div className="space-y-1 mt-2 border-t border-gray-800 pt-2 max-h-32 overflow-y-auto scrollbar-hide">
                              {q.history.map((h, i) => (
                                <div
                                  key={i}
                                  className="flex justify-between text-[11px] text-gray-300"
                                >
                                  <span>{i + 1}회차:</span>
                                  <span
                                    className={
                                      h.isCorrect
                                        ? "text-green-400 font-bold"
                                        : "text-red-400 font-bold"
                                    }
                                  >
                                    {h.isCorrect ? "정답" : "오답"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-500 italic text-center mt-1">
                              아직 풀이 기록이 없습니다.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 sm:p-6 md:p-8">
                      <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6">
                        <span className="text-yellow-600 dark:text-yellow-500 font-black text-xl sm:text-2xl shrink-0 mt-0.5">
                          {q.questionNumber}.
                        </span>
                        <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-relaxed prose dark:prose-invert max-w-none">
                          <MarkdownRenderer content={q.title} currentTheme={theme} />
                        </div>
                      </div>

                      {q.codeSnippet && (
                        <div className="bg-gray-50 dark:bg-[#1e1e1e] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6 sm:mb-8 ml-0 sm:ml-12 shadow-inner p-4 prose dark:prose-invert max-w-none">
                          <MarkdownRenderer content={q.codeSnippet} currentTheme={theme} />
                        </div>
                      )}

                      <div className="ml-0 sm:ml-12">
                        {isMultipleChoice ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                            {q.options?.map((option, oIdx) => {
                              const optionNum = String(oIdx + 1);
                              const isSelected = userAnswers[q._id] === optionNum;

                              let buttonClass =
                                "bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#2a2d2e] text-gray-700 dark:text-gray-300";
                              if (isSelected)
                                buttonClass =
                                  "bg-yellow-50 dark:bg-yellow-600/20 border-yellow-500 text-yellow-700 dark:text-yellow-400 shadow-md ring-1 ring-yellow-500";

                              if (isSubmitted) {
                                const isOptCorrect = Array.isArray(q.correctAnswer)
                                  ? q.correctAnswer.includes(optionNum)
                                  : q.correctAnswer === optionNum;

                                if (isOptCorrect)
                                  buttonClass =
                                    "bg-green-50 dark:bg-green-900/40 border-green-500 text-green-700 dark:text-green-400 ring-1 ring-green-500 z-10";
                                else if (isSelected && !isOptCorrect)
                                  buttonClass =
                                    "bg-red-50 dark:bg-red-900/40 border-red-500 text-red-700 dark:text-red-400 ring-1 ring-red-500";
                                else
                                  buttonClass =
                                    "bg-gray-50 dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600 opacity-50 cursor-not-allowed";
                              }

                              return (
                                <button
                                  key={oIdx}
                                  onClick={() =>
                                    !isSubmitted && handleOptionSelect(q._id, optionNum)
                                  }
                                  disabled={isSubmitted}
                                  className={`w-full text-left p-3 sm:p-4 rounded-xl border transition-all flex items-center gap-3 sm:gap-4 ${buttonClass} cursor-pointer`}
                                >
                                  <span
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 shadow-sm ${
                                      isSubmitted &&
                                      (Array.isArray(q.correctAnswer)
                                        ? q.correctAnswer.includes(optionNum)
                                        : q.correctAnswer === optionNum)
                                        ? "bg-green-500 text-white dark:text-black"
                                        : isSubmitted && isSelected
                                          ? "bg-red-500 text-white"
                                          : isSelected
                                            ? "bg-yellow-500 text-white dark:text-black"
                                            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                    }`}
                                  >
                                    {optionNum}
                                  </span>
                                  <span className="text-sm sm:text-[15px] font-medium leading-snug">
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
                              className="w-full max-w-md bg-gray-50 dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 sm:py-3.5 text-sm sm:text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-[#1a1a1a] p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800">
                      {!isSubmitted ? (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSubmit(q._id, q)}
                            disabled={!userAnswers[q._id] || userAnswers[q._id].trim() === ""}
                            className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 disabled:opacity-30 disabled:hover:bg-yellow-500 text-white dark:text-black font-bold py-3 sm:py-2.5 px-6 sm:px-8 rounded-xl transition-colors shadow-md text-sm sm:text-base cursor-pointer"
                          >
                            정답 제출 및 기록 저장
                          </button>
                        </div>
                      ) : (
                        <div className="animate-fade-in space-y-4">
                          <div
                            className={`p-3 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-3 font-bold text-sm sm:text-lg shadow-sm ${
                              results[q._id]
                                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50"
                                : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                            }`}
                          >
                            {results[q._id] ? (
                              <CheckCircle size={22} className="sm:w-6 sm:h-6" />
                            ) : (
                              <XCircle size={22} className="sm:w-6 sm:h-6" />
                            )}
                            {results[q._id] ? "정답입니다!" : "오답입니다."}
                          </div>

                          {showExplanation[q._id] && (
                            <div className="p-4 sm:p-5 bg-white dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
                              <div className="text-sm sm:text-base font-bold text-yellow-600 dark:text-yellow-500 mb-2 sm:mb-3">
                                정답:{" "}
                                {Array.isArray(q.correctAnswer)
                                  ? q.correctAnswer.join(", ")
                                  : q.correctAnswer}
                              </div>
                              {q.explanation ? (
                                <div className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm leading-relaxed bg-gray-50 dark:bg-[#1e1e1e] p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-800 prose dark:prose-invert max-w-none">
                                  <span className="font-bold text-gray-500 dark:text-gray-400 block mb-1 sm:mb-2">
                                    📖 해설
                                  </span>
                                  <MarkdownRenderer content={q.explanation} currentTheme={theme} />
                                </div>
                              ) : (
                                <div className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm italic">
                                  등록된 해설이 없습니다.
                                </div>
                              )}

                              <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
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
                                        alert(
                                          "관리자에게 문제 오류 신고가 접수되었습니다. 감사합니다!",
                                        );
                                      } else {
                                        alert("신고 접수 중 오류가 발생했습니다.");
                                      }
                                    } catch (e) {
                                      console.error(e);
                                      alert("서버 오류가 발생했습니다.");
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg transition-colors cursor-pointer"
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
        </div>
      </main>
    </div>
  );
}

export default function ExamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center text-gray-400">
          로딩 중...
        </div>
      }
    >
      <ExamContent />
    </Suspense>
  );
}
