"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession, signIn } from "next-auth/react";
import {
  CheckSquare,
  Square,
  Search,
  Plus,
  Trash2,
  X,
  LayoutGrid,
  Rows,
  Clock,
  Edit3,
  ChevronDown,
  ChevronRight,
  FolderPlus,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";

export interface TaskItem {
  id: string;
  categoryId: string; // 소속 카테고리 ID
  title: string;
  memo?: string;
  dueDate: string | null; // null이면 "기한 없음"
  completed: boolean;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
}

// 기본 카테고리 (사용자 이미지의 '오늘', '분류')
const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: "cat-today", name: "오늘" },
  { id: "cat-backlog", name: "분류" },
];

const INITIAL_TASKS: TaskItem[] = [];

export function TasksView() {
  const { data: session } = useSession();

  // 1. 뷰 모드: 칸반 보드 / 스윔레인 (Hydration Safe 고정값 초기화)
  const [viewMode, setViewMode] = useState<"kanban" | "swimlane">("kanban");

  // 2. 카테고리 목록 (Hydration Safe 기본값 초기화)
  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES);

  // 3. 태스크 데이터 상태 (Hydration Safe 기본값 초기화)
  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_TASKS);

  // 4. 마지막 저장 상태 및 시간 표시
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>("");

  // 5. 검색 및 완료 보드 표시 상태 (Default: false)
  const [searchQuery, setSearchQuery] = useState("");
  const [showDoneColumn, setShowDoneColumn] = useState<boolean>(false);

  // 클라이언트 마운트 후 로컬 설정 및 캐시 로드 (Hydration mismatch 방지)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const savedMode = localStorage.getItem("onequiz_tasks_view_mode");
        if (savedMode === "kanban" || savedMode === "swimlane") {
          setViewMode(savedMode);
        }
        const savedDone = localStorage.getItem("onequiz_tasks_show_done_board");
        if (savedDone !== null) {
          setShowDoneColumn(savedDone === "true");
        }
        // 비로그인 게스트인 경우 로컬스토리지 태스크/카테고리 복원
        if (!session?.user?.email) {
          const savedCats = localStorage.getItem("onequiz_tasks_categories_v2");
          if (savedCats) {
            try {
              const parsed = JSON.parse(savedCats);
              if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
            } catch {}
          }
          const savedTasks = localStorage.getItem("onequiz_tasks_items_v2");
          if (savedTasks) {
            try {
              const parsed = JSON.parse(savedTasks);
              if (Array.isArray(parsed)) setTasks(parsed);
            } catch {}
          }
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [session?.user?.email]);

  const handleToggleShowDone = () => {
    setShowDoneColumn((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("onequiz_tasks_show_done_board", String(next));
      }
      return next;
    });
  };

  // 6. 스윔레인 접기/펼치기 상태
  const [collapsedLanes, setCollapsedLanes] = useState<Record<string, boolean>>({});

  // 7. 모달 상태
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [modalCategoryId, setModalCategoryId] = useState<string>("cat-today");
  const [modalTitle, setModalTitle] = useState("");
  const [modalMemo, setModalMemo] = useState("");
  const [modalHasDueDate, setModalHasDueDate] = useState(false);
  const [modalDueDate, setModalDueDate] = useState("");

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // 8. 🌟 드래그 앤 드롭 상태 및 실시간 고스트 위치(이동 예정 위치) 상태
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null); // 카테고리 ID 또는 "done"
  const [dragOverTargetIndex, setDragOverTargetIndex] = useState<number | null>(null); // 삽입될 인덱스

  // 서버 DB 동기화 로드
  useEffect(() => {
    let ignore = false;
    async function loadServerData() {
      if (session?.user?.email) {
        try {
          const [tasksRes, catsRes] = await Promise.all([
            fetch("/api/tasks"),
            fetch("/api/tasks/categories"),
          ]);
          if (tasksRes.ok && !ignore) {
            const data = await tasksRes.json();
            if (Array.isArray(data)) {
              const mapped: TaskItem[] = data.map((t: { _id?: string; id?: string; categoryId?: string; title: string; memo?: string; dueDate?: string | null; completed?: boolean; createdAt?: string }) => ({
                id: t._id || t.id || `task-${Date.now()}`,
                categoryId: t.categoryId || "cat-today",
                title: t.title,
                memo: t.memo || "",
                dueDate: t.dueDate || null,
                completed: !!t.completed,
                createdAt: t.createdAt ? String(t.createdAt).slice(0, 10) : "2026-11-04",
              }));
              setTasks(mapped);
              if (typeof window !== "undefined") {
                localStorage.setItem("onequiz_tasks_items_v2", JSON.stringify(mapped));
              }
            }
          }
          if (catsRes.ok && !ignore) {
            const catData = await catsRes.json();
            if (Array.isArray(catData) && catData.length > 0) {
              const mappedCats: CategoryItem[] = catData.map((c: { categoryId?: string; id?: string; name: string }) => ({
                id: c.categoryId || c.id || `cat-${Date.now()}`,
                name: c.name,
              }));
              setCategories(mappedCats);
              if (typeof window !== "undefined") {
                localStorage.setItem("onequiz_tasks_categories_v2", JSON.stringify(mappedCats));
              }
            }
          }
        } catch (e) {
          console.error("Failed to fetch tasks from server:", e);
        }
      }
    }
    loadServerData();
    return () => {
      ignore = true;
    };
  }, [session?.user?.email]);

  const persistTasks = useCallback(
    (newTasks: TaskItem[]) => {
      setTasks(newTasks);
      if (typeof window !== "undefined") {
        localStorage.setItem("onequiz_tasks_items_v2", JSON.stringify(newTasks));
        window.dispatchEvent(new Event("onequiz_tasks_updated"));
      }
      setSaveStatus("saving");

      if (session?.user?.email) {
        fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newTasks),
        })
          .then((res) => {
            if (res.ok) {
              const now = new Date();
              setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
              setSaveStatus("saved");
            } else {
              setSaveStatus("error");
            }
          })
          .catch(() => setSaveStatus("error"));
      } else {
        const now = new Date();
        setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        setSaveStatus("saved");
      }
    },
    [session?.user?.email],
  );

  const persistCategories = useCallback(
    (newCategories: CategoryItem[]) => {
      setCategories(newCategories);
      if (typeof window !== "undefined") {
        localStorage.setItem("onequiz_tasks_categories_v2", JSON.stringify(newCategories));
      }
      setSaveStatus("saving");

      if (session?.user?.email) {
        fetch("/api/tasks/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newCategories),
        })
          .then((res) => {
            if (res.ok) {
              const now = new Date();
              setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
              setSaveStatus("saved");
            } else {
              setSaveStatus("error");
            }
          })
          .catch(() => setSaveStatus("error"));
      } else {
        const now = new Date();
        setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        setSaveStatus("saved");
      }
    },
    [session?.user?.email],
  );

  const handleChangeViewMode = (mode: "kanban" | "swimlane") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_tasks_view_mode", mode);
    }
  };

  // 태스크 완료 체크박스 토글
  const handleToggleTask = (taskId: string) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    persistTasks(updated);
  };

  // 태스크 삭제
  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    persistTasks(updated);
  };

  // 태스크 추가/편집 열기
  const handleOpenCreateModal = (catId?: string) => {
    setEditingTaskId(null);
    setModalCategoryId(catId || categories[0]?.id || "cat-today");
    setModalTitle("");
    setModalMemo("");
    setModalHasDueDate(false);
    setModalDueDate(new Date().toISOString().slice(0, 10));
    setIsTaskModalOpen(true);
  };

  const handleOpenEditModal = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setModalCategoryId(task.categoryId);
    setModalTitle(task.title);
    setModalMemo(task.memo || "");
    setModalHasDueDate(!!task.dueDate);
    setModalDueDate(task.dueDate || new Date().toISOString().slice(0, 10));
    setIsTaskModalOpen(true);
  };

  const handleSaveTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) return;

    if (editingTaskId) {
      const updated = tasks.map((t) =>
        t.id === editingTaskId
          ? {
              ...t,
              title: modalTitle.trim(),
              memo: modalMemo.trim(),
              categoryId: modalCategoryId,
              dueDate: modalHasDueDate ? modalDueDate : null,
            }
          : t,
      );
      persistTasks(updated);
    } else {
      const newTask: TaskItem = {
        id: `task-${Date.now()}`,
        categoryId: modalCategoryId,
        title: modalTitle.trim(),
        memo: modalMemo.trim(),
        dueDate: modalHasDueDate ? modalDueDate : null,
        completed: false,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      persistTasks([...tasks, newTask]);
    }
    setIsTaskModalOpen(false);
  };

  // ================= 🌟 카테고리 관리 기능 (이미지와 100% 동일) =================
  const handleAddCategoryItem = () => {
    const newCat: CategoryItem = {
      id: `cat-${Date.now()}`,
      name: `새 카테고리 ${categories.length + 1}`,
    };
    persistCategories([...categories, newCat]);
  };

  const handleUpdateCategoryName = (catId: string, newName: string) => {
    const updated = categories.map((c) => (c.id === catId ? { ...c, name: newName } : c));
    persistCategories(updated);
  };

  const handleDeleteCategoryItem = (catId: string) => {
    if (categories.length <= 1) {
      toast.warning("최소 1개 이상의 카테고리가 필요합니다.");
      return;
    }
    const fallbackId = categories.find((c) => c.id !== catId)?.id || categories[0].id;
    // 해당 카테고리의 할일들은 fallback 카테고리로 이전 (삭제되지 않음)
    const updatedTasks = tasks.map((t) => (t.categoryId === catId ? { ...t, categoryId: fallbackId } : t));
    const updatedCats = categories.filter((c) => c.id !== catId);
    persistCategories(updatedCats);
    persistTasks(updatedTasks);
  };

  // ================= 🌟 드래그 앤 드롭 및 실시간 고스트 위치 계산 =================
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggingTaskId(taskId);
  };

  const handleColumnDragOver = (e: React.DragEvent, colId: string, itemsCount: number) => {
    e.preventDefault();
    if (dragOverColumnId !== colId) {
      setDragOverColumnId(colId);
      setDragOverTargetIndex(itemsCount); // 기본은 가장 마지막 자리
    }
  };

  const handleCardDragOver = (e: React.DragEvent, colId: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumnId(colId);
    setDragOverTargetIndex(index);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumnId(null);
    setDragOverTargetIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggingTaskId;
    const targetIdx = dragOverTargetIndex;

    handleDragEnd();

    if (!taskId) return;

    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    // 만약 "done" 컬럼에 드롭되면 완료 처리
    const isDroppingToDone = targetColId === "done";
    const nextCompleted = isDroppingToDone ? true : false;
    const nextCategoryId = isDroppingToDone ? taskToMove.categoryId : targetColId;

    // 기존 배열에서 제거 후 목표 위치에 삽입
    const remainingTasks = tasks.filter((t) => t.id !== taskId);
    const updatedTask: TaskItem = {
      ...taskToMove,
      categoryId: nextCategoryId,
      completed: nextCompleted,
    };

    if (targetIdx !== null && targetIdx >= 0) {
      remainingTasks.splice(targetIdx, 0, updatedTask);
      persistTasks(remainingTasks);
    } else {
      persistTasks([...remainingTasks, updatedTask]);
    }
  };

  // 필터링된 태스크 목록
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        t.title.toLowerCase().includes(q) ||
        (t.memo && t.memo.toLowerCase().includes(q));
      return matchSearch;
    });
  }, [tasks, searchQuery]);

  // 완료된 태스크 수
  const doneTasks = useMemo(() => filteredTasks.filter((t) => t.completed), [filteredTasks]);
  const doneCount = tasks.filter((t) => t.completed).length;

  // 현재 드래그 중인 태스크 객체
  const draggingTask = useMemo(() => {
    return tasks.find((t) => t.id === draggingTaskId) || null;
  }, [tasks, draggingTaskId]);

  return (
    <div className="w-full space-y-4 text-on-surface">
      {/* 게스트 체험 모드 안내 배너 (비로그인 시) */}
      {!session?.user && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              <strong>게스트 체험 모드:</strong> 작성한 할일은 현재 브라우저에 임시 저장됩니다. 클라우드 영구 저장 및 기기 간 실시간 동기화를 위해 로그인하세요.
            </span>
          </div>
          <button
            onClick={() => signIn()}
            className="px-3 py-1 rounded-md bg-primary text-on-primary font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0 self-end sm:self-auto shadow-xs"
          >
            로그인하기
          </button>
        </div>
      )}

      {/* 1. 상단 컨트롤 바 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-outline-variant pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight">
            할일
          </h1>
          {!session?.user && (
            <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-medium border border-outline-variant">
              로컬 임시 저장
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* 저장 상태 인디케이터 (로그인 시 실시간 DB 상태, 비로그인 시 로컬 모드) */}
          {session?.user ? (
            <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low text-on-surface-variant text-xs font-mono border border-outline-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>게스트 모드</span>
            </div>
          )}

          {/* 완료 보드 표시 토글 버튼 (Default: false) */}
          <button
            onClick={handleToggleShowDone}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer border ${
              showDoneColumn
                ? "bg-primary text-on-primary border-primary font-semibold"
                : "bg-surface-container-low text-on-surface border-outline-variant font-light hover:bg-surface-container"
            }`}
            title={showDoneColumn ? "완료 보드 숨기기" : "완료 보드 표시하기"}
          >
            <span>완료</span>
            <span className="font-mono text-[11px] px-1 rounded bg-black/10">
              {doneCount}
            </span>
          </button>

          {/* 뷰 모드 토글: 칸반 보드 / 스윔레인 */}
          <div className="flex items-center bg-surface-container-low p-0.5 rounded-md border border-outline-variant">
            <button
              onClick={() => handleChangeViewMode("kanban")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-surface-container text-on-surface font-semibold"
                  : "text-on-surface-variant font-light hover:text-on-surface"
              }`}
            >
              <LayoutGrid size={13} />
              <span>칸반 보드</span>
            </button>
            <button
              onClick={() => handleChangeViewMode("swimlane")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === "swimlane"
                  ? "bg-surface-container text-on-surface font-semibold"
                  : "text-on-surface-variant font-light hover:text-on-surface"
              }`}
            >
              <Rows size={13} />
              <span>스윔레인</span>
            </button>
          </div>

          {/* 카테고리 관리 버튼 */}
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container border border-outline-variant font-medium text-on-surface transition-colors cursor-pointer"
          >
            <FolderPlus size={13} className="text-primary" />
            <span>카테고리 관리</span>
          </button>

          {/* 검색창 */}
          <div className="relative w-44">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="할일·메모 검색"
              className="w-full pl-8 pr-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary font-light"
            />
          </div>
        </div>
      </div>

      {/* 전체 할일이 없을 때 안내 배너 */}
      {tasks.length === 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg bg-surface-container-lowest border border-dashed border-outline-variant gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CheckSquare size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-on-surface">등록된 할일이 없습니다</p>
              <p className="text-xs text-on-surface-variant font-light">
                카테고리별 + 버튼이나 상단의 새 할일 추가를 통해 오늘의 목표를 기록해보세요.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenCreateModal(categories[0]?.id || "cat-today")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0"
          >
            <Plus size={14} />
            <span>새 할일 추가</span>
          </button>
        </div>
      )}

      {/* 2. 메인 컨텐츠 영역 */}
      {viewMode === "kanban" ? (
        /* ================= 칸반 보드 모드 (사용자의 카테고리에 맞춰 컬럼 동적 렌더링) ================= */
        <div
          className={`grid gap-4 items-start ${
            showDoneColumn
              ? `grid-cols-1 md:grid-cols-${Math.min(categories.length + 1, 4)}`
              : `grid-cols-1 md:grid-cols-${Math.min(categories.length, 3)}`
          }`}
          style={{
            gridTemplateColumns: `repeat(${categories.length + (showDoneColumn ? 1 : 0)}, minmax(280px, 1fr))`,
            overflowX: "auto",
          }}
        >
          {/* 사용자가 정의한 각 카테고리별 칸반 컬럼 */}
          {categories.map((cat, catIdx) => {
            const catTasks = filteredTasks.filter((t) => t.categoryId === cat.id && !t.completed);
            const isColumnOver = dragOverColumnId === cat.id;

            return (
              <div
                key={cat.id}
                onDragOver={(e) => handleColumnDragOver(e, cat.id, catTasks.length)}
                onDragLeave={handleDragEnd}
                onDrop={(e) => handleDrop(e, cat.id)}
                className={`rounded-lg p-3.5 flex flex-col justify-between min-h-[560px] bg-surface-container-lowest border transition-colors ${
                  catIdx === 0
                    ? "border-dashed border-outline-variant"
                    : "border-solid border-outline-variant"
                } ${isColumnOver ? "border-primary bg-primary/[0.02]" : ""}`}
              >
                <div className="space-y-3">
                  {/* 컬럼 헤더: 카테고리 이름 + 0/20 배지 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-on-surface">
                        {cat.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-container text-on-surface-variant">
                        {catTasks.length} / 20
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenCreateModal(cat.id)}
                      className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
                      title="할일 추가"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* 카드 목록 및 🌟 드롭 예정 위치 고스트 카드(반투명 플레이스홀더) */}
                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
                    {catTasks.length === 0 && (!isColumnOver || dragOverTargetIndex !== 0) && (
                      <div className="py-12 text-center text-on-surface-variant text-xs font-light opacity-60">
                        비어 있음 · + 로 추가 · 여기로 드래그
                      </div>
                    )}

                    {catTasks.map((task, idx) => {
                      const isGhostHere =
                        isColumnOver &&
                        dragOverTargetIndex === idx &&
                        draggingTaskId !== task.id;

                      return (
                        <React.Fragment key={task.id}>
                          {/* 🌟 드롭 예정 위치에 반투명 고스트 카드 렌더링 */}
                          {isGhostHere && draggingTask && (
                            <GhostTaskCard task={draggingTask} />
                          )}

                          <div
                            onDragOver={(e) => handleCardDragOver(e, cat.id, idx)}
                            className="transition-all"
                          >
                            <TaskCard
                              task={task}
                              categoryName={cat.name}
                              onToggleTask={handleToggleTask}
                              onDeleteTask={handleDeleteTask}
                              onEditTask={handleOpenEditModal}
                              onDragStart={handleDragStart}
                              isDragging={draggingTaskId === task.id}
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* 컬럼 맨 아래에 드롭될 예정일 때의 고스트 카드 */}
                    {isColumnOver &&
                      (dragOverTargetIndex === catTasks.length ||
                        (catTasks.length === 0 && dragOverTargetIndex === 0)) &&
                      draggingTask &&
                      draggingTaskId !== draggingTask.id && (
                        <GhostTaskCard task={draggingTask} />
                      )}
                  </div>
                </div>

                {/* 하단 고정: + 할일 추가 버튼 */}
                <div className="pt-3 mt-auto">
                  <button
                    onClick={() => handleOpenCreateModal(cat.id)}
                    className="w-full py-2 bg-primary text-on-primary font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs"
                  >
                    <Plus size={14} />
                    <span>할일 추가</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* ================= 완료 보드 (완료 토글 켜질 시 표시, Default: false) ================= */}
          {showDoneColumn && (
            <div
              onDragOver={(e) => handleColumnDragOver(e, "done", doneTasks.length)}
              onDragLeave={handleDragEnd}
              onDrop={(e) => handleDrop(e, "done")}
              className={`rounded-lg p-3.5 flex flex-col justify-between min-h-[560px] bg-surface-container-lowest border border-dashed border-outline-variant transition-colors ${
                dragOverColumnId === "done" ? "border-primary bg-primary/[0.02]" : ""
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-semibold text-on-surface">완료</h2>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-container text-on-surface-variant">
                      {doneTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-0.5">
                  {doneTasks.length === 0 && dragOverColumnId !== "done" && (
                    <div className="py-12 text-center text-on-surface-variant text-xs font-light opacity-60">
                      완료된 항목이 없습니다.
                    </div>
                  )}

                  {doneTasks.map((task, idx) => {
                    const isGhostHere =
                      dragOverColumnId === "done" &&
                      dragOverTargetIndex === idx &&
                      draggingTaskId !== task.id;

                    const catName = categories.find((c) => c.id === task.categoryId)?.name || "일반";

                    return (
                      <React.Fragment key={task.id}>
                        {isGhostHere && draggingTask && (
                          <GhostTaskCard task={draggingTask} />
                        )}
                        <div
                          onDragOver={(e) => handleCardDragOver(e, "done", idx)}
                          className="transition-all"
                        >
                          <TaskCard
                            task={task}
                            categoryName={catName}
                            onToggleTask={handleToggleTask}
                            onDeleteTask={handleDeleteTask}
                            onEditTask={handleOpenEditModal}
                            onDragStart={handleDragStart}
                            isDragging={draggingTaskId === task.id}
                          />
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {dragOverColumnId === "done" &&
                    dragOverTargetIndex === doneTasks.length &&
                    draggingTask && (
                      <GhostTaskCard task={draggingTask} />
                    )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= 스윔레인(Swimlane) 모드 ================= */
        <div className="space-y-3">
          {categories.map((cat) => {
            const catTasks = filteredTasks.filter((t) => t.categoryId === cat.id);
            const isCollapsed = !!collapsedLanes[cat.id];
            const completedCount = catTasks.filter((t) => t.completed).length;

            return (
              <div
                key={cat.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden"
              >
                {/* 스윔레인 헤더 */}
                <div
                  onClick={() =>
                    setCollapsedLanes((prev) => ({
                      ...prev,
                      [cat.id]: !prev[cat.id],
                    }))
                  }
                  className="p-3 bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-between border-b border-outline-variant"
                >
                  <div className="flex items-center gap-2">
                    <button className="text-on-surface-variant hover:text-on-surface">
                      {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                    </button>
                    <h2 className="text-xs font-semibold text-on-surface">{cat.name}</h2>
                    <span className="text-[11px] font-mono text-on-surface-variant font-light">
                      ({completedCount}/{catTasks.length})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateModal(cat.id);
                    }}
                    className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high rounded text-xs font-medium text-on-surface cursor-pointer"
                  >
                    + 할일 추가
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="p-3 space-y-2">
                    {catTasks.length === 0 ? (
                      <div className="text-center py-4 text-on-surface-variant text-xs font-light">
                        등록된 할일이 없습니다.
                      </div>
                    ) : (
                      catTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          categoryName={cat.name}
                          onToggleTask={handleToggleTask}
                          onDeleteTask={handleDeleteTask}
                          onEditTask={handleOpenEditModal}
                          onDragStart={handleDragStart}
                          isDragging={draggingTaskId === task.id}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 3. 🌟 카테고리 관리 모달 (사용자가 첨부한 사진과 100% 동일) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 w-full max-w-sm shadow-xl space-y-4 text-on-surface">
            {/* 모달 헤더 */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-semibold text-on-surface">카테고리 관리</h2>
                <p className="text-xs text-on-surface-variant font-light mt-1 leading-relaxed">
                  할일 카테고리를 추가·이름 변경·삭제합니다. 삭제해도 할일은 지워지지 않고 미분류로 남습니다.
                </p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
              >
                <X size={16} />
              </button>
            </div>

            {/* 카테고리 리스트 (사진 속 순서 및 인풋 박스) */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {categories.map((c) => {
                const count = tasks.filter((t) => t.categoryId === c.id && !t.completed).length;

                return (
                  <div key={c.id} className="flex items-center gap-2">
                    {/* + 핸들러 */}
                    <div className="w-8 h-8 rounded-md bg-surface-container-low border border-outline-variant flex items-center justify-center text-on-surface-variant shrink-0 cursor-grab">
                      <Plus size={14} />
                    </div>

                    {/* 카테고리명 입력창 (사진 속 둥근 인풋) */}
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => handleUpdateCategoryName(c.id, e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface font-medium focus:outline-none focus:border-primary"
                    />

                    {/* 개수 표시 */}
                    <span className="text-xs text-on-surface-variant font-mono font-light w-8 text-right">
                      {count}개
                    </span>

                    {/* 삭제 쓰레기통 */}
                    <button
                      type="button"
                      onClick={() => handleDeleteCategoryItem(c.id)}
                      className="p-1.5 text-on-surface-variant hover:text-on-surface rounded transition-colors cursor-pointer shrink-0"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 하단 버튼 (사진과 100% 동일: + 카테고리 추가 / 완료) */}
            <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
              <button
                type="button"
                onClick={handleAddCategoryItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface font-medium text-xs rounded-md transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>카테고리 추가</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-1.5 bg-primary text-on-primary font-semibold text-xs rounded-md transition-colors cursor-pointer"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 할일 생성 / 수정 모달 */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 w-full max-w-sm shadow-xl space-y-4 text-on-surface">
            <div className="flex justify-between items-center border-b border-outline-variant pb-2.5">
              <h2 className="text-sm font-semibold text-on-surface">
                {editingTaskId ? "할일 수정" : "새 할일 추가"}
              </h2>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 rounded text-on-surface-variant hover:text-on-surface"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveTaskSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-on-surface mb-1">내용</label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="예: 기출문제 20문제 풀이"
                  className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-on-surface focus:outline-none focus:border-primary font-normal"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-medium text-on-surface mb-1">카테고리</label>
                <select
                  value={modalCategoryId}
                  onChange={(e) => setModalCategoryId(e.target.value)}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-on-surface font-normal"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-on-surface">마감 기한</label>
                  <label className="flex items-center gap-1 cursor-pointer text-[11px] text-on-surface-variant font-light">
                    <input
                      type="checkbox"
                      checked={!modalHasDueDate}
                      onChange={(e) => setModalHasDueDate(!e.target.checked)}
                      className="accent-primary w-3 h-3"
                    />
                    <span>기한 없음</span>
                  </label>
                </div>
                {modalHasDueDate && (
                  <input
                    type="date"
                    value={modalDueDate}
                    onChange={(e) => setModalDueDate(e.target.value)}
                    className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-on-surface"
                  />
                )}
              </div>

              <div>
                <label className="block font-medium text-on-surface mb-1">메모 (선택)</label>
                <textarea
                  value={modalMemo}
                  onChange={(e) => setModalMemo(e.target.value)}
                  placeholder="참고 링크나 세부 메모를 적어보세요"
                  rows={2}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-on-surface resize-none font-light"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="flex-1 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface font-light rounded-md text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-on-primary font-semibold rounded-md text-xs cursor-pointer"
                >
                  {editingTaskId ? "수정 완료" : "추가"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ================= 🌟 반투명 고스트 카드 (드래그 중 드롭 예정 위치 표시) =================
function GhostTaskCard({ task }: { task: TaskItem }) {
  return (
    <div className="bg-primary/5 border-2 border-dashed border-primary p-3 rounded-md opacity-50 space-y-1 select-none pointer-events-none animate-pulse">
      <div className="flex items-center gap-2">
        <Square size={16} className="text-primary/60 shrink-0" />
        <p className="text-xs font-semibold text-primary truncate">{task.title}</p>
      </div>
      <p className="text-[10px] text-primary/70 font-light pl-6">
        여기로 이동 예정
      </p>
    </div>
  );
}

// ================= 일반 태스크 카드 컴포넌트 =================
interface TaskCardProps {
  task: TaskItem;
  categoryName: string;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: TaskItem) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  isDragging?: boolean;
}

function TaskCard({
  task,
  onToggleTask,
  onDeleteTask,
  onEditTask,
  onDragStart,
  isDragging,
}: TaskCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={`group relative bg-surface-container-low hover:bg-surface-container border border-outline-variant p-3 rounded-md transition-all cursor-grab active:cursor-grabbing select-none ${
        task.completed ? "opacity-60" : ""
      } ${isDragging ? "opacity-25 scale-95" : "opacity-100"}`}
    >
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => onToggleTask(task.id)}
          className="mt-0.5 text-primary hover:opacity-80 transition-colors cursor-pointer shrink-0"
        >
          {task.completed ? (
            <CheckSquare size={16} className="text-primary" />
          ) : (
            <Square size={16} className="text-on-surface-variant hover:text-on-surface" />
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1">
          <p
            className={`text-xs font-medium text-on-surface break-words leading-tight ${
              task.completed ? "line-through text-on-surface-variant font-light" : ""
            }`}
          >
            {task.title}
          </p>

          {task.memo && (
            <p className="text-[11px] text-on-surface-variant font-light line-clamp-2">
              {task.memo}
            </p>
          )}

          <div className="flex items-center gap-2 pt-0.5 text-[10px] text-on-surface-variant font-light">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              <span>{task.dueDate ? task.dueDate : "기한 없음"}</span>
            </span>
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEditTask(task)}
            className="p-1 text-on-surface-variant hover:text-on-surface rounded cursor-pointer"
            title="수정"
          >
            <Edit3 size={12} />
          </button>
          <button
            onClick={() => onDeleteTask(task.id)}
            className="p-1 text-on-surface-variant hover:text-on-surface rounded cursor-pointer"
            title="삭제"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
