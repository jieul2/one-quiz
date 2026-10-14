"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  Home,
  Trash2,
  PlusCircle,
  X,
  Moon,
  Sun,
  RotateCcw,
  Search,
  ArrowUpDown,
  AlertTriangle,
  ArrowLeft,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Minus,
  Sparkles,
  HelpCircle,
  Code,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface QuestionType {
  _id: string;
  subject: string;
  examType: string;
  questionNumber: number;
  questionType: "multiple-choice" | "short-answer";
  title: string;
  codeSnippet?: string;
  options?: string[];
  correctAnswer: string[];
  explanation?: string;
  isActive?: boolean;
  history?: { isCorrect: boolean; timestamp: string }[];
}

const defaultFormData = {
  subject: "",
  examType: "",
  questionNumber: "",
  questionType: "multiple-choice" as "multiple-choice" | "short-answer",
  title: "",
  codeSnippet: "",
  options: ["", "", "", ""],
  correctAnswer: ["1"],
  currentTagInput: "",
  explanation: "",
};

// 공통 마크다운 렌더러 컴포넌트 (useTheme을 통해 다크/라이트 모드 테마 자동 실시간 반영)
const MarkdownRenderer = ({ content }: { content: string }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ node, inline, className, children, ...props }: any) {
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

export default function AdminQuestionsPage() {
  const [savedQuestions, setSavedQuestions] = useState<QuestionType[]>([]);
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterExamType, setFilterExamType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const [showQuestionId, setShowQuestionId] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCardActiveButtons, setShowCardActiveButtons] = useState(true);

  const [, setIsScrolledDown] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchQuestions();
    const savedCardToggle = localStorage.getItem("showCardActiveButtons");
    if (savedCardToggle !== null) {
      setShowCardActiveButtons(savedCardToggle === "true");
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isModalOpen) setIsModalOpen(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isSettingsOpen]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch("/api/questions");
      const data = await res.json();
      setSavedQuestions(data);
    } catch (error) {
      console.error("Failed to fetch questions");
    }
  };

  const handleToggleCardActive = async (e: React.MouseEvent, q: QuestionType) => {
    e.stopPropagation();
    const nextState = q.isActive === false ? true : false;
    try {
      const res = await fetch("/api/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: q._id, isActive: nextState }),
      });
      if (res.ok) {
        fetchQuestions();
      } else {
        alert("상태 변경에 실패했습니다.");
      }
    } catch {
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  const handleToggleShowCardButtons = () => {
    const nextVal = !showCardActiveButtons;
    setShowCardActiveButtons(nextVal);
    localStorage.setItem("showCardActiveButtons", String(nextVal));
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentEditId(null);
    setFormData(defaultFormData);
    setMessage(null);
    setIsPreviewMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (q: QuestionType) => {
    setEditMode(true);
    setCurrentEditId(q._id);
    setFormData({
      subject: q.subject,
      examType: q.examType,
      questionNumber: String(q.questionNumber),
      questionType: q.questionType,
      title: q.title,
      codeSnippet: q.codeSnippet || "",
      options: q.options && q.options.length >= 2 ? q.options : ["", "", "", ""],
      correctAnswer:
        Array.isArray(q.correctAnswer) && q.correctAnswer.length > 0 ? q.correctAnswer : ["1"],
      currentTagInput: "",
      explanation: q.explanation || "",
    });
    setMessage(null);
    setIsPreviewMode(false);
    setIsModalOpen(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type: "multiple-choice" | "short-answer") => {
    setFormData((prev) => ({
      ...prev,
      questionType: type,
      correctAnswer: type === "multiple-choice" ? ["1"] : [],
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const handleAddOption = () => {
    setFormData((prev) => ({ ...prev, options: [...prev.options, ""] }));
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) {
      alert("객관식 보기는 최소 2개 이상이어야 합니다.");
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = formData.currentTagInput.trim();
      if (val && !formData.correctAnswer.includes(val)) {
        setFormData((prev) => ({
          ...prev,
          correctAnswer: [...prev.correctAnswer, val],
          currentTagInput: "",
        }));
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (formData.correctAnswer.length <= 1) {
      alert("최소 한 개 이상의 정답이 필요합니다.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      correctAnswer: prev.correctAnswer.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const finalAnswers = [...formData.correctAnswer];
    const leftover = formData.currentTagInput.trim();
    if (leftover && !finalAnswers.includes(leftover)) {
      finalAnswers.push(leftover);
    }

    if (finalAnswers.length === 0) {
      setMessage({ type: "error", text: "최소 한 개 이상의 정답을 입력해주세요." });
      return;
    }

    const submitData = {
      subject: formData.subject,
      examType: formData.examType,
      questionNumber: Number(formData.questionNumber),
      questionType: formData.questionType,
      title: formData.title,
      codeSnippet: formData.codeSnippet,
      options: formData.questionType === "multiple-choice" ? formData.options : [],
      correctAnswer: finalAnswers,
      explanation: formData.explanation,
      ...(editMode && currentEditId ? { _id: currentEditId } : {}),
    };

    try {
      const res = await fetch("/api/questions", {
        method: editMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: `문제가 성공적으로 ${editMode ? "수정" : "등록"}되었습니다!`,
        });
        fetchQuestions();
        if (!editMode) {
          setFormData((prev) => ({
            ...defaultFormData,
            subject: prev.subject,
            examType: prev.examType,
            questionNumber: String(Number(prev.questionNumber) + 1),
            correctAnswer: ["1"],
          }));
        } else {
          setTimeout(() => setIsModalOpen(false), 1000);
        }
      } else {
        const errorData = await res.json();
        setMessage({ type: "error", text: `오류 발생: ${errorData.error || errorData.message}` });
      }
    } catch {
      setMessage({ type: "error", text: "서버와 통신하는 중 문제가 발생했습니다." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말로 이 문제를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/questions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("삭제되었습니다.");
        fetchQuestions();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch {
      alert("오류가 발생했습니다.");
    }
  };

  const handleResetHistory = async (id: string) => {
    if (!confirm("이 문제의 풀이 기록을 완전히 초기화하시겠습니까?")) return;
    try {
      const res = await fetch("/api/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, history: [] }),
      });
      if (res.ok) {
        alert("풀이 기록이 초기화되었습니다.");
        fetchQuestions();
      } else {
        alert("기록 초기화에 실패했습니다.");
      }
    } catch {
      alert("서버 오류가 발생했습니다.");
    }
  };

  const handleResetAllHistory = async () => {
    if (!confirm("⚠️ 경고: 모든 문제의 누적 풀이 기록이 완전히 삭제됩니다. 진행하시겠습니까?"))
      return;
    try {
      const res = await fetch("/api/questions?resetAll=true", { method: "DELETE" });
      if (res.ok) {
        alert("모든 문제의 풀이 기록이 초기화되었습니다.");
        fetchQuestions();
      } else {
        alert("전체 초기화에 실패했습니다.");
      }
    } catch {
      alert("서버 오류가 발생했습니다.");
    }
  };

  const subjects = ["All", ...Array.from(new Set(savedQuestions.map((q) => q.subject)))];

  // 👈 선택된 과목에 해당하는 회차들만 동적으로 추출
  const availableExamTypes =
    filterSubject === "All"
      ? Array.from(new Set(savedQuestions.map((q) => q.examType)))
      : Array.from(
          new Set(savedQuestions.filter((q) => q.subject === filterSubject).map((q) => q.examType)),
        );
  const examTypes = ["All", ...availableExamTypes];

  const filteredQuestions = savedQuestions
    .filter((q) => {
      const matchSubject = filterSubject === "All" || q.subject === filterSubject;
      const matchExamType = filterExamType === "All" || q.examType === filterExamType;

      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        query === "" ||
        q.title.toLowerCase().includes(query) ||
        q.subject.toLowerCase().includes(query) ||
        q._id.toLowerCase().includes(query);

      return matchSubject && matchExamType && matchSearch;
    })
    .sort((a, b) => {
      const aAttempts = a.history?.length || 0;
      const bAttempts = b.history?.length || 0;
      if (sortBy === "attempts-desc") return bAttempts - aAttempts;
      if (sortBy === "attempts-asc") return aAttempts - bAttempts;
      return 0;
    });

  if (!mounted) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-[#121212]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 상단 네비게이션 바 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link
              href="/admin"
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
              title="관리자 메인으로"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="overflow-hidden">
              <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white truncate">
                📚 문항 및 시험 DB 관리
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                등록된 기출문제를 관리하고 수정할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1 text-xs sm:text-sm bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#383838] px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer font-bold"
            >
              <Settings size={16} /> <span className="hidden sm:inline">페이지 설정</span>
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-xl text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
              title="테마 변경"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] px-3.5 py-2.5 rounded-xl transition-colors font-medium text-gray-700 dark:text-gray-300"
            >
              <Home size={16} /> <span className="hidden sm:inline">메인으로</span>
            </Link>
          </div>
        </div>

        {/* 문제 목록 대시보드 */}
        <div className="bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col h-[78vh]">
          <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-800 pb-4">
            <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              등록된 문제 목록{" "}
              <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {filteredQuestions.length}개
              </span>
            </h2>
            <button
              onClick={openAddModal}
              className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold px-3.5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer text-xs sm:text-sm shrink-0"
            >
              <PlusCircle size={16} /> 새 문제 추가
            </button>
          </div>

          {/* 검색 및 필터 컨트롤 바 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="relative sm:col-span-2 lg:col-span-1 flex items-center">
              <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="문제 내용 또는 ID 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 h-full px-1.5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                  title="검색어 초기화"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="relative flex items-center">
              <ArrowUpDown
                size={16}
                className="absolute left-3 text-gray-400 pointer-events-none"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer text-gray-900 dark:text-white"
              >
                <option value="default">기본 정렬</option>
                <option value="attempts-desc">풀이 많은 순</option>
                <option value="attempts-asc">풀이 적은 순</option>
              </select>
            </div>

            <select
              value={filterSubject}
              onChange={(e) => {
                setFilterSubject(e.target.value);
                setFilterExamType("All"); // 👈 과목 변경 시 회차 필터 초기화
              }}
              className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer text-gray-900 dark:text-white"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "전체 과목 필터" : s}
                </option>
              ))}
            </select>

            <select
              value={filterExamType}
              onChange={(e) => setFilterExamType(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer text-gray-900 dark:text-white"
            >
              {examTypes.map((e) => (
                <option key={e} value={e}>
                  {e === "All" ? "전체 회차 필터" : e}
                </option>
              ))}
            </select>
          </div>

          <div
            onScroll={(e) => setIsScrolledDown(e.currentTarget.scrollTop > 20)}
            className="flex-1 overflow-y-auto space-y-3 pr-1"
          >
            {filteredQuestions.length === 0 ? (
              <p className="text-gray-500 text-center py-12 text-sm">
                조건에 맞는 문제가 없습니다.
              </p>
            ) : (
              filteredQuestions.map((q) => {
                const attemptCount = q.history?.length || 0;
                const correctCount = q.history?.filter((h) => h.isCorrect).length || 0;
                const isItemActive = q.isActive ?? true;

                return (
                  <div
                    key={q._id}
                    onClick={() => openEditModal(q)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors group cursor-pointer gap-3 ${
                      isItemActive
                        ? "bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 hover:border-yellow-500"
                        : "bg-red-50/20 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 opacity-60"
                    }`}
                  >
                    <div className="overflow-hidden pr-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            q.questionType === "multiple-choice"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400"
                          }`}
                        >
                          {q.questionType === "multiple-choice" ? "객관식" : "단답형"}
                        </span>
                        <span className="text-[11px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-700 dark:text-gray-300">
                          {q.examType}
                        </span>
                        <span className="text-[11px] text-yellow-600 dark:text-yellow-500 font-bold">
                          {q.subject}
                        </span>

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            isItemActive
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          }`}
                        >
                          {isItemActive ? "🟢 활성" : "🔴 비활성"}
                        </span>

                        {showQuestionId && (
                          <span className="text-[10px] font-mono bg-gray-200/70 dark:bg-black/40 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded truncate">
                            ID: {q._id}
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white truncate mb-1">
                        {q.questionNumber}번. {q.title}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        누적 풀이:{" "}
                        <span className="font-bold text-gray-700 dark:text-gray-300">
                          {attemptCount}
                        </span>
                        번 (정답{" "}
                        <span className="text-green-600 dark:text-green-500">{correctCount}</span>
                        번)
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0 self-end sm:self-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {showCardActiveButtons && (
                        <button
                          onClick={(e) => handleToggleCardActive(e, q)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            isItemActive
                              ? "bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25"
                              : "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25"
                          }`}
                          title="이 문제 활성화 여부 변경"
                        >
                          {isItemActive ? "ON" : "OFF"}
                        </button>
                      )}

                      <button
                        onClick={() => handleResetHistory(q._id)}
                        className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white rounded-lg transition-all duration-200 cursor-pointer"
                        title="풀이 기록 초기화"
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(q._id)}
                        className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200 cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 페이지 설정 모달 */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6 animate-fade-in border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings size={20} className="text-yellow-500" /> 관리 페이지 설정
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-[#2d2d2d] rounded-full hover:bg-gray-200 cursor-pointer"
                >
                  <X size={18} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-700 gap-3">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
                      문제 카드별 개별 활성화 버튼 표시
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      문제 목록 카드에 ON/OFF 버튼을 표시할지 여부를 설정합니다.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleShowCardButtons}
                    className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                      showCardActiveButtons
                        ? "bg-yellow-500 text-black shadow-sm"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {showCardActiveButtons ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    <span>{showCardActiveButtons ? "표시 (ON)" : "숨김 (OFF)"}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-700 gap-3">
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
                      문제 카드에 ID 표시
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      문제 목록 카드에서 고유 MongoDB ID 가시성을 제어합니다.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowQuestionId(!showQuestionId)}
                    className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                      showQuestionId
                        ? "bg-yellow-500 text-black shadow-sm"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {showQuestionId ? <Eye size={15} /> : <EyeOff size={15} />}
                    <span>{showQuestionId ? "ON" : "OFF"}</span>
                  </button>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-500/20 space-y-2">
                  <p className="text-xs sm:text-sm font-bold text-red-700 dark:text-red-400">
                    위험 구역
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    모든 문제의 누적 풀이 및 정답 기록을 영구적으로 초기화합니다.
                  </p>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleResetAllHistory();
                    }}
                    className="w-full flex justify-center items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    <AlertTriangle size={15} /> 전체 문제 풀이 기록 초기화 실행
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-3 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 📝 문제 추가/수정 모달 */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col">
              <div className="sticky top-0 z-10 flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur gap-3">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {editMode ? "문제 수정하기" : "새 문제 추가하기"}
                </h2>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className="flex items-center gap-1 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-500 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isPreviewMode ? <EyeOff size={15} /> : <Eye size={15} />}
                    <span>{isPreviewMode ? "편집 모드" : "exam 미리보기"}</span>
                  </button>

                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                  >
                    <X size={18} className="text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {message && (
                  <div
                    className={`p-4 mb-6 rounded-xl ${
                      message.type === "success"
                        ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                    } flex items-center gap-2 text-xs sm:text-sm font-medium`}
                  >
                    {message.type === "success" && <CheckCircle size={18} />} {message.text}
                  </div>
                )}

                {isPreviewMode ? (
                  <div className="bg-gray-50 dark:bg-[#252526] border-2 border-dashed border-yellow-500/40 p-6 rounded-2xl space-y-5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs text-yellow-600 dark:text-yellow-500 font-bold uppercase tracking-wider">
                      <span>✨ Exam 응시 페이지 실시간 미리보기 (구문 강조 적용)</span>
                    </div>

                    <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                        <span>[{formData.subject || "과목 미입력"}]</span>
                        <span>•</span>
                        <span>{formData.examType || "회차 미입력"}</span>
                        <span>•</span>
                        <span>{formData.questionNumber || "0"}번 문제</span>
                      </div>

                      <div className="text-base font-bold text-gray-900 dark:text-white leading-relaxed max-w-none">
                        <MarkdownRenderer
                          content={formData.title || "작성된 문제 내용이 없습니다."}
                        />
                      </div>

                      {formData.codeSnippet && (
                        <div className="bg-gray-100 dark:bg-[#2d2d2d] text-gray-900 dark:text-gray-100 p-4 rounded-xl text-xs overflow-x-auto border border-gray-300 dark:border-gray-700 leading-relaxed max-w-none">
                          <MarkdownRenderer content={formData.codeSnippet} />
                        </div>
                      )}

                      {formData.questionType === "multiple-choice" && (
                        <div className="space-y-2 pt-2">
                          {formData.options.map((opt, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2d2d2d] text-xs font-medium flex items-center gap-3 text-gray-800 dark:text-gray-200"
                            >
                              <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-xs">
                                {idx + 1}
                              </span>
                              <span className="truncate">{opt || `보기 ${idx + 1}`}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {formData.explanation && (
                        <div className="mt-4 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30 text-xs text-gray-800 dark:text-gray-200 space-y-1">
                          <span className="font-bold text-yellow-600 dark:text-yellow-500 block">
                            💡 정답 해설
                          </span>
                          <div className="leading-relaxed max-w-none">
                            <MarkdownRenderer content={formData.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-[#252526] rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleTypeChange("multiple-choice")}
                        className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                          formData.questionType === "multiple-choice"
                            ? "bg-white dark:bg-yellow-600 text-gray-900 dark:text-black shadow"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        객관식
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTypeChange("short-answer")}
                        className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                          formData.questionType === "short-answer"
                            ? "bg-white dark:bg-yellow-600 text-gray-900 dark:text-black shadow"
                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        주관식 (단답형)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">
                          과목명
                        </label>
                        <input
                          required
                          type="text"
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="예: 컴퓨터구조"
                          className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-xs sm:text-sm focus:border-yellow-500 focus:outline-none text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">
                          기출 회차
                        </label>
                        <input
                          required
                          type="text"
                          name="examType"
                          value={formData.examType}
                          onChange={handleChange}
                          placeholder="예: 2026년 1회"
                          className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-xs sm:text-sm focus:border-yellow-500 focus:outline-none text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">
                        문제 번호
                      </label>
                      <input
                        required
                        type="number"
                        name="questionNumber"
                        value={formData.questionNumber}
                        onChange={handleChange}
                        className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-xs sm:text-sm focus:border-yellow-500 focus:outline-none text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400 flex items-center gap-1.5">
                        <HelpCircle size={15} className="text-yellow-500" /> 문제 내용
                      </label>
                      <textarea
                        required
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        rows={3}
                        placeholder="문제를 입력하세요..."
                        className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-xs sm:text-sm focus:border-yellow-500 focus:outline-none text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400 flex items-center gap-1.5">
                        <Code size={15} className="text-blue-500" /> 코드 스니펫
                      </label>
                      <textarea
                        name="codeSnippet"
                        value={formData.codeSnippet}
                        onChange={handleChange}
                        rows={4}
                        placeholder="소스코드 또는 알고리즘 입력..."
                        className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-xs sm:text-sm focus:border-yellow-500 focus:outline-none text-gray-900 dark:text-white"
                      />
                    </div>

                    {formData.questionType === "multiple-choice" && (
                      <div className="space-y-3 p-4 sm:p-5 bg-gray-50 dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                            객관식 보기 입력 (최소 2개 이상)
                          </h3>
                          <button
                            type="button"
                            onClick={handleAddOption}
                            className="flex items-center gap-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                          >
                            <Plus size={14} /> 보기 추가
                          </button>
                        </div>

                        {formData.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-white shrink-0">
                              {index + 1}
                            </span>
                            <input
                              required={formData.questionType === "multiple-choice"}
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionChange(index, e.target.value)}
                              placeholder={`${index + 1}번 보기 입력...`}
                              className="flex-1 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-xs sm:text-sm focus:border-yellow-500 focus:outline-none text-gray-900 dark:text-white"
                            />
                            {formData.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(index)}
                                className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg cursor-pointer transition-colors"
                                title="보기 삭제"
                              >
                                <Minus size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-400">
                        정답 관리 (입력 후 <strong>Enter</strong> 또는 <strong>쉼표(,)</strong>{" "}
                        입력)
                      </label>
                      <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl p-3 min-h-[46px]">
                        {formData.correctAnswer.map((tag, idx) => (
                          <span
                            key={idx}
                            className="flex items-center gap-1.5 bg-yellow-500/15 dark:bg-yellow-600/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-yellow-500/30 animate-fade-in"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-red-500 transition-colors cursor-pointer"
                              title="삭제"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          name="currentTagInput"
                          value={formData.currentTagInput}
                          onChange={handleChange}
                          onKeyDown={handleTagKeyDown}
                          placeholder={
                            formData.correctAnswer.length === 0
                              ? "정답을 입력하고 Enter를 누르세요..."
                              : "추가 정답 입력..."
                          }
                          className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm min-w-[140px] text-gray-900 dark:text-white placeholder:text-gray-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">
                        해설 (선택)
                      </label>
                      <textarea
                        name="explanation"
                        value={formData.explanation}
                        onChange={handleChange}
                        rows={4}
                        placeholder="해설을 입력하세요..."
                        className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl p-3 text-xs sm:text-sm focus:border-yellow-500 focus:outline-none text-gray-900 dark:text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold py-3.5 rounded-xl transition-colors shadow-md text-sm sm:text-base mt-4 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sparkles size={18} /> {editMode ? "수정 완료" : "새 문제 저장"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
