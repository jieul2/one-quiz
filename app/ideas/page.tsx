"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Plus,
  Trash2,
  Lightbulb,
  Sparkles,
  ArrowLeft,
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
  MessageSquarePlus,
  User,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

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
  description: string;
  status: "idea" | "progress" | "completed";
  priority: "urgent" | "high" | "medium" | "low";
  authorEmail?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  historyLogs?: HistoryLog[];
}

export default function IdeasPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const userEmail = session?.user?.email;

  const [ideas, setIdeas] = useState<IdeaType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"idea" | "progress" | "completed">("idea");
  const [priority, setPriority] = useState<"urgent" | "high" | "medium" | "low">("medium");
  const [commitMessage, setCommitMessage] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);

  const [selectedCard, setSelectedCard] = useState<IdeaType | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<number, boolean>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "idea" | "progress" | "completed">(
    "all",
  );
  const [priorityFilter, setPriorityFilter] = useState<
    "all" | "urgent" | "high" | "medium" | "low"
  >("all");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "title" | "priority">("latest");
  const [hideCompleted, setHideCompleted] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  const [mounted] = useState(true);
  const { theme, setTheme } = useTheme();

  const fetchIdeas = async () => {
    try {
      const res = await fetch("/api/ideas");
      const data = await res.json();
      setIdeas(data);
      setSelectedCard((prev) => {
        if (!prev) return null;
        return data.find((i: IdeaType) => i._id === prev._id) || prev;
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/ideas");
        const data = await res.json();
        if (isMounted) {
          setIdeas(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, priorityFilter, sortBy, hideCompleted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      if (isEditing && currentEditId) {
        const targetItem = ideas.find((i) => i._id === currentEditId);
        const canEdit = isAdmin || (targetItem && targetItem.authorEmail === userEmail);
        if (!canEdit) {
          alert("수정 권한이 없습니다.");
          return;
        }

        const res = await fetch("/api/ideas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _id: currentEditId,
            title,
            description,
            status: isAdmin ? status : targetItem?.status || "idea",
            priority: isAdmin ? priority : targetItem?.priority || "medium",
            commitMessage,
          }),
        });
        if (res.ok) {
          resetForm();
          fetchIdeas();
        }
      } else {
        const postData = isAdmin
          ? { title, description, status, priority, authorEmail: userEmail }
          : { title, description, status: "idea", priority: "medium", authorEmail: userEmail };

        const res = await fetch("/api/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(postData),
        });
        if (res.ok) {
          resetForm();
          fetchIdeas();
          alert(
            isAdmin
              ? "새로운 아이디어가 등록되었습니다."
              : "소중한 아이디어/피드백이 등록되었습니다!",
          );
        }
      }
    } catch (e) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const handleEditClick = (e: React.MouseEvent | null, item: IdeaType) => {
    if (e) e.stopPropagation();
    const canEdit = isAdmin || item.authorEmail === userEmail;
    if (!canEdit) {
      alert("본인이 작성한 글만 수정할 수 있습니다.");
      return;
    }

    setIsEditing(true);
    setCurrentEditId(item._id);
    setTitle(item.title);
    setDescription(item.description || "");
    setStatus(item.status);
    setPriority(item.priority || "medium");
    setCommitMessage("");
    setSelectedCard(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentEditId(null);
    setTitle("");
    setDescription("");
    setStatus("idea");
    setPriority("medium");
    setCommitMessage("");
  };

  const handleDeleteIdea = async (e: React.MouseEvent | null, item: IdeaType) => {
    if (e) e.stopPropagation();
    const canDelete = isAdmin || item.authorEmail === userEmail;
    if (!canDelete) {
      alert("삭제 권한이 없습니다.");
      return;
    }
    if (!confirm("이 항목을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/ideas?id=${item._id}`, { method: "DELETE" });
      if (res.ok) {
        setSelectedCard(null);
        fetchIdeas();
      }
    } catch (e) {
      alert("삭제 실패");
    }
  };

  const toggleLogExpand = (idx: number) => {
    setExpandedLogs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4 text-center text-gray-800 dark:text-gray-200 gap-3">
        <Loader2 size={36} className="animate-spin text-yellow-500" />
        <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">
          데이터를 불러오는 중...
        </p>
      </div>
    );
  }

  const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };

  const filteredIdeas = ideas
    .filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;
      const matchesHideCompleted = hideCompleted ? item.status !== "completed" : true;
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (isAdmin &&
          item.authorEmail &&
          item.authorEmail.toLowerCase().includes(searchQuery.toLowerCase()));
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
        const pA = priorityWeight[a.priority || "medium"] || 2;
        const pB = priorityWeight[b.priority || "medium"] || 2;
        return pB - pA;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredIdeas.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentIdeas = filteredIdeas.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const countAll = ideas.length;
  const countIdea = ideas.filter((i) => i.status === "idea").length;
  const countProgress = ideas.filter((i) => i.status === "progress").length;
  const countCompleted = ideas.filter((i) => i.status === "completed").length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-800 dark:text-gray-200 p-4 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 상단 네비게이션 바 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-3 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-xl shrink-0">
              <Lightbulb size={24} />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white truncate">
                🚀 프로젝트 로드맵 & 피드백
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                {isAdmin
                  ? "기능 개발 로드맵을 관리하세요."
                  : "개발되었으면 하는 기능이나 피드백을 자유롭게 남겨주세요!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-xl text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
              title="테마 변경"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] px-3.5 py-2.5 rounded-xl transition-colors font-medium"
            >
              <ArrowLeft size={16} /> <span>메인으로</span>
            </Link>
          </div>
        </div>

        {/* 아이디어 등록 / 수정 폼 */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 space-y-4"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              {isAdmin ? (
                <>
                  <Sparkles size={16} className="text-yellow-500" />
                  {isEditing ? "기능 아이디어 수정 중..." : "새로운 기능 아이디어 추가 (관리자)"}
                </>
              ) : (
                <>
                  <MessageSquarePlus size={16} className="text-blue-500" />
                  {isEditing ? "내가 작성한 피드백 수정 중..." : "아이디어 / 피드백 등록하기"}
                </>
              )}
            </h2>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-red-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X size={14} /> 수정 취소
              </button>
            )}
          </div>

          {isAdmin ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="기능 제목 (예: AI 오답노트 자동생성)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="md:col-span-2 w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
                  required
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "idea" | "progress" | "completed")}
                  className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white cursor-pointer font-medium"
                >
                  <option value="idea">💡 아이디어</option>
                  <option value="progress">⚡ 개발 중</option>
                  <option value="completed">✅ 개발 완료</option>
                </select>

                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as "urgent" | "high" | "medium" | "low")
                  }
                  className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white cursor-pointer font-medium"
                >
                  <option value="urgent">🔥 긴급 (Urgent)</option>
                  <option value="high">⭐ 높음 (High)</option>
                  <option value="medium">📌 보통 (Medium)</option>
                  <option value="low">💤 낮음 (Low)</option>
                </select>
              </div>

              <textarea
                placeholder="상세 설명이나 구현 방안을 적어주세요..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
              />

              {isEditing && (
                <div className="bg-yellow-500/5 dark:bg-yellow-500/10 p-3.5 rounded-xl border border-yellow-500/30 flex items-center gap-2">
                  <GitCommit size={18} className="text-yellow-600 dark:text-yellow-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="변경 요약 (예: 로그인 API 연동 추가, UI 버그 수정 - 미입력시 자동 감지)"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full bg-transparent border-none text-xs focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold py-3 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Plus size={18} /> {isEditing ? "아이디어 수정 완료 (커밋)" : "아이디어 등록하기"}
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="어떤 기능이 필요하거나 개선되었으면 좋겠나요?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
                required
              />
              <textarea
                placeholder="구체적인 의견이나 피드백을 자유롭게 적어주세요..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold py-3 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <Plus size={18} /> {isEditing ? "피드백 수정 완료" : "피드백 / 아이디어 건의하기"}
              </button>
            </div>
          )}
        </form>

        {/* 컨트롤 바 */}
        <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === "all" ? "bg-yellow-500 text-white dark:text-black shadow" : "bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#383838]"}`}
            >
              전체 ({countAll})
            </button>
            <button
              onClick={() => setStatusFilter("idea")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === "idea" ? "bg-yellow-500 text-white dark:text-black shadow" : "bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#383838]"}`}
            >
              💡 아이디어 ({countIdea})
            </button>
            <button
              onClick={() => setStatusFilter("progress")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === "progress" ? "bg-blue-500 text-white shadow" : "bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#383838]"}`}
            >
              ⚡ 개발 중 ({countProgress})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === "completed" ? "bg-green-500 text-white shadow" : "bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#383838]"}`}
            >
              ✅ 개발 완료 ({countCompleted})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <select
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as "all" | "urgent" | "high" | "medium" | "low")
              }
              className="bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white cursor-pointer font-medium"
            >
              <option value="all">우선순위 전체</option>
              <option value="urgent">🔥 긴급</option>
              <option value="high">⭐ 높음</option>
              <option value="medium">📌 보통</option>
              <option value="low">💤 낮음</option>
            </select>

            <button
              onClick={() => setHideCompleted(!hideCompleted)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                hideCompleted
                  ? "bg-indigo-500/10 border-indigo-500 text-indigo-500"
                  : "bg-gray-50 dark:bg-[#2d2d2d] border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400"
              }`}
              title="완료된 항목 숨기기"
            >
              <Archive size={14} /> <span>완료 숨기기</span>
            </button>

            <div className="relative flex-1 sm:w-48">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "latest" | "oldest" | "title" | "priority")
              }
              className="bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white cursor-pointer font-medium shrink-0"
            >
              <option value="latest">최신 등록순</option>
              <option value="priority">우선순위 높은순</option>
              <option value="oldest">오래된 순</option>
              <option value="title">가나다순</option>
            </select>
          </div>
        </div>

        {/* 백로그 카드 그리드 */}
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-md min-h-[400px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Filter size={16} className="text-yellow-500" /> 백로그 목록{" "}
                <span className="text-yellow-600 dark:text-yellow-500 font-extrabold">
                  {filteredIdeas.length}개
                </span>
              </h3>
              <span className="text-xs text-gray-400 italic">
                카드를 클릭하면 상세 정보 및 변경 히스토리를 볼 수 있습니다.
              </span>
            </div>

            {currentIdeas.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">
                조건에 일치하는 아이디어가 없습니다. 검색어나 필터를 변경해 보세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentIdeas.map((item) => {
                  const pConfig = {
                    urgent: {
                      label: "🔥 긴급",
                      class: "bg-red-500/10 text-red-500 border-red-500/30",
                    },
                    high: {
                      label: "⭐ 높음",
                      class: "bg-orange-500/10 text-orange-500 border-orange-500/30",
                    },
                    medium: {
                      label: "📌 보통",
                      class:
                        "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/30",
                    },
                    low: {
                      label: "💤 낮음",
                      class: "bg-gray-500/10 text-gray-500 border-gray-500/30",
                    },
                  }[item.priority || "medium"];

                  const canManage = isAdmin || item.authorEmail === userEmail;
                  // 👈 관리자이거나 본인이 작성한 글인 경우에만 작성자 정보 노출
                  const showAuthor = isAdmin || item.authorEmail === userEmail;

                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedCard(item)}
                      className="bg-gray-50 dark:bg-[#252526] border border-gray-200 dark:border-gray-700/80 p-4 rounded-xl shadow-sm hover:border-yellow-500 transition-all flex flex-col justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${pConfig.class}`}
                          >
                            {pConfig.label}
                          </span>

                          {canManage && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => handleEditClick(e, item)}
                                className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333] transition-colors cursor-pointer"
                                title="편집"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                onClick={(e) => handleDeleteIdea(e, item)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-200 dark:hover:bg-[#333] transition-colors cursor-pointer"
                                title="삭제"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-snug mb-1.5 group-hover:text-yellow-500 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed mb-3 line-clamp-3">
                          {item.description || "상세 설명이 없습니다."}
                        </p>
                      </div>

                      <div className="space-y-1.5 border-t border-gray-200 dark:border-gray-700/60 pt-2.5">
                        {/* 👈 관리자 또는 본인인 경우에만 카드 하단에 작성자 표시 */}
                        {showAuthor && item.authorEmail && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            <User size={12} className="shrink-0 text-yellow-500" />
                            <span className="truncate">작성자: {item.authorEmail}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 flex justify-between items-center">
                          <span>생성: {new Date(item.createdAt).toLocaleDateString()}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold ${
                              item.status === "completed"
                                ? "bg-green-500/10 text-green-500"
                                : item.status === "progress"
                                  ? "bg-blue-500/10 text-blue-500"
                                  : "bg-yellow-500/10 text-yellow-500"
                            }`}
                          >
                            {item.status === "completed"
                              ? "개발 완료"
                              : item.status === "progress"
                                ? "개발 중"
                                : "아이디어"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {filteredIdeas.length > 0 && (
            <div className="flex justify-between items-center pt-6 mt-6 border-t border-gray-100 dark:border-gray-800 text-xs">
              <span className="text-gray-500">
                총 <strong className="text-gray-800 dark:text-white">{filteredIdeas.length}</strong>
                개 중 <b>{startIndex + 1}</b> -{" "}
                <b>{Math.min(startIndex + ITEMS_PER_PAGE, filteredIdeas.length)}</b> 표시
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-[#2d2d2d] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors cursor-pointer"
                  title="이전 페이지"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1 px-2 font-bold">
                  <span>{currentPage}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-400">{totalPages}</span>
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-[#2d2d2d] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors cursor-pointer"
                  title="다음 페이지"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 📋 상세 모달 창 */}
        {selectedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                        selectedCard.status === "completed"
                          ? "bg-green-500/10 text-green-500"
                          : selectedCard.status === "progress"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {selectedCard.status === "completed"
                        ? "✅ 개발 완료"
                        : selectedCard.status === "progress"
                          ? "⚡ 개발 중"
                          : "💡 아이디어"}
                    </span>
                    <span className="text-xs text-gray-400">ID: {selectedCard._id}</span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white">
                    {selectedCard.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedCard(null)}
                  className="p-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* 👈 모달 메타데이터 영역: 관리자 또는 본인일 때만 작성자 컬럼 노출 */}
              <div
                className={`grid gap-4 bg-gray-50 dark:bg-[#252526] p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60 text-xs ${
                  isAdmin || selectedCard.authorEmail === userEmail
                    ? "grid-cols-2 sm:grid-cols-3"
                    : "grid-cols-2"
                }`}
              >
                <div>
                  <span className="text-gray-400 block mb-1">우선순위</span>
                  <span className="font-bold text-gray-900 dark:text-white uppercase">
                    {selectedCard.priority}
                  </span>
                </div>

                {(isAdmin || selectedCard.authorEmail === userEmail) && (
                  <div>
                    <span className="text-gray-400 block mb-1">작성자</span>
                    <span className="font-bold text-gray-900 dark:text-white truncate">
                      {selectedCard.authorEmail || "익명"}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-gray-400 block mb-1">최초 생성일</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {new Date(selectedCard.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  상세 설명 / 구현 방안
                </h3>
                <div className="bg-gray-50 dark:bg-[#252526] p-5 rounded-2xl border border-gray-200 dark:border-gray-700/60 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed min-h-[100px]">
                  {selectedCard.description || "작성된 상세 설명이 없습니다."}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GitCommit size={14} className="text-yellow-500" /> 수정 히스토리 및 Diff 변경
                  내역
                </h3>
                <div className="bg-gray-50 dark:bg-[#252526] p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60 space-y-3 max-h-56 overflow-y-auto">
                  {selectedCard.historyLogs && selectedCard.historyLogs.length > 0 ? (
                    selectedCard.historyLogs.map((log, idx) => {
                      const hasChanges = log.changes && log.changes.length > 0;
                      const isExpanded = expandedLogs[idx];

                      return (
                        <div
                          key={idx}
                          className="border-b border-gray-200 dark:border-gray-700/50 pb-3 last:border-none last:pb-0 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 shrink-0"></div>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {log.message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(log.updatedAt).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {hasChanges && (
                              <button
                                onClick={() => toggleLogExpand(idx)}
                                className="flex items-center gap-1 text-[11px] text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-lg hover:bg-yellow-500/20 transition-colors cursor-pointer"
                              >
                                <span>상세 비교</span>
                                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </button>
                            )}
                          </div>

                          {hasChanges && isExpanded && (
                            <div className="mt-2.5 ml-4 bg-white dark:bg-[#1e1e1e] p-3 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2 text-[11px]">
                              {log.changes!.map((change, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="grid grid-cols-3 gap-2 border-b border-gray-100 dark:border-gray-800 pb-1.5 last:border-none last:pb-0"
                                >
                                  <span className="font-bold text-gray-500 dark:text-gray-400">
                                    {change.field}
                                  </span>
                                  <span
                                    className="text-red-500 line-through truncate"
                                    title={change.oldValue}
                                  >
                                    이전: {change.oldValue}
                                  </span>
                                  <span
                                    className="text-green-500 font-semibold truncate"
                                    title={change.newValue}
                                  >
                                    변경: {change.newValue}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-gray-400 text-center py-2">
                      기록된 히스토리가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 모달 하단 버튼 */}
              <div className="pt-2 flex justify-between items-center border-t border-gray-100 dark:border-gray-800">
                {isAdmin || selectedCard.authorEmail === userEmail ? (
                  <button
                    onClick={(e) => handleDeleteIdea(e, selectedCard)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors text-xs font-bold cursor-pointer"
                  >
                    <Trash2 size={15} /> 삭제하기
                  </button>
                ) : (
                  <span className="text-[11px] text-gray-400">
                    본인이 작성한 글만 수정/삭제할 수 있습니다.
                  </span>
                )}

                <div className="flex gap-2">
                  {(isAdmin || selectedCard.authorEmail === userEmail) && (
                    <button
                      onClick={(e) => handleEditClick(e, selectedCard)}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black rounded-xl transition-colors text-xs font-bold cursor-pointer shadow"
                    >
                      <Edit3 size={15} /> 수정하기
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="px-5 py-2.5 bg-gray-200 dark:bg-[#2d2d2d] hover:bg-gray-300 dark:hover:bg-[#383838] text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-colors text-xs cursor-pointer"
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
}
