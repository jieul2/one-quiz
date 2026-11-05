"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Users,
  Kanban,
  MessageSquare,
  GraduationCap,
  LayoutGrid,
  Check,
  X,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Wind,
  Umbrella,
} from "lucide-react";
import { CalendarEvent } from "@/components/calendar/calendarTypes";
import { toast } from "@/lib/toast";
import { ScrollArea } from "@/components/ui/ScrollArea";

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
  { id: "favorite_contacts", title: "즐겨찾는 연락처", visible: true },
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
              setWidgets(parsed);
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

  const persistTasks = useCallback((newTasks: { id: string; text: string; done: boolean }[]) => {
    // 중복 ID 방어 제거
    const uniqueTasks = Array.from(
      new Map(newTasks.map((t) => [t.id, t])).values()
    );
    setTasks(uniqueTasks);

    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_dashboard_tasks", JSON.stringify(uniqueTasks));
      try {
        const savedTasks = localStorage.getItem("onequiz_tasks_items_v2");
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
        localStorage.setItem("onequiz_tasks_items_v2", JSON.stringify(combined));
      } catch {}
      window.dispatchEvent(new Event("onequiz_tasks_updated"));
    }
  }, []);

  // 외부(할일 페이지 등)에서 할일 변경 시 대시보드도 즉시 반영
  useEffect(() => {
    const handleSyncTasks = () => {
      if (typeof window !== "undefined") {
        const savedTasks = localStorage.getItem("onequiz_tasks_items_v2");
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
  }, []);

  // 마운트 후 로컬스토리지 및 DB에서 할일 목록 로드
  useEffect(() => {
    let ignore = false;

    // 1단계: 로컬스토리지에서 비동기 로드 (하이드레이션 불일치 및 cascading render 방지)
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && !ignore) {
        const savedTasks = localStorage.getItem("onequiz_tasks_items_v2");
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
          const savedDash = localStorage.getItem("onequiz_dashboard_tasks");
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
  }, []);

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
              const saved = localStorage.getItem("onequiz_tasks_items_v2");
              if (saved) {
                const parsed: StoredTaskItem[] = JSON.parse(saved);
                const updatedAll = parsed.map((item) =>
                  item.id === tempId ? { ...item, id: realIdStr } : item
                );
                localStorage.setItem("onequiz_tasks_items_v2", JSON.stringify(updatedAll));
              }
              const savedDash = localStorage.getItem("onequiz_dashboard_tasks");
              if (savedDash) {
                const parsedDash = JSON.parse(savedDash);
                const updatedDash = parsedDash.map((t: { id: string }) =>
                  t.id === tempId ? { ...t, id: realIdStr } : t
                );
                localStorage.setItem("onequiz_dashboard_tasks", JSON.stringify(updatedDash));
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
      const s = evt.startDate.slice(0, 10);
      const e = evt.endDate.slice(0, 10);
      return s <= todayKey && e >= todayKey;
    });
  }, [calendarEvents, todayKey]);

  // 다가오는 일정 목록 필터링
  const upcomingEvents = useMemo(() => {
    return calendarEvents
      .filter((evt) => evt.startDate.slice(0, 10) > todayKey)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [calendarEvents, todayKey]);

  // 상단 요약 카운트
  const todayEventCount = todayEvents.length;
  const taskCount = tasks.length;
  const completedCount = tasks.filter((t) => t.done).length;
  const completionRate = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  // 표시할 위젯 목록
  const visibleWidgets = useMemo(() => widgets.filter((w) => w.visible), [widgets]);

  return (
    <div className="w-full space-y-5 text-on-surface select-none">
      {/* 비로그인(게스트) 안내 배너 */}
      {!session?.user && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              <strong>게스트(체험) 모드로 접속 중입니다:</strong> 위젯 배치 및 로컬 할일은 현재 브라우저에 임시 저장됩니다. 클라우드 자동 동기화, 오답노트 저장, 다중 기기 연동을 사용하려면 로그인하세요.
            </span>
          </div>
          <button
            onClick={() => signIn()}
            className="px-3 py-1.5 rounded-md bg-primary text-on-primary font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0 self-end sm:self-auto shadow-xs"
          >
            로그인하기
          </button>
        </div>
      )}

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

        {/* 우측 통계 칩 3개 + '위젯' 단일 버튼 (사진 1) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 오늘 일정 */}
          <Link
            href="/calendar"
            className="flex flex-col items-center justify-center px-4 py-2 bg-surface-container-low hover:bg-surface-container border border-outline-variant/70 rounded-xl min-w-[72px] transition-colors"
          >
            <span
              className="text-lg sm:text-xl font-black text-on-surface font-mono leading-none"
              suppressHydrationWarning
            >
              {mounted ? todayEventCount : 0}
            </span>
            <span className="text-xs text-on-surface-variant font-medium mt-1">오늘 일정</span>
          </Link>

          {/* 할일 */}
          <Link
            href="/tasks"
            className="flex flex-col items-center justify-center px-4 py-2 bg-surface-container-low hover:bg-surface-container border border-outline-variant/70 rounded-xl min-w-[72px] transition-colors"
          >
            <span
              className="text-lg sm:text-xl font-black text-on-surface font-mono leading-none"
              suppressHydrationWarning
            >
              {mounted ? taskCount : 0}
            </span>
            <span className="text-xs text-on-surface-variant font-medium mt-1">할일</span>
          </Link>

          {/* 완료율 */}
          <div className="flex flex-col items-center justify-center px-4 py-2 bg-surface-container-low border border-outline-variant/70 rounded-xl min-w-[72px]">
            <span
              className="text-lg sm:text-xl font-black text-on-surface font-mono leading-none"
              suppressHydrationWarning
            >
              {mounted ? `${completionRate}%` : "0%"}
            </span>
            <span className="text-xs text-on-surface-variant font-medium mt-1">완료</span>
          </div>

          {/* 🌟 '위젯' 버튼 (대시보드의 유일한 컨트롤 버튼) */}
          <div className="relative" ref={widgetMenuRef}>
            <button
              onClick={() => setIsWidgetMenuOpen(!isWidgetMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/70 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <LayoutGrid size={15} />
              <span>위젯</span>
            </button>

            {/* 🌟 홈 위젯 구성 드롭다운 메뉴 (테마 색상 준수) */}
            {isWidgetMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl p-2 shadow-xl z-50 space-y-1 text-on-surface animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-xs font-bold text-on-surface-variant border-b border-outline-variant mb-1">
                  홈 위젯 구성
                </div>
                <div className="max-h-[380px] overflow-y-auto space-y-0.5 scrollbar-thin pr-1">
                  {widgets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handleToggleWidget(w.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-left hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <span className={w.visible ? "text-on-surface font-semibold" : "text-on-surface-variant font-light"}>
                        {w.title}
                      </span>
                      {w.visible && <Check size={15} className="text-primary shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. 반응형 Flat 3열 그리드 (모바일 1열, 태블릿 2열, PC 최대 3열) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        {visibleWidgets.map((widget) => {
          const isDragging = draggingWidgetId === widget.id;
          const isOver = dragOverWidgetId === widget.id && draggingWidgetId !== widget.id;
          const draggedWidget = draggingWidgetId ? widgets.find((w) => w.id === draggingWidgetId) : null;

          return (
            <div
              key={widget.id}
              draggable
              onDragStart={(e) => handleDragStart(e, widget.id)}
              onDragOver={(e) => handleDragOver(e, widget.id)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, widget.id)}
              className={`relative h-[340px] min-h-[340px] bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col justify-between shadow-xs transition-all duration-150 select-none group ${
                isDragging ? "opacity-30 border-dashed border-primary scale-[0.98]" : "opacity-100 hover:border-primary/40"
              }`}
            >
              {/* 🌟 드래그 오버 시 카드형식 그대로 반투명 이동 예상위치 표시 (요청사항 반영) */}
              {isOver && draggedWidget && (
                <div className="absolute inset-0 z-30 rounded-xl border-2 border-dashed border-primary bg-surface-container/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 p-4 pointer-events-none text-primary animate-in fade-in duration-150">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <WidgetIcon id={draggedWidget.id} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-on-surface">{draggedWidget.title}</p>
                    <p className="text-xs text-primary font-medium mt-0.5">여기로 이동 예정</p>
                  </div>
                </div>
              )}

              {/* 2-1. 위젯 카드 헤더 (테마 색상 준수) */}
              <div className="px-3.5 py-2.5 border-b border-outline-variant flex items-center justify-between text-sm cursor-grab active:cursor-grabbing bg-surface-container-low/40">
                <div className="flex items-center gap-2 min-w-0">
                  <WidgetIcon id={widget.id} />
                  <span className="ui-card-title truncate">{widget.title}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    href={getWidgetLink(widget.id)}
                    className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5"
                  >
                    전체 →
                  </Link>
                  <button
                    onClick={() => handleHideWidget(widget.id)}
                    className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                    title="위젯 닫기"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* 2-2. 위젯 본문 영역 (테마 시맨틱 토큰 적용) */}
              <div className="p-3.5 sm:p-4 flex-1 overflow-y-auto text-sm text-on-surface scrollbar-thin">
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
                {widget.id === "dday" && <DdayWidget />}
                {widget.id === "bookmarks" && <BookmarksWidget />}
                {widget.id === "weather" && <WeatherWidget />}
                {widget.id === "favorite_notes" && <FavoriteNotesWidget />}
                {widget.id === "recent_files" && <RecentFilesWidget />}
                {widget.id === "favorite_contacts" && <FavoriteContactsWidget />}
                {widget.id === "projects" && <ProjectsWidget />}
                {widget.id === "chat" && <ChatWidget />}
                {widget.id === "quick_exam" && <QuickExamWidget />}
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= 3. 하단 안내 문구 (사진 1 동일) ================= */}
      <div className="text-xs sm:text-sm text-on-surface-variant font-light pt-2">
        ※ 위젯을 드래그해 순서를 바꾸고, &quot;위젯&quot; 버튼이나 x 로 추가·제거하세요.
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
    case "favorite_contacts":
      return <Users size={17} className={iconClass} />;
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
    case "favorite_contacts":
      return "/contacts";
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

// 1. 오늘 일정 위젯 (DB 연동, 더미 데이터 제거)
function TodayScheduleWidget({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center ui-empty-state py-8">
        오늘 일정이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-y-auto max-h-[175px] pr-1 scrollbar-thin">
      {events.map((item, idx) => {
        const isAllDay = item.allDay;
        const timeStr = isAllDay ? "종일" : item.startDate.slice(11, 16);
        const tagStr = isAllDay
          ? `${item.startDate.slice(5, 10)}~${item.endDate.slice(5, 10)}`
          : `~${item.endDate.slice(11, 16)}`;

        return (
          <div
            key={item._id || idx}
            className="flex items-center justify-between py-1.5 border-b border-outline-variant/40 last:border-b-0 text-xs sm:text-sm"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="font-mono text-on-surface-variant text-[11px] w-9 shrink-0">{timeStr}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span className="truncate text-on-surface font-medium">{item.title}</span>
            </div>
            {tagStr && (
              <span className="text-[11px] font-mono text-on-surface-variant shrink-0 ml-1.5">
                {tagStr}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 2. 미니 캘린더 위젯 (실제 캘린더 일정 연동)
function MiniCalendarWidget({ events = [] }: { events?: CalendarEvent[] }) {
  const [current, setCurrent] = useState(() => new Date(2026, 10, 4));
  const year = current.getFullYear();
  const month = current.getMonth();

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  // 11월 기준 일자 생성
  const firstDay = new Date(year, month, 1).getDay(); // 0(일)
  const lastDate = new Date(year, month + 1, 0).getDate();

  const daysArr = [];
  for (let i = 0; i < firstDay; i++) daysArr.push(null);
  for (let i = 1; i <= lastDate; i++) daysArr.push(i);

  // 현재 월의 각 날짜에 일정이 있는지 체크
  const eventDays = useMemo(() => {
    const set = new Set<number>();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    events.forEach((evt) => {
      const s = evt.startDate.slice(0, 10);
      const e = evt.endDate.slice(0, 10);
      if (s.startsWith(monthPrefix) || e.startsWith(monthPrefix)) {
        const startDay = s.startsWith(monthPrefix) ? parseInt(s.slice(8, 10), 10) : 1;
        const endDay = e.startsWith(monthPrefix) ? parseInt(e.slice(8, 10), 10) : lastDate;
        for (let d = startDay; d <= endDay; d++) {
          set.add(d);
        }
      }
    });
    return set;
  }, [events, year, month, lastDate]);

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-center justify-between text-xs sm:text-sm font-mono font-bold text-on-surface pb-1">
        <button onClick={prevMonth} className="p-1 hover:text-primary cursor-pointer text-on-surface-variant">
          <ChevronLeft size={14} />
        </button>
        <span>
          {year}년 {month + 1}월
        </span>
        <button onClick={nextMonth} className="p-1 hover:text-primary cursor-pointer text-on-surface-variant">
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] text-on-surface-variant font-mono py-1">
        <span>일</span>
        <span>월</span>
        <span>화</span>
        <span>수</span>
        <span>목</span>
        <span>금</span>
        <span>토</span>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-mono flex-1 items-center">
        {daysArr.map((dayNum, i) => {
          if (!dayNum) return <span key={i} />;
          const isToday = dayNum === 4 && month === 10 && year === 2026;
          const hasEvent = eventDays.has(dayNum);
          return (
            <div key={i} className="flex flex-col items-center justify-center">
              <span
                className={`w-5.5 h-5.5 flex items-center justify-center rounded-full text-xs ${
                  isToday ? "bg-primary text-on-primary font-bold shadow-xs" : "text-on-surface"
                }`}
              >
                {dayNum}
              </span>
              {/* 실제 일정이 있는 날에만 도트 표시 */}
              {hasEvent && (
                <span className="w-1 h-1 rounded-full bg-primary -mt-0.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 3. 다가오는 일정 위젯 (사진 1)
function UpcomingScheduleWidget({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center ui-empty-state">
        다가오는 일정이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.slice(0, 5).map((evt, idx) => (
        <div key={idx} className="flex items-center justify-between text-xs sm:text-sm py-1 border-b border-outline-variant/30 last:border-b-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span className="truncate text-on-surface font-medium">{evt.title}</span>
          </div>
          <span className="text-[11px] font-mono text-on-surface-variant shrink-0">
            {evt.startDate.slice(5, 10)}
          </span>
        </div>
      ))}
    </div>
  );
}

// 4. 오늘 할일 위젯 (사진 1)
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
      <ScrollArea orientation="vertical" className="space-y-1.5 flex-1 pr-1">
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
      </ScrollArea>

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

// 5. D-day 위젯 (사진 1)
function DdayWidget() {
  return (
    <div className="h-full flex items-center justify-center ui-empty-state">
      지정한 D-day 가 없어요.
    </div>
  );
}

// 6. 북마크 위젯 (사진 1)
function BookmarksWidget() {
  return (
    <div className="h-full flex items-center justify-center ui-empty-state">
      별표한 북마크가 없어요.
    </div>
  );
}

// 7. 날씨 위젯 (사진 1 100% 동일 구현)
function WeatherWidget() {
  return (
    <div className="flex flex-col justify-between h-full space-y-2 text-on-surface">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CloudSun size={36} className="text-primary shrink-0" />
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono leading-none text-on-surface">
              14°C
            </div>
            <div className="text-xs text-on-surface-variant mt-1">
              서울특별시 송파구 · 비
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-on-surface font-mono bg-surface-container-low border border-outline-variant p-2 rounded-lg">
        <div className="flex items-center gap-1.5">
          <Droplets size={12} className="text-primary" /> 습도 74%
        </div>
        <div className="flex items-center gap-1.5">
          <Wind size={12} className="text-primary" /> 바람 2.4m/s
        </div>
        <div className="flex items-center gap-1.5">
          <Umbrella size={12} className="text-primary" /> 강수확률 60%
        </div>
        <div className="text-on-surface-variant">내일 최고/최저 9°/3°</div>
      </div>

      <div className="flex justify-between text-center font-mono text-[11px] text-on-surface-variant border-t border-outline-variant pt-1.5">
        <div>22시<br />13°</div>
        <div>23시<br />12°</div>
        <div>00시<br />12°</div>
        <div>01시<br />11°</div>
        <div>02시<br />9°</div>
        <div>03시<br />8°</div>
      </div>
    </div>
  );
}

// 8. 즐겨찾기 노트 위젯 (사진 1)
function FavoriteNotesWidget() {
  return (
    <div className="h-full flex items-center justify-center ui-empty-state">
      별표한 노트가 없어요.
    </div>
  );
}

// 9. 최근 파일 위젯 (사진 1)
function RecentFilesWidget() {
  return (
    <div className="h-full flex items-center justify-center ui-empty-state gap-1.5">
      <span>아직 문서가 없어요.</span>
      <Link
        href="/drive"
        className="text-primary hover:underline font-semibold"
      >
        만들기
      </Link>
    </div>
  );
}

// 10. 즐겨찾는 연락처 위젯 (사진 1)
function FavoriteContactsWidget() {
  return (
    <div className="h-full flex items-center justify-center ui-empty-state">
      별표한 연락처가 없어요.
    </div>
  );
}

// 11. 프로젝트 위젯 (사진 1)
function ProjectsWidget() {
  return (
    <div className="h-full flex items-center justify-center ui-empty-state">
      담당으로 지정된 일이 없어요.
    </div>
  );
}

// 12. 채팅 위젯 (사진 1)
function ChatWidget() {
  return (
    <div className="h-full flex items-center justify-center px-4 leading-relaxed ui-empty-state">
      같은 프로젝트의 참가자가 여기 나타납니다. 프로젝트에 참가자를 초대해 보세요.
    </div>
  );
}

// 13. +N 퀵 기출문제 풀이 위젯
function QuickExamWidget() {
  return (
    <div className="h-full flex flex-col justify-between">
      <div>
        <div className="font-bold text-sm text-on-surface">정보처리기사 실전 모의고사</div>
        <p className="text-xs text-on-surface-variant mt-1 font-light">
          최근 자주 틀린 오답 노트와 핵심 기출을 바로 풀어보세요.
        </p>
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
