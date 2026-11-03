"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  Trash2,
  Lightbulb,
  Home,
  Edit3,
  X,
  Moon,
  Sun,
  Search,
  Filter,
  Archive,
  GitCommit,
  ChevronDown,
  ChevronUp,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Kanban,
  LayoutGrid,
  CheckCircle2,
  RotateCcw,
  Play,
  Save,
  Check,
  AlertCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useMounted } from "@/lib/hooks/useMounted";

interface HistoryChange {
  field: string;
  oldValue: string;
  newValue: string;
}

interface HistoryLog {
  _id?: string;
  message: string;
  changes?: HistoryChange[];
  updatedAt: string;
}

interface IdeaType {
  _id: string;
  title: string;
  description?: string;
  status: "idea" | "progress" | "completed";
  priority: "urgent" | "high" | "medium" | "low";
  authorEmail?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
  historyLogs?: HistoryLog[];
}

interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error" | "info";
}

const PRIORITY_CONFIG = {
  urgent: { label: "긴급", badgeClass: "bg-red-500/15 text-red-500 border-red-500/30", dotClass: "bg-red-500" },
  high: { label: "높음", badgeClass: "bg-orange-500/15 text-orange-500 border-orange-500/30", dotClass: "bg-orange-500" },
  medium: { label: "보통", badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", dotClass: "bg-amber-500" },
  low: { label: "낮음", badgeClass: "bg-gray-500/15 text-gray-500 border-gray-500/30", dotClass: "bg-gray-400" },
} as const;

const PRIORITY_WEIGHT = { urgent: 4, high: 3, medium: 2, low: 1 } as const;

const STATUS_CONFIG = {
  idea: { label: "제안", badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", dotClass: "bg-amber-500" },
  progress: { label: "진행 중", badgeClass: "bg-blue-500/15 text-blue-500 border-blue-500/30", dotClass: "bg-blue-500" },
  completed: { label: "완료", badgeClass: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", dotClass: "bg-emerald-500" },
} as const;

export default function IdeasPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const userEmail = session?.user?.email;

  const [ideas, setIdeas] = useState<IdeaType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 뷰 모드 (칸반 보드 vs 그리드)
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");

  // 빠른 등록 상태
  const [quickTitle, setQuickTitle] = useState("");
  const [quickDesc, setQuickDesc] = useState("");
  const [quickPriority, setQuickPriority] = useState<"urgent" | "high" | "medium" | "low">("medium");
  const [quickStatus, setQuickStatus] = useState<"idea" | "progress" | "completed">("idea");
  const [isQuickExpanded, setIsQuickExpanded] = useState(false);
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  // 인라인 수정 상태 (카드 내부 직접 수정)
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineData, setInlineData] = useState<{
    title: string;
    description: string;
    status: "idea" | "progress" | "completed";
    priority: "urgent" | "high" | "medium" | "low";
  }>({
    title: "",
    description: "",
    status: "idea",
    priority: "medium",
  });
  const [isInlineSaving, setIsInlineSaving] = useState(false);

  // 상세 모달
  const [selectedCard, setSelectedCard] = useState<IdeaType | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});
  const [isModalEditing, setIsModalEditing] = useState(false);
  const [modalEditData, setModalEditData] = useState({
    title: "",
    description: "",
    status: "idea" as "idea" | "progress" | "completed",
    priority: "medium" as "urgent" | "high" | "medium" | "low",
  });

  // 필터 & 검색 & 정렬
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "idea" | "progress" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "urgent" | "high" | "medium" | "low">("all");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "title" | "priority">("latest");
  const [hideCompleted, setHideCompleted] = useState(false);

  // 그리드 모드 페이징
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  // 토스트 알림
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  // 모바일 전용 칸반 컬럼 탭 (제안 | 진행 중 | 완료)
  const [mobileTab, setMobileTab] = useState<"idea" | "progress" | "completed">("idea");

  // 데스크탑 컬럼별 접기/펼치기 상태
  const [collapsedCols, setCollapsedCols] = useState<{
    idea: boolean;
    progress: boolean;
    completed: boolean;
  }>({
    idea: false,
    progress: false,
    completed: false,
  });

  // 카드 표시 밀도 (일반 vs 컴팩트)
  const [cardDensity, setCardDensity] = useState<"normal" | "compact">("normal");

  // 컬럼별 점진적 로딩 제한 (기본 15개, 대량 카드 시각/성능 부하 방지)
  const [columnLimits, setColumnLimits] = useState<{
    idea: number;
    progress: number;
    completed: number;
  }>({
    idea: 15,
    progress: 15,
    completed: 15,
  });

  const mounted = useMounted();
  const { theme, setTheme } = useTheme();

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  const fetchIdeas = async () => {
    try {
      const res = await fetch("/api/ideas");
      if (res.ok) {
        const data = await res.json();
        setIdeas(data);
        setSelectedCard((prev) => {
          if (!prev) return null;
          return data.find((i: IdeaType) => i._id === prev._id) || prev;
        });
      }
    } catch {
      showToast("데이터를 불러오는 중 문제가 발생했습니다.", "error");
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/ideas");
        if (res.ok && isMounted) {
          const data = await res.json();
          setIdeas(data);
        }
      } catch {
        console.error("Failed to load ideas");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. 빠른 원클릭 상태 변경 (진행하기, 완료하기, 재개하기)
  const handleQuickStatusChange = async (
    e: React.MouseEvent,
    item: IdeaType,
    nextStatus: "idea" | "progress" | "completed"
  ) => {
    e.stopPropagation();
    if (!isAdmin) {
      showToast("상태 변경 권한이 없습니다 (관리자 전용)", "error");
      return;
    }

    // 낙관적 업데이트 (즉각 반영)
    const prevIdeas = [...ideas];
    setIdeas((prev) =>
      prev.map((i) =>
        i._id === item._id
          ? {
              ...i,
              status: nextStatus,
              completedAt: nextStatus === "completed" ? new Date().toISOString() : null,
              updatedAt: new Date().toISOString(),
            }
          : i
      )
    );

    try {
      const res = await fetch("/api/ideas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: item._id,
          title: item.title,
          description: item.description,
          status: nextStatus,
          priority: item.priority,
          commitMessage: `상태 변경: ${STATUS_CONFIG[item.status].label} ➔ ${STATUS_CONFIG[nextStatus].label}`,
        }),
      });

      if (!res.ok) throw new Error("Status update failed");
      showToast(`'${item.title}' 항목이 '${STATUS_CONFIG[nextStatus].label}' 상태로 변경되었습니다.`);
      fetchIdeas();
    } catch {
      setIdeas(prevIdeas);
      showToast("상태 변경에 실패했습니다. 다시 시도해 주세요.", "error");
    }
  };

  // 2. 빠른 원클릭 우선순위 변경
  const handleQuickPriorityCycle = async (e: React.MouseEvent, item: IdeaType) => {
    e.stopPropagation();
    if (!isAdmin) return;

    const cycleOrder: ("low" | "medium" | "high" | "urgent")[] = ["low", "medium", "high", "urgent"];
    const currentIndex = cycleOrder.indexOf(item.priority || "medium");
    const nextPriority = cycleOrder[(currentIndex + 1) % cycleOrder.length];

    const prevIdeas = [...ideas];
    setIdeas((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, priority: nextPriority } : i))
    );

    try {
      const res = await fetch("/api/ideas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: item._id,
          title: item.title,
          description: item.description,
          status: item.status,
          priority: nextPriority,
          commitMessage: `우선순위 변경: ${PRIORITY_CONFIG[item.priority || "medium"].label} ➔ ${PRIORITY_CONFIG[nextPriority].label}`,
        }),
      });

      if (!res.ok) throw new Error("Priority update failed");
      showToast(`우선순위: ${PRIORITY_CONFIG[nextPriority].label}`);
      fetchIdeas();
    } catch {
      setIdeas(prevIdeas);
      showToast("우선순위 변경에 실패했습니다.", "error");
    }
  };

  // 3. 카드 내부 인라인 수정 시작
  const startInlineEdit = (e: React.MouseEvent, item: IdeaType) => {
    e.stopPropagation();
    const canEdit = isAdmin || item.authorEmail === userEmail;
    if (!canEdit) {
      showToast("본인이 작성한 항목만 수정할 수 있습니다.", "error");
      return;
    }
    setInlineEditingId(item._id);
    setInlineData({
      title: item.title,
      description: item.description || "",
      status: item.status,
      priority: item.priority || "medium",
    });
  };

  const cancelInlineEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setInlineEditingId(null);
  };

  const saveInlineEdit = async (e: React.FormEvent, item: IdeaType) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inlineData.title.trim()) {
      showToast("제목을 입력해 주세요.", "error");
      return;
    }

    setIsInlineSaving(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: item._id,
          title: inlineData.title.trim(),
          description: inlineData.description.trim(),
          status: isAdmin ? inlineData.status : item.status,
          priority: isAdmin ? inlineData.priority : item.priority,
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      setInlineEditingId(null);
      showToast("수정 사항이 저장되었습니다.");
      fetchIdeas();
    } catch {
      showToast("저장 중 오류가 발생했습니다.", "error");
    } finally {
      setIsInlineSaving(false);
    }
  };

  // 4. 빠른 신규 아이디어 등록 (상단 한 줄 입력 또는 Enter)
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    setIsSubmittingQuick(true);
    try {
      const payload = {
        title: quickTitle.trim(),
        description: quickDesc.trim() || undefined,
        status: isAdmin ? quickStatus : "idea",
        priority: isAdmin ? quickPriority : "medium",
        authorEmail: userEmail,
      };

      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Add failed");

      setQuickTitle("");
      setQuickDesc("");
      setIsQuickExpanded(false);
      showToast(isAdmin ? "새로운 기능 아이디어가 등록되었습니다." : "소중한 아이디어가 등록되었습니다!");
      fetchIdeas();
      quickInputRef.current?.focus();
    } catch {
      showToast("등록 중 오류가 발생했습니다.", "error");
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  // 5. 항목 삭제
  const handleDeleteIdea = async (e: React.MouseEvent, item: IdeaType) => {
    e.stopPropagation();
    const canDelete = isAdmin || item.authorEmail === userEmail;
    if (!canDelete) {
      showToast("삭제 권한이 없습니다.", "error");
      return;
    }

    if (!window.confirm(`[데이터 삭제 확인]\n'${item.title}' 항목을 삭제하시겠습니까?\n삭제된 내용은 복구할 수 없습니다.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/ideas?id=${item._id}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedCard?._id === item._id) setSelectedCard(null);
        showToast("항목이 삭제되었습니다.");
        fetchIdeas();
      } else {
        throw new Error();
      }
    } catch {
      showToast("삭제에 실패했습니다.", "error");
    }
  };

  // 6. 상세 모달 내 직접 수정 저장
  const handleSaveModalEdit = async () => {
    if (!selectedCard) return;
    if (!modalEditData.title.trim()) {
      showToast("제목을 입력해 주세요.", "error");
      return;
    }

    try {
      const res = await fetch("/api/ideas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: selectedCard._id,
          title: modalEditData.title.trim(),
          description: modalEditData.description.trim(),
          status: isAdmin ? modalEditData.status : selectedCard.status,
          priority: isAdmin ? modalEditData.priority : selectedCard.priority,
        }),
      });

      if (!res.ok) throw new Error("Modal save failed");

      setIsModalEditing(false);
      showToast("수정 내용이 저장되었습니다.");
      fetchIdeas();
    } catch {
      showToast("저장에 실패했습니다.", "error");
    }
  };

  // 필터링 및 정렬
  const filteredIdeas = useMemo(() => {
    return ideas
      .filter((item) => {
        const matchesStatus = statusFilter === "all" || item.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
        const matchesHideCompleted = hideCompleted ? item.status !== "completed" : true;
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          item.title.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          (isAdmin && item.authorEmail && item.authorEmail.toLowerCase().includes(query));
        return matchesStatus && matchesPriority && matchesHideCompleted && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "latest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortBy === "oldest") {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        } else if (sortBy === "title") {
          return a.title.localeCompare(b.title);
        } else if (sortBy === "priority") {
          const pA = PRIORITY_WEIGHT[a.priority || "medium"] || 2;
          const pB = PRIORITY_WEIGHT[b.priority || "medium"] || 2;
          return pB - pA;
        }
        return 0;
      });
  }, [ideas, statusFilter, priorityFilter, hideCompleted, searchQuery, sortBy, isAdmin]);

  // 칸반 컬럼별 아이템 분할
  const kanbanIdeas = useMemo(() => {
    return {
      idea: filteredIdeas.filter((i) => i.status === "idea"),
      progress: filteredIdeas.filter((i) => i.status === "progress"),
      completed: filteredIdeas.filter((i) => i.status === "completed"),
    };
  }, [filteredIdeas]);

  // 그리드 페이징
  const totalPages = Math.ceil(filteredIdeas.length / ITEMS_PER_PAGE) || 1;
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const currentGridIdeas = filteredIdeas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // 카운트
  const countAll = ideas.length;
  const countIdea = ideas.filter((i) => i.status === "idea").length;
  const countProgress = ideas.filter((i) => i.status === "progress").length;
  const countCompleted = ideas.filter((i) => i.status === "completed").length;

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4 text-center text-gray-800 dark:text-gray-200 gap-3">
        <Loader2 size={36} className="animate-spin text-amber-500" />
        <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">
          아이디어 보드를 불러오는 중...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-800 dark:text-gray-200 p-3 sm:p-6 md:p-8 transition-colors">
      {/* 플로팅 토스트 알림 컨테이너 */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all transform animate-fade-in ${
              toast.type === "error"
                ? "bg-red-500 text-white border-red-600"
                : "bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white border-amber-500/40 shadow-amber-500/10"
            }`}
          >
            {toast.type === "error" ? (
              <AlertCircle size={18} className="shrink-0 text-white" />
            ) : (
              <Check size={18} className="shrink-0 text-amber-500" />
            )}
            <span className="flex-1 leading-snug">{toast.text}</span>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto space-y-5">
        {/* 상단 네비게이션 헤더 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-3 bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-2xl shrink-0">
              <Lightbulb size={24} />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black text-gray-900 dark:text-white truncate">
                  백로그 & 로드맵 보드
                </h1>
                <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold shrink-0">
                  원클릭 편집
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {isAdmin
                  ? "원클릭으로 카드를 이동하고, 카드에서 직접 제목과 상세를 수정하세요."
                  : "원하는 기능을 제안하거나 필요한 피드백을 자유롭게 남겨주세요."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* 뷰 모드 전환 버튼 (칸반 vs 그리드) */}
            <div className="hidden sm:flex bg-gray-100 dark:bg-[#252526] p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-white dark:bg-[#1e1e1e] text-amber-600 dark:text-amber-400 shadow-2xs"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                title="칸반 보드 뷰"
              >
                <Kanban size={14} /> <span>칸반 보드</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white dark:bg-[#1e1e1e] text-amber-600 dark:text-amber-400 shadow-2xs"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
                title="카드 그리드 뷰"
              >
                <LayoutGrid size={14} /> <span>그리드</span>
              </button>
            </div>

            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 bg-gray-100 dark:bg-[#252526] hover:bg-gray-200 dark:hover:bg-[#333333] rounded-2xl text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
              title="테마 변경"
              aria-label="테마 변경"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-[#252526] hover:bg-gray-200 dark:hover:bg-[#333333] px-3.5 py-2.5 rounded-2xl transition-colors font-bold text-gray-700 dark:text-gray-200"
            >
              <Home size={15} /> <span className="hidden md:inline">메인</span>
            </Link>
          </div>
        </div>

        {/* 빠른 등록 바 (Zero-Friction Quick Add) */}
        <form
          onSubmit={handleQuickAdd}
          className="bg-white dark:bg-[#1e1e1e] p-3.5 sm:p-4 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-3"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={quickInputRef}
                type="text"
                placeholder={
                  isAdmin
                    ? "새 기능 아이디어 입력 후 Enter (예: AI 모의고사 맞춤 추천)"
                    : "새로운 피드백이나 필요한 기능 제안 (Enter로 즉시 등록)"
                }
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsQuickExpanded(!isQuickExpanded)}
                className={`px-3 py-2.5 rounded-2xl text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                  isQuickExpanded
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400"
                    : "bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333]"
                }`}
                title="상세 내용 및 옵션 작성"
              >
                <span>상세 옵션</span>
                {isQuickExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <button
                type="submit"
                disabled={isSubmittingQuick || !quickTitle.trim()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
              >
                {isSubmittingQuick ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                <span>추가</span>
              </button>
            </div>
          </div>

          {/* 빠른 등록 확장 패널 (설명, 우선순위, 상태) */}
          {isQuickExpanded && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3 animate-fade-in">
              <textarea
                placeholder="상세 설명이나 구현 아이디어가 있다면 자유롭게 적어주세요 (선택사항)..."
                rows={2}
                value={quickDesc}
                onChange={(e) => setQuickDesc(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white resize-none"
              />

              {isAdmin && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-bold">초기 상태:</span>
                    <select
                      value={quickStatus}
                      onChange={(e) => setQuickStatus(e.target.value as "idea" | "progress" | "completed")}
                      className="bg-gray-50 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-gray-900 dark:text-white font-bold cursor-pointer"
                    >
                      <option value="idea">제안</option>
                      <option value="progress">진행 중</option>
                      <option value="completed">완료</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-bold">우선순위:</span>
                    <select
                      value={quickPriority}
                      onChange={(e) => setQuickPriority(e.target.value as "urgent" | "high" | "medium" | "low")}
                      className="bg-gray-50 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs text-gray-900 dark:text-white font-bold cursor-pointer"
                    >
                      <option value="urgent">긴급 (Urgent)</option>
                      <option value="high">높음 (High)</option>
                      <option value="medium">보통 (Medium)</option>
                      <option value="low">낮음 (Low)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        {/* 툴바: 상태 칩, 우선순위 필터, 검색, 정렬 */}
        <div className="bg-white dark:bg-[#1e1e1e] p-3.5 sm:p-4 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
          {/* 상태 필터 칩 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-amber-500 text-black shadow-xs"
                  : "bg-gray-100 dark:bg-[#252526] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]"
              }`}
            >
              전체 ({countAll})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("idea")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === "idea"
                  ? "bg-amber-500 text-black shadow-xs"
                  : "bg-gray-100 dark:bg-[#252526] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]"
              }`}
            >
              제안 ({countIdea})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("progress")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === "progress"
                  ? "bg-blue-500 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-[#252526] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]"
              }`}
            >
              진행 중 ({countProgress})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === "completed"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-[#252526] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]"
              }`}
            >
              완료 ({countCompleted})
            </button>
          </div>

          {/* 검색 & 우선순위 & 정렬 */}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            {/* 우선순위 필터 */}
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as "all" | "urgent" | "high" | "medium" | "low")
              }
              className="bg-gray-50 dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white cursor-pointer font-bold"
            >
              <option value="all">우선순위 전체</option>
              <option value="urgent">긴급</option>
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>

            {/* 완료 숨기기 */}
            <button
              type="button"
              onClick={() => setHideCompleted(!hideCompleted)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                hideCompleted
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                  : "bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#333]"
              }`}
              title="완료된 항목 숨기기"
            >
              <Archive size={13} /> <span>완료 숨김</span>
            </button>

            {/* 검색어 */}
            <div className="relative flex-1 sm:w-44">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
              />
            </div>

            {/* 정렬 */}
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "latest" | "oldest" | "title" | "priority")
              }
              className="bg-gray-50 dark:bg-[#252526] border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white cursor-pointer font-bold shrink-0"
            >
              <option value="latest">최신 등록순</option>
              <option value="priority">우선순위순</option>
              <option value="oldest">오래된 순</option>
              <option value="title">가나다순</option>
            </select>

            {/* 카드 밀도 토글 (일반 vs 컴팩트) */}
            <button
              type="button"
              onClick={() => setCardDensity((d) => (d === "normal" ? "compact" : "normal"))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                cardDensity === "compact"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                  : "bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-[#333]"
              }`}
              title="카드 표시 밀도 (일반 / 컴팩트) 전환"
            >
              <span>{cardDensity === "compact" ? "컴팩트 뷰" : "일반 뷰"}</span>
            </button>
          </div>
        </div>

        {/* 메인 뷰: 1) 칸반 보드 뷰 (기본) */}
        {viewMode === "kanban" ? (
          <div className="space-y-3">
            {/* 모바일 전용 칸반 컬럼 탭 (제안 | 진행 중 | 완료) - 스크롤 지옥 제거 */}
            <div className="md:hidden flex bg-white dark:bg-[#1e1e1e] p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs gap-1.5">
              <button
                type="button"
                onClick={() => setMobileTab("idea")}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileTab === "idea"
                    ? "bg-amber-500 text-black shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-50 dark:bg-[#252526]"
                }`}
              >
                <span>제안</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    mobileTab === "idea"
                      ? "bg-black/20 text-black"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  {kanbanIdeas.idea.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("progress")}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileTab === "progress"
                    ? "bg-blue-500 text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-50 dark:bg-[#252526]"
                }`}
              >
                <span>진행 중</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    mobileTab === "progress" ? "bg-white/20 text-white" : "bg-blue-500/15 text-blue-500"
                  }`}
                >
                  {kanbanIdeas.progress.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("completed")}
                className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobileTab === "completed"
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 bg-gray-50 dark:bg-[#252526]"
                }`}
              >
                <span>완료</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    mobileTab === "completed" ? "bg-white/20 text-white" : "bg-emerald-500/15 text-emerald-500"
                  }`}
                >
                  {kanbanIdeas.completed.length}
                </span>
              </button>
            </div>

            {/* 칸반 3단 컬럼 영역 (모바일: 선택된 단일 탭만 전폭 노출, 데스크탑: 3열 독립 스크롤 & 컬럼 접기 지원) */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch w-full">
              {renderKanbanColumn("idea")}
              {renderKanbanColumn("progress")}
              {renderKanbanColumn("completed")}
            </div>
          </div>
        ) : (
          /* 메인 뷰: 2) 카드 그리드 뷰 */
          <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-4 sm:p-6 rounded-3xl shadow-sm min-h-[460px] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Filter size={15} className="text-amber-500" />
                  <span>백로그 목록</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">
                    {filteredIdeas.length}개
                  </span>
                </h3>
                <span className="text-[11px] text-gray-400">
                  카드 본문을 클릭하면 상세 히스토리를 확인하실 수 있습니다.
                </span>
              </div>

              {currentGridIdeas.length === 0 ? (
                <div className="text-center py-20 text-gray-400 text-xs sm:text-sm">
                  조건에 일치하는 아이디어가 없습니다. 검색어나 필터를 변경해 보세요.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {currentGridIdeas.map((item) => renderCard(item))}
                </div>
              )}
            </div>

            {/* 그리드 페이징 */}
            {filteredIdeas.length > 0 && (
              <div className="flex justify-between items-center pt-5 mt-5 border-t border-gray-100 dark:border-gray-800 text-xs">
                <span className="text-gray-500 dark:text-gray-400">
                  총 <strong className="text-gray-900 dark:text-white font-black">{filteredIdeas.length}</strong>개 중{" "}
                  <b>{startIndex + 1}</b> - <b>{Math.min(startIndex + ITEMS_PER_PAGE, filteredIdeas.length)}</b>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-[#252526] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-[#333] transition-colors cursor-pointer"
                    title="이전 페이지"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="flex items-center gap-1 px-2 font-black">
                    <span>{currentPage}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-400">{totalPages}</span>
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-gray-100 dark:bg-[#252526] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-[#333] transition-colors cursor-pointer"
                    title="다음 페이지"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 상세 모달 창 (상세 보기 & 모달 내부 직접 수정 지원) */}
        {selectedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-7 space-y-5 my-auto">
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold border ${
                        STATUS_CONFIG[selectedCard.status].badgeClass
                      }`}
                    >
                      {STATUS_CONFIG[selectedCard.status].label}
                    </span>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold border ${
                        PRIORITY_CONFIG[selectedCard.priority || "medium"].badgeClass
                      }`}
                    >
                      {PRIORITY_CONFIG[selectedCard.priority || "medium"].label}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      ID: {selectedCard._id.slice(-6)}
                    </span>
                  </div>

                  {isModalEditing ? (
                    <input
                      type="text"
                      value={modalEditData.title}
                      onChange={(e) => setModalEditData({ ...modalEditData, title: e.target.value })}
                      className="w-full text-base sm:text-lg font-black bg-gray-50 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  ) : (
                    <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-snug">
                      {selectedCard.title}
                    </h2>
                  )}
                </div>

                <button
                  onClick={() => {
                    setSelectedCard(null);
                    setIsModalEditing(false);
                  }}
                  className="p-1.5 sm:p-2 bg-gray-100 dark:bg-[#252526] hover:bg-gray-200 dark:hover:bg-[#333] rounded-full transition-colors cursor-pointer text-gray-500 shrink-0"
                  aria-label="닫기"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 모달 메타데이터 & 빠른 상태 변경 바 */}
              <div className="bg-gray-50 dark:bg-[#252526] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-gray-400 block text-[10px]">최초 등록</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {new Date(selectedCard.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {(isAdmin || selectedCard.authorEmail === userEmail) && selectedCard.authorEmail && (
                    <div>
                      <span className="text-gray-400 block text-[10px]">작성자</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[160px] block">
                        {selectedCard.authorEmail}
                      </span>
                    </div>
                  )}
                </div>

                {/* 관리자 모달 내 빠른 상태 변경 버튼 */}
                {isAdmin && !isModalEditing && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400 font-bold mr-1">상태 변경:</span>
                    {(["idea", "progress", "completed"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={(e) => handleQuickStatusChange(e, selectedCard, st)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          selectedCard.status === st
                            ? "bg-amber-500 text-black border-amber-500 shadow-2xs"
                            : "bg-white dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-amber-500"
                        }`}
                      >
                        {STATUS_CONFIG[st].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 상세 내용 / 구현 방안 */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400">상세 설명 / 요구사항</h3>
                {isModalEditing ? (
                  <div className="space-y-3">
                    <textarea
                      rows={4}
                      value={modalEditData.description}
                      onChange={(e) => setModalEditData({ ...modalEditData, description: e.target.value })}
                      placeholder="상세 내용을 입력해 주세요..."
                      className="w-full text-xs sm:text-sm bg-gray-50 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded-2xl p-3.5 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                    />

                    {isAdmin && (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-[11px] font-bold text-gray-500 mb-1">상태</label>
                          <select
                            value={modalEditData.status}
                            onChange={(e) =>
                              setModalEditData({ ...modalEditData, status: e.target.value as "idea" | "progress" | "completed" })
                            }
                            className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white"
                          >
                            <option value="idea">제안</option>
                            <option value="progress">진행 중</option>
                            <option value="completed">완료</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-[11px] font-bold text-gray-500 mb-1">우선순위</label>
                          <select
                            value={modalEditData.priority}
                            onChange={(e) =>
                              setModalEditData({ ...modalEditData, priority: e.target.value as "urgent" | "high" | "medium" | "low" })
                            }
                            className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white"
                          >
                            <option value="urgent">긴급 (Urgent)</option>
                            <option value="high">높음 (High)</option>
                            <option value="medium">보통 (Medium)</option>
                            <option value="low">낮음 (Low)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-[#252526] p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60 text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed min-h-[80px]">
                    {selectedCard.description || "작성된 상세 설명이 없습니다."}
                  </div>
                )}
              </div>

              {/* 히스토리 및 Diff 내역 */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <GitCommit size={14} className="text-amber-500" />
                  <span>수정 히스토리 ({selectedCard.historyLogs?.length || 0})</span>
                </h3>
                <div className="bg-gray-50 dark:bg-[#252526] p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700/60 space-y-2.5 max-h-48 overflow-y-auto">
                  {selectedCard.historyLogs && selectedCard.historyLogs.length > 0 ? (
                    selectedCard.historyLogs.map((log, idx) => {
                      const hasChanges = log.changes && log.changes.length > 0;
                      const isExpanded = expandedLogs[idx];
                      return (
                        <div
                          key={idx}
                          className="border-b border-gray-200 dark:border-gray-700/50 pb-2.5 last:border-none last:pb-0 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white leading-tight">
                                  {log.message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(log.updatedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {hasChanges && (
                              <button
                                onClick={() => setExpandedLogs((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                                className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer shrink-0"
                              >
                                <span>비교</span>
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            )}
                          </div>

                          {hasChanges && isExpanded && (
                            <div className="mt-2 ml-3 bg-white dark:bg-[#1e1e1e] p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 space-y-1.5 text-[11px]">
                              {log.changes!.map((change, cIdx) => (
                                <div key={cIdx} className="grid grid-cols-3 gap-2 border-b border-gray-100 dark:border-gray-800 pb-1 last:border-none last:pb-0">
                                  <span className="font-bold text-gray-400">{change.field}</span>
                                  <span className="text-red-500 line-through truncate">{change.oldValue}</span>
                                  <span className="text-emerald-500 font-semibold truncate">{change.newValue}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-gray-400 text-center py-2">
                      기록된 수정 내역이 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 모달 하단 버튼 */}
              <div className="pt-2 flex justify-between items-center border-t border-gray-100 dark:border-gray-800">
                {isAdmin || selectedCard.authorEmail === userEmail ? (
                  <button
                    onClick={(e) => handleDeleteIdea(e, selectedCard)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors text-xs font-bold cursor-pointer"
                  >
                    <Trash2 size={14} /> <span>삭제</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex gap-2">
                  {(isAdmin || selectedCard.authorEmail === userEmail) && (
                    isModalEditing ? (
                      <>
                        <button
                          onClick={() => setIsModalEditing(false)}
                          className="px-4 py-2 bg-gray-100 dark:bg-[#252526] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs cursor-pointer"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleSaveModalEdit}
                          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-xs cursor-pointer shadow-xs"
                        >
                          <Save size={14} /> <span>저장 완료</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          setIsModalEditing(true);
                          setModalEditData({
                            title: selectedCard.title,
                            description: selectedCard.description || "",
                            status: selectedCard.status,
                            priority: selectedCard.priority || "medium",
                          });
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Edit3 size={14} /> <span>상세 수정</span>
                      </button>
                    )
                  )}
                  <button
                    onClick={() => {
                      setSelectedCard(null);
                      setIsModalEditing(false);
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-[#252526] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 칸반 단일 컬럼 렌더링 (모바일 세그먼트 탭 연동, 데스크탑 독립 스크롤 & 접기, 청크 더보기)
  function renderKanbanColumn(status: "idea" | "progress" | "completed") {
    const colConfig = {
      idea: {
        title: "제안",
        subtitle: "검토 대기",
        dotClass: "bg-amber-500",
        badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        emptyText: "등록된 제안이 없습니다.",
      },
      progress: {
        title: "진행 중",
        subtitle: "개발 착수",
        dotClass: "bg-blue-500",
        badgeClass: "bg-blue-500/15 text-blue-500",
        emptyText: "현재 진행 중인 작업이 없습니다.",
      },
      completed: {
        title: "완료",
        subtitle: "배포 완료",
        dotClass: "bg-emerald-500",
        badgeClass: "bg-emerald-500/15 text-emerald-500",
        emptyText: "완료된 항목이 없습니다.",
      },
    }[status];

    const items = kanbanIdeas[status];
    const isCollapsed = collapsedCols[status];
    const limit = columnLimits[status];
    const visibleItems = items.slice(0, limit);
    const remainingCount = items.length - limit;

    // 데스크탑 접힌 상태 (폭 56px 미니멀 스트립)
    if (isCollapsed) {
      return (
        <div
          key={status}
          onClick={() => setCollapsedCols((prev) => ({ ...prev, [status]: false }))}
          className="hidden md:flex w-14 shrink-0 bg-white/60 dark:bg-[#1e1e1e]/60 rounded-3xl p-3 border border-gray-200 dark:border-gray-800 flex-col items-center justify-between py-6 cursor-pointer hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:bg-white dark:hover:bg-[#1e1e1e] transition-all select-none min-h-[500px]"
          title={`클릭하여 ${colConfig.title} 컬럼 펼치기`}
        >
          <div className="flex flex-col items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${colConfig.dotClass}`} />
            <span className="text-xs font-black [writing-mode:vertical-lr] tracking-widest text-gray-700 dark:text-gray-300">
              {colConfig.title}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${colConfig.badgeClass}`}>
              {items.length}
            </span>
            <ChevronRight size={14} className="text-gray-400" />
          </div>
        </div>
      );
    }

    // 일반 펼쳐진 상태: 모바일에서는 mobileTab === status일 때만 노출, 데스크탑은 상시 노출
    return (
      <div
        key={status}
        className={`bg-white/60 dark:bg-[#1e1e1e]/60 rounded-3xl p-3 sm:p-4 border border-gray-200 dark:border-gray-800 flex-col min-h-[500px] max-h-[calc(100vh-270px)] flex-1 min-w-0 transition-all ${
          mobileTab === status ? "flex" : "hidden md:flex"
        }`}
      >
        {/* 컬럼 헤더: 상단 고정 */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${colConfig.dotClass} shrink-0`} />
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">{colConfig.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-black ${colConfig.badgeClass}`}>
              {items.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">{colConfig.subtitle}</span>
            {/* 데스크탑 전용 접기 버튼 */}
            <button
              type="button"
              onClick={() => setCollapsedCols((prev) => ({ ...prev, [status]: true }))}
              className="hidden md:flex p-1.5 hover:bg-gray-100 dark:hover:bg-[#252526] rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer transition-colors"
              title={`${colConfig.title} 컬럼 접기`}
            >
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        {/* 카드 스크롤 영역: 컬럼 내부 독립 스크롤 */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
              {colConfig.emptyText}
            </div>
          ) : (
            <>
              {visibleItems.map((item) => renderCard(item))}
              {remainingCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setColumnLimits((prev) => ({
                      ...prev,
                      [status]: prev[status] + 15,
                    }))
                  }
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#252526] dark:hover:bg-[#333] text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-dashed border-gray-300 dark:border-gray-700 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>{Math.min(15, remainingCount)}개 더보기</span>
                  <span className="text-[10px] text-gray-400">({remainingCount}개 남음)</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // 개별 카드 렌더링 헬퍼 (인라인 수정 모드 vs 일반 모드)
  function renderCard(item: IdeaType) {
    const isInline = inlineEditingId === item._id;
    const canManage = isAdmin || item.authorEmail === userEmail;
    const showAuthor = isAdmin || item.authorEmail === userEmail;

    if (isInline) {
      // 인라인 수정 모드: 카드 자체가 인풋 폼으로 전환됨 (스크롤 불필요, 제자리 수정)
      return (
        <form
          key={item._id}
          onSubmit={(e) => saveInlineEdit(e, item)}
          className="bg-white dark:bg-[#1e1e1e] border-2 border-amber-500 rounded-2xl p-4 shadow-lg space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Edit3 size={13} /> 제자리 수정 중
            </span>
            <button
              type="button"
              onClick={cancelInlineEdit}
              className="p-1 hover:bg-gray-100 dark:hover:bg-[#252526] rounded-md text-gray-400 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">제목</label>
            <input
              type="text"
              value={inlineData.title}
              onChange={(e) => setInlineData({ ...inlineData, title: e.target.value })}
              className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1">설명</label>
            <textarea
              rows={2}
              value={inlineData.description}
              onChange={(e) => setInlineData({ ...inlineData, description: e.target.value })}
              className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {isAdmin && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">상태</label>
                <select
                  value={inlineData.status}
                  onChange={(e) =>
                    setInlineData({ ...inlineData, status: e.target.value as "idea" | "progress" | "completed" })
                  }
                  className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-1.5 text-[11px] font-bold text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="idea">제안</option>
                  <option value="progress">진행 중</option>
                  <option value="completed">완료</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">우선순위</label>
                <select
                  value={inlineData.priority}
                  onChange={(e) =>
                    setInlineData({ ...inlineData, priority: e.target.value as "urgent" | "high" | "medium" | "low" })
                  }
                  className="w-full bg-gray-50 dark:bg-[#252526] border border-gray-300 dark:border-gray-700 rounded-xl px-2 py-1.5 text-[11px] font-bold text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="urgent">긴급</option>
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={cancelInlineEdit}
              className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#252526] dark:hover:bg-[#333] text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isInlineSaving}
              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
            >
              {isInlineSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              <span>저장 (Enter)</span>
            </button>
          </div>
        </form>
      );
    }

    // 일반 카드 뷰
    const pCfg = PRIORITY_CONFIG[item.priority || "medium"];
    const sCfg = STATUS_CONFIG[item.status];

    // 컴팩트 밀도 뷰 (한 줄 요약형)
    if (cardDensity === "compact") {
      return (
        <div
          key={item._id}
          onClick={() => setSelectedCard(item)}
          className="bg-white dark:bg-[#252526] border border-gray-200 dark:border-gray-700/80 px-3 py-2.5 rounded-2xl shadow-2xs hover:shadow-md hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-all flex items-center justify-between gap-2.5 cursor-pointer group"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={(e) => handleQuickPriorityCycle(e, item)}
              title={isAdmin ? "클릭하여 우선순위 변경" : undefined}
              className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold border shrink-0 ${pCfg.badgeClass} ${
                isAdmin ? "cursor-pointer hover:scale-105 active:scale-95" : ""
              }`}
            >
              {pCfg.label}
            </button>
            <h4 className="font-bold text-xs text-gray-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              {item.title}
            </h4>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {isAdmin && (
              <>
                {item.status === "idea" && (
                  <button
                    type="button"
                    onClick={(e) => handleQuickStatusChange(e, item, "progress")}
                    className="py-1 px-2 bg-blue-500/10 hover:bg-blue-500 text-blue-600 dark:text-blue-400 hover:text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 border border-blue-500/20"
                    title="진행 시작"
                  >
                    <Play size={10} className="fill-current" />
                    <span className="hidden sm:inline">시작</span>
                  </button>
                )}
                {item.status === "progress" && (
                  <button
                    type="button"
                    onClick={(e) => handleQuickStatusChange(e, item, "completed")}
                    className="py-1 px-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1 border border-emerald-500/20"
                    title="완료 처리"
                  >
                    <CheckCircle2 size={10} />
                    <span className="hidden sm:inline">완료</span>
                  </button>
                )}
                {item.status === "completed" && (
                  <button
                    type="button"
                    onClick={(e) => handleQuickStatusChange(e, item, "progress")}
                    className="py-1 px-2 bg-gray-100 hover:bg-blue-500 dark:bg-[#1e1e1e] dark:hover:bg-blue-600 text-gray-600 dark:text-gray-300 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="재개"
                  >
                    <RotateCcw size={10} />
                    <span className="hidden sm:inline">재개</span>
                  </button>
                )}
              </>
            )}

            {canManage && (
              <button
                type="button"
                onClick={(e) => startInlineEdit(e, item)}
                className="p-1 text-gray-400 hover:text-amber-500 rounded-md transition-colors cursor-pointer"
                title="제자리 빠른 수정"
              >
                <Edit3 size={12} />
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        key={item._id}
        onClick={() => setSelectedCard(item)}
        className="bg-white dark:bg-[#252526] border border-gray-200 dark:border-gray-700/80 p-3.5 sm:p-4 rounded-2xl shadow-2xs hover:shadow-md hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-all flex flex-col justify-between cursor-pointer group relative"
      >
        <div>
          {/* 상단: 우선순위 칩 & 관리 버튼 */}
          <div className="flex justify-between items-start mb-2 gap-2">
            <button
              type="button"
              onClick={(e) => handleQuickPriorityCycle(e, item)}
              title={isAdmin ? "클릭하여 우선순위 변경" : undefined}
              className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border transition-transform ${
                pCfg.badgeClass
              } ${isAdmin ? "cursor-pointer hover:scale-105 active:scale-95" : ""}`}
            >
              {pCfg.label}
              {isAdmin && <span className="ml-1 opacity-60">↻</span>}
            </button>

            {canManage && (
              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => startInlineEdit(e, item)}
                  className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                  title="제자리 빠른 수정"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteIdea(e, item)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                  title="삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          {/* 제목 & 설명 */}
          <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white leading-snug mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2">
            {item.title}
          </h4>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap leading-relaxed mb-3 line-clamp-2">
            {item.description || "상세 설명이 없습니다."}
          </p>
        </div>

        {/* 하단 영역: 빠른 액션 버튼 (1-Click Move) & 작성자/일자 */}
        <div className="space-y-2 border-t border-gray-100 dark:border-gray-700/60 pt-2.5">
          {/* 관리자 1클릭 상태 전환 액션 바 */}
          {isAdmin && (
            <div className="flex items-center gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
              {item.status === "idea" && (
                <button
                  type="button"
                  onClick={(e) => handleQuickStatusChange(e, item, "progress")}
                  className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500 text-blue-600 dark:text-blue-400 hover:text-white rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 border border-blue-500/20"
                  title="진행 중으로 즉시 이동"
                >
                  <Play size={11} className="fill-current" />
                  <span>진행 시작</span>
                </button>
              )}

              {item.status === "progress" && (
                <>
                  <button
                    type="button"
                    onClick={(e) => handleQuickStatusChange(e, item, "idea")}
                    className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#1e1e1e] dark:hover:bg-[#333] text-gray-500 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    title="제안으로 되돌리기"
                  >
                    <RotateCcw size={11} />
                    <span>제안</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleQuickStatusChange(e, item, "completed")}
                    className="flex-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white rounded-xl text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1 border border-emerald-500/20"
                    title="완료로 즉시 처리"
                  >
                    <CheckCircle2 size={12} />
                    <span>완료 처리</span>
                  </button>
                </>
              )}

              {item.status === "completed" && (
                <button
                  type="button"
                  onClick={(e) => handleQuickStatusChange(e, item, "progress")}
                  className="w-full py-1.5 bg-gray-100 hover:bg-blue-500 dark:bg-[#1e1e1e] dark:hover:bg-blue-600 text-gray-600 dark:text-gray-300 hover:text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                  title="진행 상태로 재개"
                >
                  <RotateCcw size={11} />
                  <span>진행으로 재개</span>
                </button>
              )}
            </div>
          )}

          {/* 메타데이터 행 */}
          <div className="flex justify-between items-center text-[10px] text-gray-400 pt-0.5">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
            </span>

            <div className="flex items-center gap-1.5">
              {showAuthor && item.authorEmail && (
                <span className="truncate max-w-[100px]" title={item.authorEmail}>
                  {item.authorEmail.split("@")[0]}
                </span>
              )}
              {viewMode === "grid" && (
                <span className={`px-2 py-0.5 rounded-md font-bold border ${sCfg.badgeClass}`}>
                  {sCfg.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
