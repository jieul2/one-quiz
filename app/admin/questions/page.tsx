"use client";

import { useState, useEffect, useCallback } from "react";
import { useMounted } from "@/lib/hooks/useMounted";
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
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Loader2,
  BookOpen,
  Layers,
  ArrowRight,
  Calendar,
  CheckSquare,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { invalidateQuestionsCache } from "@/lib/questionsClient";

interface SubjectInfo {
  name: string;
  total: number;
  activeCount: number;
  isActive: boolean;
  isAllActive: boolean;
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "...", total];
  }
  if (current >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "...", current - 1, current, current + 1, "...", total];
}

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
              className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-[#333] text-pink-600 dark:text-pink-400 font-mono text-xs"
              style={_style}
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [filterSubject, setFilterSubject] = useState("All");
  const [filterExamType, setFilterExamType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const [subjectsList, setSubjectsList] = useState<SubjectInfo[]>([]);
  const [examTypesList, setExamTypesList] = useState<string[]>(["All"]);
  const [examTypeStatsList, setExamTypeStatsList] = useState<SubjectInfo[]>([]);
  const [isTogglingSubject, setIsTogglingSubject] = useState<string | null>(null);
  const [openSubjectDropdown, setOpenSubjectDropdown] = useState<string | null>(null);

  // 리스트박스 간 아이템 이동 (Transfer List) 상태
  const [transferMode, setTransferMode] = useState<"subject" | "examType">("subject");
  const [selectedInactiveItems, setSelectedInactiveItems] = useState<string[]>([]);
  const [selectedActiveItems, setSelectedActiveItems] = useState<string[]>([]);
  const [inactiveSearch, setInactiveSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  // 출제 제어 리스트 박스 드롭다운 펼침/접힘 상태 (기본 숨김)
  const [isTransferListExpanded, setIsTransferListExpanded] = useState(false);

  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("adminQuestionViewMode");
      if (saved === "list" || saved === "card") return saved;
    }
    return "card";
  });

  const handleChangeViewMode = (mode: "card" | "list") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("adminQuestionViewMode", mode);
    }
  };
  const [showQuestionId, setShowQuestionId] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCardActiveButtons, setShowCardActiveButtons] = useState(() => {
    if (typeof window !== "undefined") {
      const savedCardToggle = localStorage.getItem("showCardActiveButtons");
      if (savedCardToggle !== null) return savedCardToggle === "true";
    }
    return true;
  });

  const [, setIsScrolledDown] = useState(false);
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [refreshKey, setRefreshKey] = useState(0);
  const fetchQuestions = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      setIsLoading(true);
      try {
        invalidateQuestionsCache();
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(pageSize),
          subject: filterSubject,
          examType: filterExamType,
          search: debouncedSearch,
          sortBy,
        });

        const res = await fetch(`/api/questions?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (!ignore) {
            setSavedQuestions(data.questions || []);
            setTotalCount(data.total || 0);
            setTotalPages(data.totalPages || 1);
            if (Array.isArray(data.subjects)) {
              setSubjectsList(data.subjects);
            }
            if (Array.isArray(data.examTypes)) {
              setExamTypesList(["All", ...data.examTypes]);
            }
            if (Array.isArray(data.examTypeStats)) {
              setExamTypeStatsList(data.examTypeStats);
            }
          }
        }
      } catch {
        console.error("Failed to fetch questions");
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [currentPage, pageSize, filterSubject, filterExamType, debouncedSearch, sortBy, refreshKey]);

  // 리스트박스 간 항목 이동 (다중/단일)
  const handleTransferItems = async (targetNames: string[], nextState: boolean) => {
    if (targetNames.length === 0) return;
    const modeLabel = transferMode === "subject" ? "과목" : "회차";

    setIsTogglingSubject(targetNames.join(","));
    try {
      const body =
        transferMode === "subject"
          ? { targetSubjects: targetNames, isActive: nextState }
          : { targetExamTypes: targetNames, isActive: nextState };

      const res = await fetch("/api/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        if (nextState) {
          setSelectedInactiveItems((prev) => prev.filter((id) => !targetNames.includes(id)));
        } else {
          setSelectedActiveItems((prev) => prev.filter((id) => !targetNames.includes(id)));
        }
        invalidateQuestionsCache();
        fetchQuestions();
      } else {
        alert(`${modeLabel} 상태 변경에 실패했습니다.`);
      }
    } catch {
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsTogglingSubject(null);
    }
  };

  // 전체 항목 일괄 이동
  const handleTransferAll = async (nextState: boolean) => {
    const modeLabel = transferMode === "subject" ? "모든 과목" : "모든 회차";
    const actionLabel = nextState ? "전체 출제 활성화" : "전체 비활성화";

    if (!confirm(`${modeLabel}을 ${actionLabel}하시겠습니까?`)) return;

    setIsTogglingSubject("All");
    try {
      const body =
        transferMode === "subject"
          ? { targetSubject: "All", isActive: nextState }
          : { targetExamType: "All", isActive: nextState };

      const res = await fetch("/api/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setSelectedInactiveItems([]);
        setSelectedActiveItems([]);
        invalidateQuestionsCache();
        fetchQuestions();
      } else {
        alert("일괄 변경에 실패했습니다.");
      }
    } catch {
      alert("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsTogglingSubject(null);
    }
  };

  // 과목 또는 회차 전체 삭제
  const handleDeleteGroup = async (itemName: string, totalCount: number) => {
    const modeLabel = transferMode === "subject" ? "과목" : "회차";
    const paramKey = transferMode === "subject" ? "deleteSubject" : "deleteExamType";

    if (
      !confirm(
        `[데이터 삭제 확인]\n\n'${itemName}' ${modeLabel}에 속한 문제 (${totalCount}개)를 데이터베이스에서 삭제하시겠습니까?\n\n※ 삭제된 데이터는 복구할 수 없습니다.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/questions?${paramKey}=${encodeURIComponent(itemName)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || `${modeLabel}의 모든 문제가 삭제되었습니다.`);
        setSelectedInactiveItems((prev) => prev.filter((id) => id !== itemName));
        setSelectedActiveItems((prev) => prev.filter((id) => id !== itemName));
        invalidateQuestionsCache();
        fetchQuestions();
      } else {
        alert("삭제 처리에 실패했습니다.");
      }
    } catch {
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  // 선택한 항목 일괄 삭제
  const handleDeleteSelected = async (fromSide: "inactive" | "active") => {
    const targets = fromSide === "inactive" ? selectedInactiveItems : selectedActiveItems;
    if (targets.length === 0) return;
    const modeLabel = transferMode === "subject" ? "과목" : "회차";
    const paramKey = transferMode === "subject" ? "deleteSubject" : "deleteExamType";

    if (
      !confirm(
        `[선택 항목 삭제]\n\n선택한 ${targets.length}개의 ${modeLabel} (${targets.join(
          ", ",
        )})에 포함된 모든 문제를 삭제하시겠습니까?\n\n※ 삭제된 데이터는 복구할 수 없습니다.`,
      )
    ) {
      return;
    }

    try {
      for (const name of targets) {
        await fetch(`/api/questions?${paramKey}=${encodeURIComponent(name)}`, {
          method: "DELETE",
        });
      }
      alert(`선택한 ${targets.length}개 ${modeLabel}의 모든 문제가 삭제되었습니다.`);
      setSelectedInactiveItems([]);
      setSelectedActiveItems([]);
      invalidateQuestionsCache();
      fetchQuestions();
    } catch {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openSubjectDropdown) {
          setOpenSubjectDropdown(null);
          return;
        }
        if (isModalOpen) setIsModalOpen(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isSettingsOpen, openSubjectDropdown]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-combobox-root]")) {
        setOpenSubjectDropdown(null);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSettingsOpen]);

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
    if (!confirm("모든 문제의 풀이 및 정답 이력이 초기화됩니다. 계속 진행하시겠습니까?"))
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

  const subjects = ["All", ...subjectsList.map((s) => s.name)];
  const examTypes = examTypesList;
  const filteredQuestions = savedQuestions;

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
                문항 및 시험 데이터 관리
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
          <div className="flex justify-between items-center mb-3 border-b border-gray-200 dark:border-gray-800 pb-3 gap-2 flex-wrap">
            <h2 className="text-base md:text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              등록된 문제 목록{" "}
              <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {totalCount.toLocaleString()}개 문항
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 dark:bg-[#2d2d2d] p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => handleChangeViewMode("card")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    viewMode === "card"
                      ? "bg-white dark:bg-[#1e1e1e] text-yellow-600 dark:text-yellow-400 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                  title="카드 뷰로 보기"
                >
                  <LayoutGrid size={15} />
                  <span className="hidden sm:inline">카드</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeViewMode("list")}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white dark:bg-[#1e1e1e] text-yellow-600 dark:text-yellow-400 shadow-xs"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  }`}
                  title="리스트 뷰로 보기"
                >
                  <List size={15} />
                  <span className="hidden sm:inline">리스트</span>
                </button>
              </div>

              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold px-3.5 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer text-xs sm:text-sm shrink-0"
              >
                <PlusCircle size={16} /> 새 문제 추가
              </button>
            </div>
          </div>

          {/* 검색 및 필터 컨트롤 바 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3">
            <div className="relative sm:col-span-2 lg:col-span-1 flex items-center">
              <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="문제 내용 또는 ID 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
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
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer text-gray-900 dark:text-white"
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
                setFilterExamType("All");
                setCurrentPage(1);
              }}
              className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer text-gray-900 dark:text-white"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "전체 과목 필터" : s}
                </option>
              ))}
            </select>

            <select
              value={filterExamType}
              onChange={(e) => {
                setFilterExamType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer text-gray-900 dark:text-white"
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
            className="flex-1 overflow-y-auto pr-1 relative"
          >
            {isLoading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-[#1e1e1e]/60 backdrop-blur-2xs flex items-center justify-center z-10 rounded-xl">
                <div className="flex items-center gap-2 bg-white dark:bg-[#2d2d2d] px-4 py-2.5 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300">
                  <Loader2 size={16} className="animate-spin text-yellow-500" />
                  문제를 불러오는 중...
                </div>
              </div>
            )}
            {filteredQuestions.length === 0 ? (
              <p className="text-gray-500 text-center py-12 text-sm">
                조건에 맞는 문제가 없습니다.
              </p>
            ) : viewMode === "card" ? (
              /* 카드형 그리드 뷰 */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-2">
                {filteredQuestions.map((q) => {
                  const attemptCount = q.history?.length || 0;
                  const correctCount = q.history?.filter((h) => h.isCorrect).length || 0;
                  const isItemActive = q.isActive ?? true;
                  const accuracy = attemptCount > 0 ? Math.round((correctCount / attemptCount) * 100) : 0;

                  return (
                    <div
                      key={q._id}
                      onClick={() => openEditModal(q)}
                      className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 group cursor-pointer hover:shadow-md ${
                        isItemActive
                          ? "bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700/80 hover:border-yellow-500"
                          : "bg-red-50/20 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 opacity-60"
                      }`}
                    >
                      {/* 카드 상단 배지 헤더 */}
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-extrabold bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-md">
                              {q.subject}
                            </span>
                            <span className="text-[10px] bg-gray-200/80 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md font-medium">
                              {q.examType}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                q.questionType === "multiple-choice"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                              }`}
                            >
                              {q.questionType === "multiple-choice" ? "객관식" : "단답형"}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 ${
                              isItemActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                            }`}
                          >
                            {isItemActive ? "활성" : "비활성"}
                          </span>
                        </div>

                        {/* 문제 타이틀 */}
                        <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                          <span className="text-yellow-600 dark:text-yellow-500 mr-1.5">#{q.questionNumber}</span>
                          {q.title}
                        </div>

                        {/* 메타 태그 (코드 포함 여부, 보기 개수 등) */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px] text-gray-500 dark:text-gray-400">
                          {q.codeSnippet && (
                            <span className="inline-flex items-center gap-1 bg-gray-200/60 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px] text-gray-600 dark:text-gray-300 font-mono">
                              <Code size={11} /> 코드 스니펫
                            </span>
                          )}
                          {q.questionType === "multiple-choice" && q.options && (
                            <span className="bg-gray-200/60 dark:bg-gray-800 px-2 py-0.5 rounded text-[10px]">
                              보기 {q.options.filter(Boolean).length}개
                            </span>
                          )}
                          {showQuestionId && (
                            <span className="text-[10px] font-mono bg-gray-200/70 dark:bg-black/40 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                              ID: {q._id}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 카드 푸터: 통계 및 액션 버튼들 */}
                      <div
                        className="pt-2.5 border-t border-gray-200/70 dark:border-gray-700/60 flex items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          <span>풀이 <strong>{attemptCount}</strong>회</span>
                          {attemptCount > 0 && (
                            <span className="ml-1.5 text-green-600 dark:text-green-400 font-semibold">
                              ({accuracy}%)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {showCardActiveButtons && (
                            <button
                              type="button"
                              onClick={(e) => handleToggleCardActive(e, q)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer ${
                                isItemActive
                                  ? "bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25"
                                  : "bg-red-500/15 text-red-600 dark:text-red-400 hover:bg-red-500/25"
                              }`}
                              title="문제 활성화/비활성화 토글"
                            >
                              {isItemActive ? "ON" : "OFF"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleResetHistory(q._id)}
                            className="p-1.5 bg-gray-200/80 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="풀이 기록 초기화"
                          >
                            <RotateCcw size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(q._id)}
                            className="p-1.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 리스트형 뷰 */
              <div className="space-y-3 pb-2">
                {filteredQuestions.map((q) => {
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
                            {isItemActive ? "활성" : "비활성"}
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
                })}
              </div>
            )}
          </div>

          {/* 페이지네이션 컨트롤 바 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-200 dark:border-gray-800 text-xs mt-auto">
            <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400">
              <span>
                전체 <strong className="text-gray-800 dark:text-gray-200">{totalCount.toLocaleString()}</strong>개 중{" "}
                <strong className="text-gray-800 dark:text-gray-200">
                  {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} ~{" "}
                  {Math.min(currentPage * pageSize, totalCount)}
                </strong>
                번째 문항 ({currentPage} / {totalPages} 페이지)
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-gray-100 dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                <option value={20}>20개씩</option>
                <option value={50}>50개씩</option>
                <option value={100}>100개씩</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1 || isLoading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="첫 페이지"
              >
                <ChevronsLeft size={15} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="이전 페이지"
              >
                <ChevronLeft size={15} />
              </button>

              {getPageNumbers(currentPage, totalPages).map((p, idx) =>
                p === "..." ? (
                  <span key={`dots-${idx}`} className="px-1.5 py-1 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    type="button"
                    onClick={() => setCurrentPage(Number(p))}
                    disabled={isLoading}
                    className={`min-w-[30px] h-7 px-1.5 rounded-lg font-bold transition-all cursor-pointer text-xs ${
                      currentPage === p
                        ? "bg-yellow-500 text-white dark:text-black shadow-xs"
                        : "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d]"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || isLoading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="다음 페이지"
              >
                <ChevronRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages || isLoading}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="마지막 페이지"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* 페이지 설정 모달 */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 animate-fade-in border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-500">
                    <Settings size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      출제 및 문항 관리 설정
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      과목 및 회차별 출제 상태 설정과 데이터 초기화를 관리합니다.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-[#2d2d2d] rounded-full hover:bg-gray-200 dark:hover:bg-[#383838] cursor-pointer"
                >
                  <X size={18} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-5">
                {/* 과목/회차별 출제 상태 관리 (Transfer List) */}
                <div className="bg-gray-50 dark:bg-[#252526] rounded-2xl border border-gray-200 dark:border-gray-700/80 overflow-hidden shadow-2xs transition-all">
                  <button
                    type="button"
                    onClick={() => setIsTransferListExpanded(!isTransferListExpanded)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-100/70 dark:hover:bg-[#2d2d2d]/60 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2.5 rounded-xl transition-all ${
                          isTransferListExpanded
                            ? "bg-yellow-500 text-black shadow-xs font-black"
                            : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 group-hover:bg-yellow-500/20"
                        }`}
                      >
                        <SlidersHorizontal size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white">
                            과목 및 회차별 출제 설정
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-950/80 text-yellow-800 dark:text-yellow-300">
                            출제 상태 변경
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {isTransferListExpanded
                            ? "목록 항목을 이동하여 모의고사 출제 여부를 설정합니다."
                            : `등록 과목 ${subjectsList.length}개 · 회차 ${examTypeStatsList.length}개 (클릭하여 설정 펼치기)`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 hidden sm:inline">
                        {isTransferListExpanded ? "접기" : "펼치기"}
                      </span>
                      <div
                        className={`p-1.5 rounded-lg bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 transition-transform duration-200 ${
                          isTransferListExpanded ? "rotate-180" : ""
                        }`}
                      >
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </button>

                  {/* 펼쳐지는 리스트박스 본체 영역 */}
                  {isTransferListExpanded && (
                    <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700/80 space-y-4 animate-fade-in bg-white/40 dark:bg-[#1f1f20]/60">
                      {/* 상단 탭: 과목 기준 관리 vs 회차 기준 관리 */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700/80 pb-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTransferMode("subject");
                          setSelectedInactiveItems([]);
                          setSelectedActiveItems([]);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          transferMode === "subject"
                            ? "bg-yellow-500 text-black shadow-xs font-black"
                            : "bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 hover:text-gray-900 border border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <BookOpen size={16} />
                        <span>과목 기준 관리 ({subjectsList.length}개)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTransferMode("examType");
                          setSelectedInactiveItems([]);
                          setSelectedActiveItems([]);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          transferMode === "examType"
                            ? "bg-yellow-500 text-black shadow-xs font-black"
                            : "bg-white dark:bg-[#1e1e1e] text-gray-600 dark:text-gray-400 hover:text-gray-900 border border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <Calendar size={16} />
                        <span>회차 기준 관리 ({examTypeStatsList.length}개)</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <SlidersHorizontal size={13} className="text-yellow-500" />
                      <span>
                        {transferMode === "subject" ? "과목" : "회차"}을 양쪽 목록 간 이동하여
                        출제 상태를 설정합니다.
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const currentGroupList =
                      transferMode === "subject" ? subjectsList : examTypeStatsList;
                    const inactiveList = currentGroupList.filter((item) => !item.isActive);
                    const activeList = currentGroupList.filter((item) => item.isActive);

                    const filteredInactive = inactiveList.filter((item) =>
                      item.name.toLowerCase().includes(inactiveSearch.toLowerCase()),
                    );
                    const filteredActive = activeList.filter((item) =>
                      item.name.toLowerCase().includes(activeSearch.toLowerCase()),
                    );

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3.5 items-center">
                        {/* 좌측: 미출제 목록 (비활성) */}
                        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-rose-200/90 dark:border-rose-950/60 p-3.5 space-y-3 flex flex-col h-[380px] shadow-2xs">
                          {/* 헤더 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                              <span className="text-xs font-bold text-gray-900 dark:text-white">
                                미출제 목록 (비활성)
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300">
                                {inactiveList.length}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  selectedInactiveItems.length === filteredInactive.length &&
                                  filteredInactive.length > 0
                                ) {
                                  setSelectedInactiveItems([]);
                                } else {
                                  setSelectedInactiveItems(filteredInactive.map((i) => i.name));
                                }
                              }}
                              className="text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-semibold cursor-pointer"
                            >
                              {selectedInactiveItems.length === filteredInactive.length &&
                              filteredInactive.length > 0
                                ? "선택 해제"
                                : "전체 선택"}
                            </button>
                          </div>

                          {/* 검색창 */}
                          <div className="relative">
                            <Search
                              size={13}
                              className="absolute left-2.5 top-2.5 text-gray-400"
                            />
                            <input
                              type="text"
                              value={inactiveSearch}
                              onChange={(e) => setInactiveSearch(e.target.value)}
                              placeholder={`${
                                transferMode === "subject" ? "비활성 과목" : "비활성 회차"
                              } 검색...`}
                              className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded-xl pl-7 pr-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            />
                          </div>

                          {/* 아이템 목록 */}
                          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                            {filteredInactive.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-1 py-8">
                                <Layers size={22} className="opacity-30" />
                                <p className="text-xs">미출제 항목이 없습니다.</p>
                              </div>
                            ) : (
                              filteredInactive.map((item) => {
                                const isSelected = selectedInactiveItems.includes(item.name);
                                return (
                                  <div
                                    key={item.name}
                                    onClick={() => {
                                      setSelectedInactiveItems((prev) =>
                                        prev.includes(item.name)
                                          ? prev.filter((id) => id !== item.name)
                                          : [...prev, item.name],
                                      );
                                    }}
                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs select-none ${
                                      isSelected
                                        ? "bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 font-bold"
                                        : "bg-gray-50 dark:bg-[#222222] border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      {isSelected ? (
                                        <CheckSquare
                                          size={15}
                                          className="text-rose-500 shrink-0"
                                        />
                                      ) : (
                                        <Square size={15} className="text-gray-400 shrink-0" />
                                      )}
                                      <span className="truncate" title={item.name}>
                                        {item.name}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                        ({item.total}문제)
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {/* 단일 즉시 활성화 버튼 */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTransferItems([item.name], true);
                                        }}
                                        className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                        title="출제 활성화"
                                      >
                                        <ArrowRight size={14} />
                                      </button>
                                      {/* 삭제 버튼 */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteGroup(item.name, item.total);
                                        }}
                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-950/60 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                        title="해당 과목/회차 전체 문제 삭제"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* 하단 푸터: 선택 항목 일괄 삭제 */}
                          {selectedInactiveItems.length > 0 && (
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs">
                              <span className="text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                                {selectedInactiveItems.length}개 선택됨
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSelected("inactive")}
                                className="text-[11px] text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                <span>선택 항목 삭제</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 중앙 제어: 상태 전환 버튼 */}
                        <div className="flex md:flex-col justify-center items-center gap-2 py-2">
                          <button
                            type="button"
                            disabled={
                              selectedInactiveItems.length === 0 || isTogglingSubject !== null
                            }
                            onClick={() => handleTransferItems(selectedInactiveItems, true)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                            title="선택 항목 활성화"
                          >
                            <span>활성화</span>
                            <ArrowRight size={14} className="hidden md:inline" />
                          </button>

                          <button
                            type="button"
                            disabled={
                              selectedActiveItems.length === 0 || isTogglingSubject !== null
                            }
                            onClick={() => handleTransferItems(selectedActiveItems, false)}
                            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                            title="선택 항목 비활성화"
                          >
                            <ArrowLeft size={14} className="hidden md:inline" />
                            <span>비활성화</span>
                          </button>

                          <div className="hidden md:block w-8 border-b border-gray-200 dark:border-gray-700 my-1" />

                          <button
                            type="button"
                            disabled={isTogglingSubject !== null || inactiveList.length === 0}
                            onClick={() => handleTransferAll(true)}
                            className="p-2 bg-gray-100 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-30 cursor-pointer"
                            title="전체 출제 활성화 (≫)"
                          >
                            <ChevronsRight size={15} />
                          </button>

                          <button
                            type="button"
                            disabled={isTogglingSubject !== null || activeList.length === 0}
                            onClick={() => handleTransferAll(false)}
                            className="p-2 bg-gray-100 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-30 cursor-pointer"
                            title="전체 비활성화 (≪)"
                          >
                            <ChevronsLeft size={15} />
                          </button>
                        </div>

                        {/* 우측: 출제 목록 (활성) */}
                        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-emerald-200/90 dark:border-emerald-950/60 p-3.5 space-y-3 flex flex-col h-[380px] shadow-2xs">
                          {/* 헤더 */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                              <span className="text-xs font-bold text-gray-900 dark:text-white">
                                출제 목록 (활성)
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                                {activeList.length}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  selectedActiveItems.length === filteredActive.length &&
                                  filteredActive.length > 0
                                ) {
                                  setSelectedActiveItems([]);
                                } else {
                                  setSelectedActiveItems(filteredActive.map((i) => i.name));
                                }
                              }}
                              className="text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-semibold cursor-pointer"
                            >
                              {selectedActiveItems.length === filteredActive.length &&
                              filteredActive.length > 0
                                ? "선택 해제"
                                : "전체 선택"}
                            </button>
                          </div>

                          {/* 검색창 */}
                          <div className="relative">
                            <Search
                              size={13}
                              className="absolute left-2.5 top-2.5 text-gray-400"
                            />
                            <input
                              type="text"
                              value={activeSearch}
                              onChange={(e) => setActiveSearch(e.target.value)}
                              placeholder={`${
                                transferMode === "subject" ? "출제 과목" : "출제 회차"
                              } 검색...`}
                              className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded-xl pl-7 pr-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            />
                          </div>

                          {/* 아이템 목록 */}
                          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                            {filteredActive.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-1 py-8">
                                <Layers size={22} className="opacity-30" />
                                <p className="text-xs">출제 중인 항목이 없습니다.</p>
                              </div>
                            ) : (
                              filteredActive.map((item) => {
                                const isSelected = selectedActiveItems.includes(item.name);
                                return (
                                  <div
                                    key={item.name}
                                    onClick={() => {
                                      setSelectedActiveItems((prev) =>
                                        prev.includes(item.name)
                                          ? prev.filter((id) => id !== item.name)
                                          : [...prev, item.name],
                                      );
                                    }}
                                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs select-none ${
                                      isSelected
                                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 font-bold"
                                        : "bg-gray-50 dark:bg-[#222222] border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      {isSelected ? (
                                        <CheckSquare
                                          size={15}
                                          className="text-emerald-500 shrink-0"
                                        />
                                      ) : (
                                        <Square size={15} className="text-gray-400 shrink-0" />
                                      )}
                                      <span className="truncate" title={item.name}>
                                        {item.name}
                                      </span>
                                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                                        ({item.total}문제)
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {/* 단일 즉시 비활성화 버튼 */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTransferItems([item.name], false);
                                        }}
                                        className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                        title="비활성화"
                                      >
                                        <ArrowLeft size={14} />
                                      </button>
                                      {/* 삭제 버튼 */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteGroup(item.name, item.total);
                                        }}
                                        className="p-1 hover:bg-red-100 dark:hover:bg-red-950/60 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                        title="해당 과목/회차 전체 문제 삭제"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* 하단 푸터: 선택 항목 일괄 삭제 */}
                          {selectedActiveItems.length > 0 && (
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                                {selectedActiveItems.length}개 선택됨
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteSelected("active")}
                                className="text-[11px] text-red-600 dark:text-red-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 size={12} />
                                <span>선택 항목 삭제</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                    </div>
                  )}
                </div>

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
                      문제 목록 카드에 고유 식별자(ID) 표시 여부를 설정합니다.
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

                <div className="p-3.5 bg-red-50/70 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/40 space-y-2">
                  <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
                    <AlertTriangle size={14} />
                    <p className="text-xs sm:text-sm font-bold">
                      데이터 초기화
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    등록된 모든 회차의 문제 풀이 및 정답 이력을 초기화합니다.
                  </p>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleResetAllHistory();
                    }}
                    className="w-full flex justify-center items-center gap-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    전체 문제 풀이 이력 초기화
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

        {/* 문제 추가/수정 모달 */}
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
                    <span>{isPreviewMode ? "편집 모드" : "미리보기"}</span>
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
                      <span>시험 응시 화면 미리보기</span>
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
                            정답 및 해설
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
