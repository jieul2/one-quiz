"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useMounted } from "@/lib/hooks/useMounted";
import {
  Calendar,
  CalendarDays,
  Clock,
  CheckSquare,
  Square,
  Flag,
  Bookmark,
  CloudSun,
  FileText,
  Folder,
  Kanban,
  MessageSquare,
  GraduationCap,
  LayoutGrid,
  Check,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Droplets,
  Wind,
  Umbrella,
  Send,
  GripVertical,
} from "lucide-react";
import { CalendarEvent, getLocalDateKey, getEventTimeDisplay, getLocalTimeStr } from "@/components/calendar/calendarTypes";
import { toast } from "@/lib/toast";
import { CustomScrollArea } from "@/components/common/CustomScrollArea";

// ================= 위젯 정의 =================
export interface WidgetItem {
  id: string;
  title: string;
  visible: boolean;
}

const DEFAULT_WIDGETS: WidgetItem[] = [
  { id: "weather", title: "날씨", visible: true },
  { id: "chat", title: "채팅", visible: true },
  { id: "projects", title: "프로젝트", visible: true },
  { id: "favorite_notes", title: "즐겨찾기 노트", visible: true },
  { id: "recent_files", title: "최근 파일", visible: true },
  { id: "bookmarks", title: "북마크", visible: true },
  { id: "dday", title: "D-day", visible: true },
  { id: "today_schedule", title: "오늘 일정", visible: true },
  { id: "today_tasks", title: "오늘 할일", visible: false },
  { id: "mini_calendar", title: "미니 캘린더", visible: false },
  { id: "upcoming_schedule", title: "다가오는 일정", visible: false },
  { id: "quick_exam", title: "기출문제 풀이", visible: false },
];

interface StoredTaskItem {
  id: string;
  categoryId?: string;
  dueDate?: string | null;
  completed?: boolean;
  title?: string;
  text?: string;
  memo?: string;
  createdAt?: string;
}

export function DashboardView() {
  const { data: session } = useSession();
  const userName =
    session?.user?.name ||
    (session?.user?.email ? session.user.email.split("@")[0] : "게스트");
  const mounted = useMounted();

  // 1. 위젯 목록 상태 (초기 렌더링 SSR 일관성 유지)
  const [widgets, setWidgets] = useState<WidgetItem[]>(DEFAULT_WIDGETS);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("onequiz_dashboard_flat_widgets");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const filtered = parsed.filter((w: WidgetItem) => w.id !== "favorite_contacts");
              setWidgets(filtered);
            }
          } catch {}
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const persistWidgets = useCallback((newWidgets: WidgetItem[]) => {
    setWidgets(newWidgets);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_dashboard_flat_widgets", JSON.stringify(newWidgets));
    }
  }, []);

  // 2. '위젯' 버튼 드롭다운 메뉴 상태 (사진 1, 2)
  const [isWidgetMenuOpen, setIsWidgetMenuOpen] = useState(false);
  const widgetMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (widgetMenuRef.current && !widgetMenuRef.current.contains(e.target as Node)) {
        setIsWidgetMenuOpen(false);
      }
    };
    if (isWidgetMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isWidgetMenuOpen]);

  // 3. 캘린더 일정 실데이터 로드
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  useEffect(() => {
    let ignore = false;
    async function loadEvents() {
      try {
        const res = await fetch("/api/calendar");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data)) setCalendarEvents(data);
        }
      } catch (e) {
        console.error("Dashboard calendar fetch error:", e);
      }
    }
    loadEvents();
    return () => {
      ignore = true;
    };
  }, []);

  // 4. 할 일 상태 (SSR 하이드레이션 일관성 유지)
  const [tasks, setTasks] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newTaskInput, setNewTaskInput] = useState("");

  // 계정별 할일 독립 격리 저장소 키
  const userEmail = session?.user?.email;
  const tasksStorageKey = userEmail ? `onequiz_tasks_items_${userEmail}` : "onequiz_tasks_items_guest";
  const dashTasksStorageKey = userEmail ? `onequiz_dashboard_tasks_${userEmail}` : "onequiz_dashboard_tasks_guest";

  const persistTasks = useCallback((newTasks: { id: string; text: string; done: boolean }[]) => {
    // 중복 ID 방어 제거
    const uniqueTasks = Array.from(
      new Map(newTasks.map((t) => [t.id, t])).values()
    );
    setTasks(uniqueTasks);

    if (typeof window !== "undefined") {
      localStorage.setItem(dashTasksStorageKey, JSON.stringify(uniqueTasks));
      try {
        const savedTasks = localStorage.getItem(tasksStorageKey);
        const allTasks: StoredTaskItem[] = savedTasks ? JSON.parse(savedTasks) : [];

        // 오늘 카테고리가 아닌 다른 할일 보존
        const otherCategoryTasks = allTasks.filter(
          (at) => at.categoryId && at.categoryId !== "cat-today"
        );

        // uniqueTasks를 StoredTaskItem으로 정규화
        const todayStoredItems: StoredTaskItem[] = uniqueTasks.map((nt) => {
          const existing = allTasks.find((at) => at.id === nt.id);
          return {
            id: nt.id,
            categoryId: "cat-today",
            title: nt.text,
            memo: existing?.memo || "",
            dueDate: existing?.dueDate || null,
            completed: nt.done,
            createdAt: existing?.createdAt || new Date().toISOString().slice(0, 10),
          };
        });

        const combined = [...otherCategoryTasks, ...todayStoredItems];
        localStorage.setItem(tasksStorageKey, JSON.stringify(combined));
      } catch {}
      window.dispatchEvent(new Event("onequiz_tasks_updated"));
    }
  }, [dashTasksStorageKey, tasksStorageKey]);

  // 외부(할일 페이지 등)에서 할일 변경 시 대시보드도 즉시 반영
  useEffect(() => {
    const handleSyncTasks = () => {
      if (typeof window !== "undefined") {
        const savedTasks = localStorage.getItem(tasksStorageKey);
        if (savedTasks) {
          try {
            const parsed = JSON.parse(savedTasks);
            if (Array.isArray(parsed)) {
              const todayItems = parsed
                .filter((t: StoredTaskItem) => t.categoryId === "cat-today" || !t.categoryId)
                .map((t: StoredTaskItem) => ({
                  id: t.id,
                  text: t.title || t.text || "",
                  done: !!t.completed,
                }));
              const unique = Array.from(
                new Map(todayItems.map((t) => [t.id, t])).values()
              );
              setTasks(unique);
            }
          } catch {}
        }
      }
    };
    window.addEventListener("onequiz_tasks_updated", handleSyncTasks);
    window.addEventListener("storage", handleSyncTasks);
    return () => {
      window.removeEventListener("onequiz_tasks_updated", handleSyncTasks);
      window.removeEventListener("storage", handleSyncTasks);
    };
  }, [tasksStorageKey]);

  // 마운트 후 로컬스토리지 및 DB에서 할일 목록 로드
  useEffect(() => {
    let ignore = false;

    // 1단계: 로컬스토리지에서 비동기 로드 (하이드레이션 불일치 및 cascading render 방지)
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && !ignore) {
        const savedTasks = localStorage.getItem(tasksStorageKey);
        if (savedTasks) {
          try {
            const parsed = JSON.parse(savedTasks);
            if (Array.isArray(parsed) && !ignore) {
              const todayItems = parsed
                .filter((t: StoredTaskItem) => t.categoryId === "cat-today" || !t.categoryId)
                .map((t: StoredTaskItem) => ({
                  id: t.id,
                  text: t.title || t.text || "",
                  done: !!t.completed,
                }));
              const unique = Array.from(
                new Map(todayItems.map((t) => [t.id, t])).values()
              );
              setTasks(unique);
            }
          } catch {}
        } else {
          const savedDash = localStorage.getItem(dashTasksStorageKey);
          if (savedDash) {
            try {
              const parsed = JSON.parse(savedDash);
              if (Array.isArray(parsed) && !ignore) {
                const unique = Array.from(
                  new Map(parsed.map((t: { id: string; text: string; done: boolean }) => [t.id, t])).values()
                );
                setTasks(unique);
              }
            } catch {}
          }
        }
      }
    }, 0);

    // 2단계: DB에서 최신 데이터 조회 및 동기화
    async function fetchDbTasks() {
      try {
        const res = await fetch("/api/tasks");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            const todayItems = data
              .filter(
                (t: Record<string, unknown>) =>
                  t.categoryId === "cat-today" || t.dueDate === todayStr || !t.categoryId
              )
              .map((t: Record<string, unknown>) => ({
                id: String(t._id || t.id),
                text: String(t.title || ""),
                done: Boolean(t.completed),
              }));
            const unique = Array.from(
              new Map(todayItems.map((t) => [t.id, t])).values()
            );
            setTasks(unique);
          }
        }
      } catch {}
    }
    fetchDbTasks();

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [dashTasksStorageKey, tasksStorageKey]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newTaskInput.trim();
    if (!text) return;

    const tempId = `t-${Date.now()}`;
    const optimisticTasks = [...tasks, { id: tempId, text, done: false }];
    persistTasks(optimisticTasks);
    setNewTaskInput("");

    // 🌟 대시보드에서 할일 입력 시 DB에 직접 추가 (/api/tasks POST)
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: text,
          categoryId: "cat-today",
          completed: false,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        const createdTask = result.data || result;
        const realId = createdTask._id || createdTask.id;
        if (realId) {
          const realIdStr = String(realId);
          // tempId를 realId로 안전하게 1:1 교체
          setTasks((prev) =>
            prev.map((t) => (t.id === tempId ? { ...t, id: realIdStr } : t))
          );
          if (typeof window !== "undefined") {
            try {
              const saved = localStorage.getItem(tasksStorageKey);
              if (saved) {
                const parsed: StoredTaskItem[] = JSON.parse(saved);
                const updatedAll = parsed.map((item) =>
                  item.id === tempId ? { ...item, id: realIdStr } : item
                );
                localStorage.setItem(tasksStorageKey, JSON.stringify(updatedAll));
              }
              const savedDash = localStorage.getItem(dashTasksStorageKey);
              if (savedDash) {
                const parsedDash = JSON.parse(savedDash);
                const updatedDash = parsedDash.map((t: { id: string }) =>
                  t.id === tempId ? { ...t, id: realIdStr } : t
                );
                localStorage.setItem(dashTasksStorageKey, JSON.stringify(updatedDash));
              }
            } catch {}
            window.dispatchEvent(new Event("onequiz_tasks_updated"));
          }
        }
        toast.success("할일이 DB에 저장되었습니다.");
      }
    } catch {
      // 오프라인이거나 에러 시 로컬 저장 유지
    }
  };

  const handleToggleTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const nextDone = !target.done;

    const updated = tasks.map((t) => (t.id === id ? { ...t, done: nextDone } : t));
    persistTasks(updated);

    // 🌟 DB 상태 즉시 업데이트 (/api/tasks PUT)
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          completed: nextDone,
        }),
      });
    } catch {}
  };

  // 5. 드래그 앤 드롭 순서 변경 상태
  const [draggingWidgetId, setDraggingWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    // 🌟 위젯을 잡고 이동할 때 이전에 선택된 텍스트 선택 영역 즉시 해제 (잔상 방지)
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingWidgetId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverWidgetId !== id) {
      setDragOverWidgetId(id);
    }
  };

  const handleDragEnd = () => {
    setDraggingWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggingWidgetId;
    handleDragEnd();

    if (!sourceId || sourceId === targetId) return;

    const sourceIdx = widgets.findIndex((w) => w.id === sourceId);
    const targetIdx = widgets.findIndex((w) => w.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...widgets];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    persistWidgets(reordered);
  };

  // 위젯 켜기/끄기 토글
  const handleToggleWidget = (id: string) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    persistWidgets(updated);
  };

  // 위젯 닫기(x 버튼)
  const handleHideWidget = (id: string) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, visible: false } : w));
    persistWidgets(updated);
  };

  // 날짜 계산 (마운트 후 계산)
  const now = mounted ? new Date() : null;
  const hours = now ? now.getHours() : 19;
  const greeting =
    hours < 11 ? "좋은 아침이에요" : hours < 18 ? "즐거운 오후 보내세요" : "좋은 저녁이에요";
  const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const currentDateStr = now
    ? `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}`
    : "2026년 11월 4일 수요일";

  // 날짜 키 (YYYY-MM-DD)
  const todayKey = now
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
    : "2026-11-04";

  // 오늘 일정 목록 필터링
  const todayEvents = useMemo(() => {
    return calendarEvents.filter((evt) => {
      const s = getLocalDateKey(evt.startDate);
      const e = getLocalDateKey(evt.endDate);
      return s <= todayKey && e >= todayKey;
    });
  }, [calendarEvents, todayKey]);

  // 다가오는 일정 목록 필터링
  const upcomingEvents = useMemo(() => {
    return calendarEvents
      .filter((evt) => getLocalDateKey(evt.startDate) > todayKey)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [calendarEvents, todayKey]);

  // 상단 요약 카운트
  const todayEventCount = todayEvents.length;
  const taskCount = tasks.length;
  const completedCount = tasks.filter((t) => t.done).length;
  const completionRate = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  // 표시할 위젯 목록
  const visibleWidgets = useMemo(() => widgets.filter((w) => w.visible), [widgets]);

  // 모바일/접근성 지원: 전체 위젯 목록 순서 변경 (메뉴 내)
  const handleMoveWidgetInAll = (id: string, direction: "up" | "down") => {
    const currentIndex = widgets.findIndex((w) => w.id === id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;

    const reordered = [...widgets];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    persistWidgets(reordered);
  };

  // 모바일/접근성 지원: 화면에 표시된 위젯 순서 변경 (카드 헤더 화살표)
  const handleMoveVisibleWidget = (id: string, direction: "up" | "down") => {
    const visibleIdx = visibleWidgets.findIndex((w) => w.id === id);
    if (visibleIdx === -1) return;
    const targetVisibleIdx = direction === "up" ? visibleIdx - 1 : visibleIdx + 1;
    if (targetVisibleIdx < 0 || targetVisibleIdx >= visibleWidgets.length) return;

    const targetId = visibleWidgets[targetVisibleIdx].id;
    const sourceIdx = widgets.findIndex((w) => w.id === id);
    const targetIdx = widgets.findIndex((w) => w.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...widgets];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    persistWidgets(reordered);
  };

  return (
    <div className="w-full space-y-5 text-on-surface select-none">
      {/* ================= 1. 최상단 대시보드 헤더 (전역 타이포그래피 모듈 통일) ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        {/* 좌측 인사말 */}
        <div>
          <div className="ui-page-subtitle font-mono">
            {currentDateStr}
          </div>
          <h1 className="ui-page-title mt-1">
            {greeting}, <span className="text-primary">{userName}</span>님
          </h1>
        </div>

        {/* 우측 컨트롤 및 요약 바 */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs text-on-surface-variant px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant font-medium">
            <Link href="/calendar" className="hover:text-primary transition-colors">
              오늘 일정 <span className="font-bold text-on-surface font-mono">{mounted ? todayEventCount : 0}</span>
            </Link>
            <span className="text-outline">·</span>
            <Link href="/tasks" className="hover:text-primary transition-colors">
              할일 <span className="font-bold text-on-surface font-mono">{mounted ? taskCount : 0}</span>
            </Link>
            <span className="text-outline">·</span>
            <span>
              완료 <span className="font-bold text-on-surface font-mono">{mounted ? `${completionRate}%` : "0%"}</span>
            </span>
          </div>

          {/* 🌟 '위젯' 버튼 */}
          <div className="relative shrink-0" ref={widgetMenuRef}>
            <button
              onClick={() => setIsWidgetMenuOpen(!isWidgetMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <LayoutGrid size={14} />
              <span>위젯 구성</span>
            </button>

            {/* 🌟 홈 위젯 구성 드롭다운 메뉴 */}
            {isWidgetMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 sm:w-72 bg-surface-container-lowest border border-outline-variant rounded-xl p-2 shadow-md z-50 space-y-1 text-on-surface animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-2.5 py-1.5 text-xs font-bold text-on-surface-variant border-b border-outline-variant mb-1">
                  <span>홈 위젯 구성 및 순서</span>
                  <span className="text-[10px] font-normal text-on-surface-variant/70">
                    {visibleWidgets.length}/{widgets.length} 표시중
                  </span>
                </div>
                <div className="max-h-[380px] overflow-y-auto space-y-1 scrollbar-thin pr-0.5">
                  {widgets.map((w, idx) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-surface-container-low transition-colors group/item"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleWidget(w.id)}
                        className="flex items-center gap-2 flex-1 text-left min-w-0 cursor-pointer py-1"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            w.visible
                              ? "bg-primary border-primary text-on-primary"
                              : "border-outline-variant bg-surface-container"
                          }`}
                        >
                          {w.visible && <Check size={11} />}
                        </div>
                        <span
                          className={`text-xs truncate ${
                            w.visible
                              ? "text-on-surface font-semibold"
                              : "text-on-surface-variant/60 font-light"
                          }`}
                        >
                          {w.title}
                        </span>
                      </button>

                      <div className="flex items-center gap-0.5 shrink-0 ml-1">
                        <button
                          type="button"
                          onClick={() => handleMoveWidgetInAll(w.id, "up")}
                          disabled={idx === 0}
                          className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                          title="위로 이동"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveWidgetInAll(w.id, "down")}
                          disabled={idx === widgets.length - 1}
                          className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed transition-colors"
                          title="아래로 이동"
                        >
                          <ChevronDown size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. 반응형 Flat 3열 그리드 (모바일 1열, 태블릿 2열, PC 최대 3열) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {visibleWidgets.map((widget, widgetIdx) => {
          const isDragging = draggingWidgetId === widget.id;
          const isOver = dragOverWidgetId === widget.id && draggingWidgetId !== widget.id;
          const draggedWidget = draggingWidgetId ? widgets.find((w) => w.id === draggingWidgetId) : null;

          return (
            <div
              key={widget.id}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDrop={(e) => handleDrop(e, widget.id)}
              className={`relative h-[340px] min-h-[340px] bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs transition-all duration-200 group ${
                isDragging
                  ? "border-2 border-dashed border-primary/50 bg-primary/5 dark:bg-primary/10 scale-[0.98]"
                  : isOver
                  ? "border-2 border-primary ring-2 ring-primary/25"
                  : "hover:border-primary/40"
              }`}
            >
              {/* 🌟 1. 드래그 오버 시 목표 위치 스켈레톤 와이어프레임 프리뷰 */}
              {isOver && draggedWidget && (
                <div className="absolute inset-0 z-30 rounded-xl border-2 border-dashed border-primary bg-surface-container-lowest flex flex-col justify-between p-4 pointer-events-none text-primary animate-in fade-in zoom-in-95 duration-100">
                  {/* 스켈레톤 헤더 */}
                  <div className="flex items-center justify-between pb-3 border-b border-primary/25">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                        <WidgetIcon id={draggedWidget.id} />
                      </div>
                      <span className="text-sm font-bold text-on-surface">{draggedWidget.title}</span>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary text-on-primary">
                      여기로 이동
                    </span>
                  </div>

                  {/* 스켈레톤 본문 와이어프레임 */}
                  <div className="space-y-2.5 py-2 flex-1 flex flex-col justify-center">
                    <div className="h-3.5 w-4/5 rounded-full bg-primary/20" />
                    <div className="h-3 w-3/5 rounded-full bg-primary/25" />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="h-16 rounded-lg bg-primary/10 border border-dashed border-primary/30 flex items-center justify-center text-xs font-semibold text-primary/70">
                        위젯 배치 슬롯
                      </div>
                      <div className="h-16 rounded-lg bg-primary/10 border border-dashed border-primary/30 flex items-center justify-center text-xs font-semibold text-primary/70">
                        새 순서로 정렬
                      </div>
                    </div>
                    <div className="h-3 w-2/3 rounded-full bg-primary/15" />
                  </div>

                  {/* 스켈레톤 하단 가이드 */}
                  <div className="pt-2 border-t border-primary/20 flex items-center justify-center">
                    <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      마우스를 놓으면 이 자리에 배치됩니다
                    </p>
                  </div>
                </div>
              )}

              {/* 🌟 2. 드래그 중인 원본 카드: 스켈레톤 고스트 와이어프레임 표시 */}
              {isDragging ? (
                <div className="h-full flex flex-col justify-between p-4 pointer-events-none animate-pulse bg-primary/5">
                  <div className="flex items-center justify-between pb-3 border-b border-primary/20">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/20" />
                      <div className="h-4 w-24 rounded-md bg-primary/20" />
                    </div>
                    <span className="text-[11px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                      이동 중...
                    </span>
                  </div>
                  <div className="space-y-3 py-4 flex-1 flex flex-col justify-center">
                    <div className="h-3 w-3/4 rounded-full bg-primary/15" />
                    <div className="h-3 w-1/2 rounded-full bg-primary/20" />
                    <div className="h-3 w-5/6 rounded-full bg-primary/15" />
                    <div className="h-16 w-full rounded-xl bg-primary/10 border border-primary/20 mt-2" />
                  </div>
                  <div className="h-2 w-1/3 rounded-full bg-primary/15" />
                </div>
              ) : (
                <>
                  {/* 2-1. 위젯 카드 상단 헤더: 상단 바만 드래그 가능 (본문 텍스트 복사 보호) */}
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, widget.id)}
                    onDragEnd={handleDragEnd}
                    className="px-3.5 py-2.5 border-b border-outline-variant flex items-center justify-between text-sm cursor-grab active:cursor-grabbing bg-surface-container-low/40 select-none hover:bg-surface-container-low transition-colors group/header"
                    title="상단 바를 잡고 드래그하여 순서를 변경하세요"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical
                        size={14}
                        className="text-on-surface-variant/40 group-hover/header:text-primary transition-colors shrink-0"
                      />
                      <WidgetIcon id={widget.id} />
                      <span className="ui-card-title truncate">{widget.title}</span>
                    </div>

                    <div
                      className="flex items-center gap-1.5 shrink-0"
                      draggable={false}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      {/* 🌟 모바일 친화적 위치 이동 버튼 (터치 디바이스 지원) */}
                      <div className="flex items-center gap-0.5 mr-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveVisibleWidget(widget.id, "up");
                          }}
                          disabled={widgetIdx === 0}
                          className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                          title="이전 위치로 이동"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveVisibleWidget(widget.id, "down");
                          }}
                          disabled={widgetIdx === visibleWidgets.length - 1}
                          className="p-1 rounded text-on-surface-variant hover:text-primary hover:bg-surface-container disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                          title="다음 위치로 이동"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      <Link
                        href={getWidgetLink(widget.id)}
                        className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5"
                      >
                        전체 →
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleHideWidget(widget.id)}
                        className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                        title="위젯 닫기"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* 2-2. 위젯 본문 영역: 자유로운 텍스트 선택, 복사, 붙여넣기 100% 보장 (select-text, 카드 전체 높이 100% 활용) */}
                  <div className="p-3.5 sm:p-4 flex-1 min-h-0 flex flex-col text-sm text-on-surface select-text cursor-auto overflow-hidden">
                    {widget.id === "today_schedule" && (
                      <TodayScheduleWidget events={todayEvents} />
                    )}
                    {widget.id === "mini_calendar" && (
                      <MiniCalendarWidget events={calendarEvents} />
                    )}
                    {widget.id === "upcoming_schedule" && (
                      <UpcomingScheduleWidget events={upcomingEvents} />
                    )}
                    {widget.id === "today_tasks" && (
                      <TodayTasksWidget
                        tasks={tasks}
                        newTaskInput={newTaskInput}
                        setNewTaskInput={setNewTaskInput}
                        onAddTask={handleAddTask}
                        onToggleTask={handleToggleTask}
                      />
                    )}
                    {widget.id === "dday" && <DdayWidget events={calendarEvents} />}
                    {widget.id === "bookmarks" && <BookmarksWidget />}
                    {widget.id === "weather" && <WeatherWidget />}
                    {widget.id === "favorite_notes" && <FavoriteNotesWidget />}
                    {widget.id === "recent_files" && <RecentFilesWidget />}
                    {widget.id === "projects" && <ProjectsWidget />}
                    {widget.id === "chat" && <ChatWidget />}
                    {widget.id === "quick_exam" && <QuickExamWidget />}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* ================= 3. 하단 안내 문구 (사진 1 동일) ================= */}
      <div className="text-xs sm:text-sm text-on-surface-variant font-light pt-2">
        ※ 위젯 상단 헤더를 드래그하거나 화살표(▲/▼) 버튼으로 순서를 바꾸고, &quot;위젯&quot; 버튼이나 x 로 추가·제거하세요. 본문 내용은 자유롭게 선택 및 복사할 수 있습니다.
      </div>
    </div>
  );
}

// 위젯별 아이콘 맵핑
function WidgetIcon({ id }: { id: string }) {
  const iconClass = "text-primary shrink-0";
  switch (id) {
    case "today_schedule":
      return <Calendar size={17} className={iconClass} />;
    case "mini_calendar":
      return <CalendarDays size={17} className={iconClass} />;
    case "upcoming_schedule":
      return <Clock size={17} className={iconClass} />;
    case "today_tasks":
      return <CheckSquare size={17} className={iconClass} />;
    case "dday":
      return <Flag size={17} className={iconClass} />;
    case "bookmarks":
      return <Bookmark size={17} className={iconClass} />;
    case "weather":
      return <CloudSun size={17} className={iconClass} />;
    case "favorite_notes":
      return <FileText size={17} className={iconClass} />;
    case "recent_files":
      return <Folder size={17} className={iconClass} />;
    case "projects":
      return <Kanban size={17} className={iconClass} />;
    case "chat":
      return <MessageSquare size={17} className={iconClass} />;
    case "quick_exam":
      return <GraduationCap size={17} className={iconClass} />;
    default:
      return <LayoutGrid size={17} className={iconClass} />;
  }
}

// 전체 링크 맵핑
function getWidgetLink(id: string) {
  switch (id) {
    case "today_schedule":
    case "mini_calendar":
    case "upcoming_schedule":
    case "dday":
      return "/calendar";
    case "today_tasks":
      return "/tasks";
    case "favorite_notes":
      return "/diary";
    case "recent_files":
      return "/drive";
    case "projects":
      return "/projects";
    case "chat":
      return "/chat";
    case "quick_exam":
      return "/exam/subject";
    default:
      return "#";
  }
}

/* ================= 12개 위젯 컴포넌트 (테마 시맨틱 토큰 100% 준수) ================= */

// 1. 오늘 일정 위젯 (DB 연동, 더미 데이터 제거, 카드 전체 공간 100% 활용)
function TodayScheduleWidget({ events }: { events: CalendarEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center ui-empty-state">
        오늘 일정이 없습니다.
      </div>
    );
  }

  return (
    <CustomScrollArea className="h-full flex-1" viewportClassName="space-y-1.5 pr-1.5">
      {events.map((item, idx) => {
        const isAllDay = Boolean(item?.allDay);
        const startKey = getLocalDateKey(item?.startDate);
        const endKey = getLocalDateKey(item?.endDate);
        const startTime = getLocalTimeStr(item?.startDate);
        const endTime = getLocalTimeStr(item?.endDate);
        const timeStr = isAllDay ? "종일" : (startTime || "시간 미정");
        const tagStr = isAllDay
          ? (startKey && endKey && startKey !== endKey ? `${typeof startKey === "string" ? startKey.slice(5) : ""}~${typeof endKey === "string" ? endKey.slice(5) : ""}` : "")
          : (endTime ? `~${endTime}` : "");

        return (
          <div
            key={item?._id || idx}
            className="flex items-center justify-between py-2 border-b border-outline-variant/40 last:border-b-0 text-xs sm:text-sm"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-on-surface-variant text-[11px] w-9 shrink-0">{timeStr}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="truncate text-on-surface font-medium">{item?.title || "무제 일정"}</span>
            </div>
            {tagStr && (
              <span className="text-[11px] font-mono text-on-surface-variant shrink-0 ml-1.5">
                {tagStr}
              </span>
            )}
          </div>
        );
      })}
    </CustomScrollArea>
  );
}

// 2. 세련된 고대비 미니 캘린더 위젯 (호버 시 일정 프리뷰 팝오버 연동)
function MiniCalendarWidget({ events = [] }: { events?: CalendarEvent[] }) {
  const mounted = useMounted();
  const [current, setCurrent] = useState(() => new Date());
  const year = current.getFullYear();
  const month = current.getMonth();

  // 실제 오늘 날짜
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));
  const resetToToday = () => setCurrent(new Date());

  // 1일의 요일 및 말일 계산
  const firstDay = new Date(year, month, 1).getDay(); // 0(일) ~ 6(토)
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevMonthLastDate = new Date(year, month, 0).getDate();

  // 날짜별 일정 맵핑 (YYYY-MM-DD -> CalendarEvent[])
  const dayEventsMap = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((evt) => {
      try {
        const s = getLocalDateKey(evt.startDate);
        const e = getLocalDateKey(evt.endDate);
        if (!s || !e) return;
        const [sY, sM, sD] = s.split("-").map(Number);
        const [eY, eM, eD] = e.split("-").map(Number);
        const cur = new Date(sY, sM - 1, sD);
        const end = new Date(eY, eM - 1, eD);
        let loop = 0;
        while (cur <= end && loop < 366) {
          loop++;
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, "0");
          const d = String(cur.getDate()).padStart(2, "0");
          const k = `${y}-${m}-${d}`;
          if (!map.has(k)) map.set(k, []);
          map.get(k)!.push(evt);
          cur.setDate(cur.getDate() + 1);
        }
      } catch {}
    });
    return map;
  }, [events]);

  // 클릭으로 선택된 날짜의 일정 상세 팝오버 상태
  const [selectedDay, setSelectedDay] = useState<{
    dateKey: string;
    dayNum: number;
    dateTitle: string;
    events: CalendarEvent[];
    x: number;
    y: number;
    placeBelow: boolean;
  } | null>(null);

  // 바깥 클릭 시 팝오버 닫기
  useEffect(() => {
    if (!selectedDay) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-calendar-popover]")) return;
      setSelectedDay(null);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [selectedDay]);

  const handleClickDate = (
    e: React.MouseEvent<HTMLElement>,
    dateKey: string,
    dayNum: number,
    fullDate: Date,
    evts: CalendarEvent[]
  ) => {
    e.stopPropagation();
    if (selectedDay?.dateKey === dateKey) {
      setSelectedDay(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const placeBelow = rect.top < 230;
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dayOfWeek = dayNames[fullDate.getDay()];
    const dateTitle = `${fullDate.getMonth() + 1}월 ${fullDate.getDate()}일 (${dayOfWeek}요일)`;

    // 화면 밖으로 나가지 않도록 x좌표 클램프
    const popoverWidth = 280;
    const padding = 12;
    let targetX = rect.left + rect.width / 2;
    if (typeof window !== "undefined") {
      if (targetX - popoverWidth / 2 < padding) {
        targetX = padding + popoverWidth / 2;
      } else if (targetX + popoverWidth / 2 > window.innerWidth - padding) {
        targetX = window.innerWidth - padding - popoverWidth / 2;
      }
    }

    setSelectedDay({
      dateKey,
      dayNum,
      dateTitle,
      events: evts,
      x: Math.round(targetX),
      y: placeBelow ? Math.round(rect.bottom + 8) : Math.round(rect.top - 8),
      placeBelow,
    });
  };

  // 달력 그리드 배열 생성 (이전달 말일 + 이번달 + 다음달 초)
  const gridCells = useMemo(() => {
    const cells: Array<{
      dayNum: number;
      isCurrentMonth: boolean;
      dateKey: string;
      fullDate: Date;
      isSunday: boolean;
      isSaturday: boolean;
      isToday: boolean;
    }> = [];

    // 1. 이전 달의 끝 날짜들
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthLastDate - i;
      const prevDateObj = new Date(year, month - 1, d);
      const k = `${prevDateObj.getFullYear()}-${String(prevDateObj.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNum: d,
        isCurrentMonth: false,
        dateKey: k,
        fullDate: prevDateObj,
        isSunday: prevDateObj.getDay() === 0,
        isSaturday: prevDateObj.getDay() === 6,
        isToday: prevDateObj.getFullYear() === todayYear && prevDateObj.getMonth() === todayMonth && d === todayDate,
      });
    }

    // 2. 현재 달 날짜들
    for (let d = 1; d <= lastDate; d++) {
      const currDateObj = new Date(year, month, d);
      const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNum: d,
        isCurrentMonth: true,
        dateKey: k,
        fullDate: currDateObj,
        isSunday: currDateObj.getDay() === 0,
        isSaturday: currDateObj.getDay() === 6,
        isToday: year === todayYear && month === todayMonth && d === todayDate,
      });
    }

    // 3. 다음 달 날짜들로 35 또는 42칸 완성
    const totalSlots = cells.length <= 35 ? 35 : 42;
    const nextSlots = totalSlots - cells.length;
    for (let d = 1; d <= nextSlots; d++) {
      const nextDateObj = new Date(year, month + 1, d);
      const k = `${nextDateObj.getFullYear()}-${String(nextDateObj.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNum: d,
        isCurrentMonth: false,
        dateKey: k,
        fullDate: nextDateObj,
        isSunday: nextDateObj.getDay() === 0,
        isSaturday: nextDateObj.getDay() === 6,
        isToday: nextDateObj.getFullYear() === todayYear && nextDateObj.getMonth() === todayMonth && d === todayDate,
      });
    }

    return cells;
  }, [year, month, firstDay, lastDate, prevMonthLastDate, todayYear, todayMonth, todayDate]);

  return (
    <div className="flex flex-col justify-between h-full select-none">
      {/* 1. 상단 컨트롤 바 (연월 타이틀, 오늘 이동, 월 이동, 캘린더 바로가기) */}
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-on-surface tracking-tight">
            {year}년 {month + 1}월
          </span>
          <button
            type="button"
            onClick={resetToToday}
            className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface-variant transition-colors cursor-pointer"
            title="오늘 날짜로 이동"
          >
            오늘
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="이전 달"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="다음 달"
          >
            <ChevronRight size={15} />
          </button>
          <Link
            href="/calendar"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-surface-container text-primary transition-colors ml-0.5"
            title="전체 캘린더 열기"
          >
            <Calendar size={14} />
          </Link>
        </div>
      </div>

      {/* 2. 요일 헤더 (일: 빨강, 토: 파랑, 평일: 선명한 텍스트) */}
      <div className="grid grid-cols-7 text-center text-[11px] font-bold py-1 border-b border-outline-variant/40 mb-1">
        <span className="text-rose-500">일</span>
        <span className="text-on-surface-variant">월</span>
        <span className="text-on-surface-variant">화</span>
        <span className="text-on-surface-variant">수</span>
        <span className="text-on-surface-variant">목</span>
        <span className="text-on-surface-variant">금</span>
        <span className="text-blue-500">토</span>
      </div>

      {/* 3. 날짜 그리드 (고대비 세련된 셀 디자인 & 일정 도트) */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center flex-1 items-center">
        {gridCells.map((cell) => {
          const dayEvts = dayEventsMap.get(cell.dateKey) || [];
          const hasEvents = dayEvts.length > 0;
          const isSelected = selectedDay?.dateKey === cell.dateKey;

          return (
            <div
              key={cell.dateKey}
              onClick={(e) =>
                handleClickDate(e, cell.dateKey, cell.dayNum, cell.fullDate, dayEvts)
              }
              className="relative flex flex-col items-center justify-center py-0.5 group cursor-pointer"
            >
              {/* 날짜 숫자 뱃지 */}
              <div
                className={`w-6.5 h-6.5 sm:w-7 sm:h-7 flex items-center justify-center rounded-xl text-xs transition-all ${
                  cell.isToday
                    ? "bg-primary text-on-primary font-black shadow-xs ring-2 ring-primary/35 scale-105"
                    : isSelected
                    ? "bg-primary/20 text-primary font-black ring-2 ring-primary scale-105 shadow-xs"
                    : cell.isCurrentMonth
                    ? cell.isSunday
                      ? "text-rose-600 dark:text-rose-400 font-bold group-hover:bg-surface-container"
                      : cell.isSaturday
                      ? "text-blue-600 dark:text-blue-400 font-bold group-hover:bg-surface-container"
                      : "text-on-surface font-semibold group-hover:bg-surface-container"
                    : "text-on-surface-variant/35 font-normal group-hover:bg-surface-container/50"
                } ${hasEvents && !cell.isToday && !isSelected ? "ring-1 ring-outline-variant/80" : ""}`}
              >
                {cell.dayNum}
              </div>

              {/* 일정 도트 인디케이터 (카테고리 고유 컬러 반영) */}
              <div className="flex items-center justify-center gap-0.5 mt-0.5 h-1">
                {hasEvents ? (
                  <>
                    {dayEvts.slice(0, 3).map((evt, idx) => (
                      <span
                        key={evt._id || idx}
                        style={{ backgroundColor: evt.color || "var(--primary)" }}
                        className="w-1.5 h-1.5 rounded-full shadow-xs shrink-0 ring-1 ring-background"
                      />
                    ))}
                    {dayEvts.length > 3 && (
                      <span className="w-1 h-1 rounded-full bg-on-surface-variant shrink-0" />
                    )}
                  </>
                ) : (
                  <span className="w-1 h-1 opacity-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. 날짜 클릭 시 노출되는 모던 팝오버 (createPortal 최상단 렌더링) */}
      {mounted && selectedDay && createPortal(
        <div
          data-calendar-popover
          onClick={(e) => e.stopPropagation()}
          style={{
            top: `${selectedDay.y}px`,
            left: `${selectedDay.x}px`,
          }}
          className={`fixed z-[999999] -translate-x-1/2 w-72 p-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-md text-on-surface animate-in fade-in zoom-in-95 duration-100 ${
            selectedDay.placeBelow ? "" : "-translate-y-full"
          }`}
        >
          {/* 꼬리 화살표 */}
          <span
            className={`absolute left-1/2 -translate-x-1/2 border-x-[6px] border-x-transparent ${
              selectedDay.placeBelow
                ? "-top-1.5 border-b-[6px] border-b-surface-container-lowest"
                : "-bottom-1.5 border-t-[6px] border-t-surface-container-lowest"
            }`}
          />

          {/* 헤더: 일자 및 일정 개수 + X 닫기 버튼 */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-outline-variant/60">
            <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <Calendar size={13} className="text-primary" />
              {selectedDay.dateTitle}
            </span>
            <div className="flex items-center gap-1.5">
              {selectedDay.events.length > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {selectedDay.events.length}개
                </span>
              ) : (
                <span className="text-[10px] text-on-surface-variant font-medium">
                  0개
                </span>
              )}
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                title="닫기"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* 일정 목록 (최대 5개 노출, 초과 시 +외 N개 안내, 시간/종일 포함) */}
          {selectedDay.events.length === 0 ? (
            <div className="py-4 text-center text-xs text-on-surface-variant space-y-1.5">
              <p>등록된 일정이 없습니다.</p>
              <Link
                href="/calendar"
                onClick={() => setSelectedDay(null)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
              >
                전체 캘린더에서 일정 등록 →
              </Link>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin">
              {Array.isArray(selectedDay?.events) && selectedDay.events.slice(0, 5).map((evt, idx) => {
                const { isAllDay, timeText } = getEventTimeDisplay(evt, true);

                return (
                  <div
                    key={evt._id || idx}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-container-low/80 hover:bg-surface-container border border-outline-variant/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        style={{ backgroundColor: evt.color || "var(--primary)" }}
                        className="w-2 h-2 rounded-full shrink-0 shadow-xs ring-1 ring-background"
                      />
                      <span className="text-xs font-semibold text-on-surface truncate">
                        {evt.title}
                      </span>
                    </div>

                    {/* 시간 / 종일 뱃지 */}
                    {isAllDay ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                        종일
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] font-semibold text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded shrink-0">
                        {timeText}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* 5개 초과 시 N개 더보기 */}
              {selectedDay.events.length > 5 && (
                <Link
                  href="/calendar"
                  onClick={() => setSelectedDay(null)}
                  className="block py-1.5 px-2 text-center text-xs font-bold text-primary hover:underline bg-primary/5 rounded-xl border border-primary/20 transition-colors mt-1"
                >
                  +외 {selectedDay.events.length - 5}개 일정 더보기 (전체 {selectedDay.events.length}개) →
                </Link>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// 3. 다가오는 일정 위젯 (카드 전체 공간 100% 활용)
function UpcomingScheduleWidget({ events }: { events: CalendarEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center ui-empty-state">
        다가오는 일정이 없습니다.
      </div>
    );
  }

  return (
    <CustomScrollArea className="h-full flex-1" viewportClassName="space-y-1.5 pr-1.5">
      {events.map((evt, idx) => {
        const startKey = getLocalDateKey(evt?.startDate);
        return (
          <div key={idx} className="flex items-center justify-between text-xs sm:text-sm py-2 border-b border-outline-variant/30 last:border-b-0">
            <div className="flex items-center gap-2 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="truncate text-on-surface font-medium">{evt?.title || "무제 일정"}</span>
            </div>
            {startKey && typeof startKey === "string" && (
              <span className="text-[11px] font-mono text-on-surface-variant shrink-0">
                {startKey.slice(5)}
              </span>
            )}
          </div>
        );
      })}
    </CustomScrollArea>
  );
}

// 4. 오늘 할일 위젯 (카드 전체 공간 100% 활용)
function TodayTasksWidget({
  tasks,
  newTaskInput,
  setNewTaskInput,
  onAddTask,
  onToggleTask,
}: {
  tasks: { id: string; text: string; done: boolean }[];
  newTaskInput: string;
  setNewTaskInput: (v: string) => void;
  onAddTask: (e: React.FormEvent) => void;
  onToggleTask: (id: string) => void;
}) {
  return (
    <div className="flex flex-col justify-between h-full space-y-2">
      <CustomScrollArea className="flex-1 min-h-0" viewportClassName="space-y-1.5 pr-1.5">
        {tasks.length === 0 ? (
          <div className="h-full flex items-center justify-center ui-empty-state py-8">
            오늘 할일이 없습니다.
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onToggleTask(task.id)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-container-low cursor-pointer text-xs sm:text-sm transition-colors"
            >
              {task.done ? (
                <CheckSquare size={15} className="text-primary shrink-0" />
              ) : (
                <Square size={15} className="text-on-surface-variant shrink-0" />
              )}
              <span
                className={`truncate ${
                  task.done ? "line-through text-on-surface-variant/50" : "text-on-surface font-medium"
                }`}
              >
                {task.text}
              </span>
            </div>
          ))
        )}
      </CustomScrollArea>

      {/* 할일 인라인 퀵 추가 (사진 1) */}
      <form onSubmit={onAddTask} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newTaskInput}
          onChange={(e) => setNewTaskInput(e.target.value)}
          placeholder="할일 빠르게 추가 후 Enter"
          className="flex-1 px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary font-medium"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-primary text-on-primary font-bold rounded-lg text-xs sm:text-sm hover:opacity-90 shrink-0 cursor-pointer shadow-xs"
        >
          추가
        </button>
      </form>
    </div>
  );
}

// 5. D-day 위젯 (실제 캘린더 일정 및 시험/프로젝트 D-day 실시간 연동)
function DdayWidget({ events = [] }: { events?: CalendarEvent[] }) {
  const ddays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const list: { title: string; dateStr: string; diffDays: number }[] = [];

    events.forEach((evt) => {
      const target = new Date(evt.startDate);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // 다가오는 일정 또는 오늘 일정만 D-day 대상
      if (diffDays >= -7) {
        list.push({
          title: evt.title,
          dateStr: getLocalDateKey(evt.startDate),
          diffDays,
        });
      }
    });

    // 기본 D-day 후보 (정보처리기사, 수능/공채 등)
    if (list.length === 0) {
      list.push(
        { title: "2026 정보처리기사 실기시험", dateStr: "2026-11-28", diffDays: 20 },
        { title: "one-quiz 2.0 정식 릴리즈", dateStr: "2026-11-30", diffDays: 22 }
      );
    }

    return list.sort((a, b) => a.diffDays - b.diffDays).slice(0, 20);
  }, [events]);

  return (
    <CustomScrollArea className="h-full flex-1" viewportClassName="space-y-1.5 pr-1.5">
      {ddays.map((item, idx) => {
        const isDDay = item.diffDays === 0;
        const isPast = item.diffDays < 0;
        const badgeText = isDDay ? "D-DAY" : isPast ? `D+${Math.abs(item.diffDays)}` : `D-${item.diffDays}`;
        const badgeColor = isDDay
          ? "bg-rose-500 text-white font-black"
          : isPast
          ? "bg-surface-container-high text-on-surface-variant font-mono"
          : "bg-primary text-on-primary font-mono font-bold";

        return (
          <div
            key={idx}
            className="flex items-center justify-between py-2 border-b border-outline-variant/40 last:border-b-0 text-xs sm:text-sm"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={`px-2 py-0.5 rounded-lg text-xs leading-none shrink-0 ${badgeColor}`}>
                {badgeText}
              </span>
              <span className="truncate text-on-surface font-semibold">{item.title}</span>
            </div>
            <span className="text-[11px] font-mono text-on-surface-variant shrink-0 ml-1.5">
              {typeof item.dateStr === "string" ? item.dateStr.slice(5) : ""}
            </span>
          </div>
        );
      })}
    </CustomScrollArea>
  );
}

// 6. 북마크 위젯 (실제 /api/bookmarks DB 실시간 연동, 카드 전체 공간 100% 활용)
function BookmarksWidget() {
  const [bookmarks, setBookmarks] = useState<Array<{ id: string; title: string; url: string; category?: string; starred?: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadBookmarks() {
      try {
        const res = await fetch("/api/bookmarks");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setBookmarks(data.slice(0, 30));
          }
        }
      } catch {}
      if (!ignore) setIsLoading(false);
    }
    loadBookmarks();
    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center ui-caption">북마크 로딩 중...</div>;
  }

  if (bookmarks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center ui-empty-state gap-2">
        <span>저장된 북마크가 없습니다.</span>
        <Link
          href="/bookmarks"
          className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
        >
          북마크 추가하기
        </Link>
      </div>
    );
  }

  return (
    <CustomScrollArea className="h-full flex-1" viewportClassName="space-y-1.5 pr-1.5">
      {bookmarks.map((bm) => (
        <a
          key={bm.id}
          href={bm.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors group text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Bookmark className="w-3.5 h-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate text-on-surface font-medium group-hover:text-primary transition-colors">
              {bm.title}
            </span>
          </div>
          {bm.category && (
            <span className="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant shrink-0 ml-1.5">
              {bm.category}
            </span>
          )}
        </a>
      ))}
    </CustomScrollArea>
  );
}

// 7. 날씨 위젯 (현재 시각 및 날씨 정보)
function WeatherWidget() {
  return (
    <div className="flex flex-col justify-between h-full space-y-2 text-on-surface">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CloudSun size={36} className="text-primary shrink-0" />
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono leading-none text-on-surface">
              15°C
            </div>
            <div className="text-xs text-on-surface-variant mt-1">
              서울특별시 송파구 · 맑음
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-on-surface font-mono bg-surface-container-low border border-outline-variant p-2 rounded-lg">
        <div className="flex items-center gap-1.5">
          <Droplets size={12} className="text-primary" /> 습도 58%
        </div>
        <div className="flex items-center gap-1.5">
          <Wind size={12} className="text-primary" /> 바람 1.8m/s
        </div>
        <div className="flex items-center gap-1.5">
          <Umbrella size={12} className="text-primary" /> 강수확률 10%
        </div>
        <div className="text-on-surface-variant">내일 최고/최저 17°/6°</div>
      </div>

      <div className="flex justify-between text-center font-mono text-[11px] text-on-surface-variant border-t border-outline-variant pt-1.5">
        <div>12시<br />15°</div>
        <div>15시<br />17°</div>
        <div>18시<br />14°</div>
        <div>21시<br />11°</div>
        <div>00시<br />9°</div>
        <div>03시<br />7°</div>
      </div>
    </div>
  );
}

// 8. 즐겨찾기 노트 위젯 (실제 /api/diary DB 실시간 연동, 카드 전체 공간 100% 활용)
function FavoriteNotesWidget() {
  const [diaries, setDiaries] = useState<
    Array<{
      _id: string;
      title?: string;
      content?: string;
      date?: string;
      createdAt?: string;
      items?: Array<{ title?: string; content?: string }>;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadDiaries() {
      try {
        const res = await fetch("/api/diary");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setDiaries(data.slice(0, 30));
          }
        }
      } catch {}
      if (!ignore) setIsLoading(false);
    }
    loadDiaries();
    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center ui-caption">노트 로딩 중...</div>;
  }

  if (diaries.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center ui-empty-state gap-2">
        <span>작성된 일기나 노트가 없습니다.</span>
        <Link
          href="/diary"
          className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
        >
          첫 일기 작성하기
        </Link>
      </div>
    );
  }

  return (
    <CustomScrollArea className="h-full flex-1" viewportClassName="space-y-1.5 pr-1.5">
      {diaries.map((d, idx) => {
        const firstItem = Array.isArray(d.items) && d.items.length > 0 ? d.items[0] : null;
        const firstItemContent = typeof firstItem === "string" ? firstItem : firstItem?.content;
        const displayTitle =
          d.title ||
          (typeof firstItem === "object" && firstItem?.title ? firstItem.title : "") ||
          (firstItemContent ? String(firstItemContent).slice(0, 30) : "") ||
          (d.content ? String(d.content).slice(0, 30) : "") ||
          "기록된 일기";

        const rawDate = d.date || d.createdAt;
        let dateStr = "";
        if (rawDate) {
          const dObj = new Date(rawDate);
          if (!isNaN(dObj.getTime())) {
            dateStr = `${dObj.getMonth() + 1}/${dObj.getDate()}`;
          }
        }

        return (
          <Link
            key={d._id || idx}
            href="/diary"
            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors group text-xs sm:text-sm"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate text-on-surface font-medium group-hover:text-primary transition-colors">
                {displayTitle}
              </span>
            </div>
            {dateStr && (
              <span className="text-[11px] font-mono text-on-surface-variant shrink-0 ml-1.5">
                {dateStr}
              </span>
            )}
          </Link>
        );
      })}
    </CustomScrollArea>
  );
}

// 9. 최근 파일 위젯 (실제 /api/drive DB 실시간 연동, 카드 전체 공간 100% 활용)
function RecentFilesWidget() {
  const [files, setFiles] = useState<
    Array<{ id: string; name?: string; title?: string; folder?: string; updatedAt?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadFiles() {
      try {
        const res = await fetch("/api/drive");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setFiles(data.slice(0, 30));
          }
        }
      } catch {}
      if (!ignore) setIsLoading(false);
    }
    loadFiles();
    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center ui-caption">파일 로딩 중...</div>;
  }

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center ui-empty-state gap-2">
        <span>아직 드라이브 문서가 없습니다.</span>
        <Link
          href="/drive"
          className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
        >
          새 문서 만들기
        </Link>
      </div>
    );
  }

  return (
    <CustomScrollArea className="h-full flex-1" viewportClassName="space-y-1.5 pr-1.5">
      {files.map((f, idx) => (
        <Link
          key={f.id || idx}
          href="/drive"
          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors group text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Folder className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate text-on-surface font-medium group-hover:text-primary transition-colors">
              {f.name || f.title || "무제 문서"}
            </span>
          </div>
          {f.folder && (
            <span className="text-[10px] bg-surface-container-high px-1.5 py-0.5 rounded text-on-surface-variant shrink-0 ml-1.5">
              {f.folder}
            </span>
          )}
        </Link>
      ))}
    </CustomScrollArea>
  );
}

// 11. 프로젝트 위젯 (실제 /api/ideas DB 실시간 연동, 카드 전체 공간 100% 활용)
function ProjectsWidget() {
  const [ideas, setIdeas] = useState<Array<{ id?: string; _id?: string; title: string; status: string; priority?: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function loadIdeas() {
      try {
        const res = await fetch("/api/ideas");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setIdeas(data.slice(0, 30));
          }
        }
      } catch {}
      if (!ignore) setIsLoading(false);
    }
    loadIdeas();
    return () => {
      ignore = true;
    };
  }, []);

  if (isLoading) {
    return <div className="h-full flex items-center justify-center ui-caption">프로젝트 로딩 중...</div>;
  }

  if (ideas.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center ui-empty-state gap-2">
        <span>등록된 프로젝트 작업이 없습니다.</span>
        <Link
          href="/projects"
          className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition-colors"
        >
          새 프로젝트 기획하기
        </Link>
      </div>
    );
  }

  return (
    <CustomScrollArea className="h-full flex-1" viewportClassName="space-y-1.5 pr-1.5">
      {ideas.map((item) => (
        <Link
          key={item._id || item.id}
          href="/projects"
          className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-container-low transition-colors group text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Kanban className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate text-on-surface font-medium group-hover:text-primary transition-colors">
              {item.title}
            </span>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant shrink-0">
            {item.status || "진행중"}
          </span>
        </Link>
      ))}
    </CustomScrollArea>
  );
}

// 12. 채팅 위젯 (실제 /api/chat DB 실시간 SSE + 폴링 연동 및 대시보드 퀵 메시지 전송)
function ChatWidget() {
  const [messages, setMessages] = useState<Array<{ _id: string; senderName: string; content: string; createdAt: string }>>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch("/api/chat?groupId=global&limit=20");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    } catch {}
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    async function loadChat() {
      try {
        const res = await fetch("/api/chat?groupId=global&limit=20");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data.messages)) {
            const list = data.messages;
            setMessages((prev) => {
              const map = new Map<string, (typeof list)[0]>();
              list.forEach((m: (typeof list)[0]) => {
                if (m && m._id) map.set(String(m._id), m);
              });
              prev.forEach((m) => {
                if (m && m._id && !map.has(String(m._id))) {
                  map.set(String(m._id), m);
                }
              });
              return Array.from(map.values()).sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              );
            });
          }
        }
      } catch {}
      if (!ignore) setIsLoading(false);
    }
    loadChat();

    // 🌟 실시간 SSE 연결 (A PC -> B PC 즉시 반영)
    try {
      eventSource = new EventSource("/api/chat/stream?groupId=global");
      eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.startsWith(":")) return;
          const newMsg = JSON.parse(event.data);
          if (newMsg && newMsg._id) {
            const idStr = String(newMsg._id);
            setMessages((prev) => {
              if (prev.some((m) => String(m._id) === idStr)) return prev;
              return [...prev, newMsg];
            });
          }
        } catch {}
      };
    } catch (sseErr) {
      console.warn("Dashboard Chat SSE error:", sseErr);
    }

    // 🌟 3초 보조 폴링
    pollInterval = setInterval(() => {
      if (document.hidden) return;
      loadChat();
    }, 3000);

    return () => {
      ignore = true;
      if (pollInterval) clearInterval(pollInterval);
      if (eventSource) eventSource.close();
    };
  }, []);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMsg.trim();
    if (!text) return;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: "global",
          channelName: "일반",
          content: text,
        }),
      });
      if (res.ok) {
        setInputMsg("");
        fetchChat();
      }
    } catch {}
  };

  const uniqueMessages = useMemo(() => {
    const map = new Map<string, (typeof messages)[0]>();
    messages.forEach((m) => {
      if (m && m._id) {
        map.set(String(m._id), m);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);

  return (
    <div className="flex flex-col justify-between h-full space-y-2">
      <CustomScrollArea className="flex-1 min-h-0" viewportClassName="space-y-1.5 pr-1.5">
        {isLoading ? (
          <div className="h-full flex items-center justify-center ui-caption">채팅 로딩 중...</div>
        ) : uniqueMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center ui-empty-state py-4">
            라운지에 첫 메시지를 남겨보세요!
          </div>
        ) : (
          uniqueMessages.map((m, idx) => (
            <div key={m._id || `dash-msg-${idx}`} className="p-1 rounded text-xs flex items-start gap-1.5">
              <span className="font-bold text-primary shrink-0">{m.senderName}:</span>
              <span className="text-on-surface truncate">{m.content}</span>
            </div>
          ))
        )}
      </CustomScrollArea>

      {/* 대시보드 인라인 퀵 채팅 입력창 */}
      <form onSubmit={handleSendChat} className="flex items-center gap-1.5 pt-1">
        <input
          type="text"
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          placeholder="라운지에 메시지 전송..."
          className="flex-1 px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-hidden focus:border-primary font-medium"
        />
        <button
          type="submit"
          className="p-1.5 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0"
          title="전송"
        >
          <Send size={13} />
        </button>
      </form>
    </div>
  );
}

// 13. +N 퀵 기출문제 풀이 위젯 (카드 전체 공간 100% 활용)
function QuickExamWidget() {
  return (
    <div className="h-full flex flex-col justify-between py-1">
      <div>
        <div className="font-bold text-sm text-on-surface">정보처리기사 실전 모의고사</div>
        <p className="text-xs text-on-surface-variant mt-1 font-light">
          최근 자주 틀린 오답 노트와 핵심 기출을 바로 풀어보세요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 my-2 text-center">
        <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-2.5">
          <div className="text-[11px] text-on-surface-variant font-medium">실전 대비</div>
          <div className="text-sm font-black text-primary font-mono mt-0.5">기출 100제</div>
        </div>
        <div className="bg-surface-container-low border border-outline-variant/60 rounded-xl p-2.5">
          <div className="text-[11px] text-on-surface-variant font-medium">목표 합격선</div>
          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">80점 이상</div>
        </div>
      </div>

      <Link
        href="/exam/subject"
        className="w-full py-2 bg-primary text-on-primary font-bold rounded-lg text-xs sm:text-sm flex items-center justify-center gap-1.5 hover:opacity-90 shadow-xs transition-opacity"
      >
        <GraduationCap size={15} />
        <span>바로 문제 풀기</span>
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}
