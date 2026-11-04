"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  FolderPlus,
} from "lucide-react";
import {
  CalendarEvent,
  DEFAULT_CATEGORIES,
  getEventColorStyles,
  formatDateKey,
  parseDateOnly,
  getDaysDiff,
  getMondayBasedDayOfWeek,
} from "./calendarTypes";
import { CalendarDayModal } from "./CalendarDayModal";
import { EventFormModal } from "./EventFormModal";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { useMounted } from "@/lib/hooks/useMounted";
import { useTheme } from "next-themes";
import { THEME_LIST } from "@/lib/themes/themeList";

type ViewMode = "month" | "week" | "day" | "list";

interface DayCellData {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  dayNumber: number;
  dayOfWeek: number; // 0: 월, 6: 일
}

interface SpanningTrackSegment {
  evt: CalendarEvent;
  startCol: number; // 1 to 7
  endCol: number;   // 1 to 7
  colSpan: number;
  isContinuationFromPrev: boolean;
  isContinuationToNext: boolean;
  trackIndex: number;
}

export function CalendarView() {
  const mounted = useMounted();
  const { theme } = useTheme();
  const isDark = useMemo(() => {
    const current = THEME_LIST.find((t) => t.id === theme);
    return current ? current.type === "dark" : false;
  }, [theme]);
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 10, 4));

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentDate(new Date());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("month");

  // 저장 상태 인디케이터 관리
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>("");

  // 모달 및 팝오버 상태 (사진 3)
  const [selectedDayForModal, setSelectedDayForModal] = useState<Date | null>(null);
  const [selectedDayAnchorRect, setSelectedDayAnchorRect] = useState<DOMRect | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<Date | undefined>(undefined);

  // 카테고리 필터
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  // ================= 1. DND 날짜 이동 상태 =================
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // ================= 2. 마우스 리사이즈(기간 조절) 상태 =================
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
  const [resizePreviewEndDate, setResizePreviewEndDate] = useState<string | null>(null);
  const isResizingRef = useRef(false);

  // 일정 목록 서버 로드
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/calendar");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEvents(data);
        }
      }
    } catch (e) {
      console.error("Failed to fetch calendar events:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/calendar");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setEvents(data);
          }
        }
      } catch (e) {
        console.error("Failed to load calendar events:", e);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // 일정 저장 (생성/수정)
  const handleSaveEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    setSaveStatus("saving");
    try {
      if (eventData._id) {
        // 수정 (PUT)
        const res = await fetch("/api/calendar", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        if (res.ok) {
          const updated = await res.json();
          setEvents((prev) =>
            prev.map((e) => (e._id === eventData._id ? { ...e, ...eventData, ...updated.data } : e))
          );
          const now = new Date();
          setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } else {
        // 생성 (POST)
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        if (res.ok) {
          const created = await res.json();
          if (created.data) {
            setEvents((prev) => [...prev, created.data]);
          }
          const now = new Date();
          setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      }
    } catch (e) {
      console.error("Save event error:", e);
      setSaveStatus("error");
      fetchEvents();
    }
  }, [fetchEvents]);

  // 일정 삭제
  const handleDeleteEvent = async (id: string) => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/calendar?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e._id !== id));
        const now = new Date();
        setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    } catch (e) {
      console.error("Delete event error:", e);
      setSaveStatus("error");
      fetchEvents();
    }
  };

  // ================= 3. 마우스 리사이즈 전역 이벤트 =================
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !resizingEvent) return;

      const elem = document.elementFromPoint(e.clientX, e.clientY);
      const cellElem = elem?.closest("[data-date-key]");
      if (cellElem) {
        const dateKey = cellElem.getAttribute("data-date-key");
        if (dateKey && dateKey >= resizingEvent.startDate.slice(0, 10)) {
          setResizePreviewEndDate(dateKey);
        }
      }
    };

    const handleGlobalMouseUp = async () => {
      if (!isResizingRef.current || !resizingEvent) return;
      isResizingRef.current = false;

      if (resizePreviewEndDate && resizePreviewEndDate !== resizingEvent.endDate.slice(0, 10)) {
        const newEndDate = resizingEvent.allDay
          ? `${resizePreviewEndDate}T23:59:59`
          : `${resizePreviewEndDate}${resizingEvent.endDate.slice(10)}`;

        // 낙관적 업데이트
        setEvents((prev) =>
          prev.map((evt) =>
            evt._id === resizingEvent._id ? { ...evt, endDate: newEndDate } : evt
          )
        );

        // 서버 전송
        await handleSaveEvent({
          _id: resizingEvent._id,
          endDate: newEndDate,
        });
      }

      setResizingEvent(null);
      setResizePreviewEndDate(null);
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [resizingEvent, resizePreviewEndDate, handleSaveEvent]);

  const handleResizeStart = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    setResizingEvent(event);
    setResizePreviewEndDate(event.endDate.slice(0, 10));
  };

  // ================= 4. DND 이동 핸들러 =================
  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.setData("text/plain", event._id || "");
    setDraggingEvent(event);
  };

  const handleCellDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    if (dragOverDate !== dateKey) {
      setDragOverDate(dateKey);
    }
  };

  const handleCellDrop = async (e: React.DragEvent, targetDateKey: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const eventToMove = draggingEvent;
    setDraggingEvent(null);

    if (!eventToMove || !eventToMove._id) return;

    const originalStartKey = eventToMove.startDate.slice(0, 10);
    if (originalStartKey === targetDateKey) return;

    const dayDiff = getDaysDiff(originalStartKey, targetDateKey);

    const oldStart = parseDateOnly(eventToMove.startDate);
    const oldEnd = parseDateOnly(eventToMove.endDate);

    oldStart.setDate(oldStart.getDate() + dayDiff);
    oldEnd.setDate(oldEnd.getDate() + dayDiff);

    const newStartKey = formatDateKey(oldStart);
    const newEndKey = formatDateKey(oldEnd);

    const updatedStartDate = eventToMove.allDay
      ? `${newStartKey}T00:00:00`
      : `${newStartKey}${eventToMove.startDate.slice(10)}`;

    const updatedEndDate = eventToMove.allDay
      ? `${newEndKey}T23:59:59`
      : `${newEndKey}${eventToMove.endDate.slice(10)}`;

    setEvents((prev) =>
      prev.map((evt) =>
        evt._id === eventToMove._id
          ? { ...evt, startDate: updatedStartDate, endDate: updatedEndDate }
          : evt
      )
    );

    await handleSaveEvent({
      _id: eventToMove._id,
      startDate: updatedStartDate,
      endDate: updatedEndDate,
    });
  };

  // ================= 5. 월 네비게이션 =================
  const goPrevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayKey = mounted ? formatDateKey(new Date()) : "2026-11-04";

  // ================= 6. 사진 2 기준: 월요일 시작 7일 단위 주(Week) 배열 생성 =================
  const weeks = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = getMondayBasedDayOfWeek(firstDay); // 0(월) ~ 6(일)
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const allDays: DayCellData[] = [];

    // 1. 이전 달 일자 채우기
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDate - i);
      allDays.push({
        date: d,
        dateKey: formatDateKey(d),
        isCurrentMonth: false,
        dayNumber: prevMonthLastDate - i,
        dayOfWeek: getMondayBasedDayOfWeek(d),
      });
    }

    // 2. 이번 달 일자
    for (let i = 1; i <= lastDate; i++) {
      const d = new Date(year, month, i);
      allDays.push({
        date: d,
        dateKey: formatDateKey(d),
        isCurrentMonth: true,
        dayNumber: i,
        dayOfWeek: getMondayBasedDayOfWeek(d),
      });
    }

    // 3. 다음 달 일자 채우기 (7의 배수, 35칸 또는 42칸)
    const remaining = (7 - (allDays.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      allDays.push({
        date: d,
        dateKey: formatDateKey(d),
        isCurrentMonth: false,
        dayNumber: i,
        dayOfWeek: getMondayBasedDayOfWeek(d),
      });
    }

    // 7일 단위 청킹
    const chunked: DayCellData[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      chunked.push(allDays.slice(i, i + 7));
    }
    return chunked;
  }, [year, month]);

  // 필터링된 일정
  const filteredEvents = useMemo(() => {
    if (selectedCategoryFilter === "all") return events;
    return events.filter((e) => (e.category || "work") === selectedCategoryFilter);
  }, [events, selectedCategoryFilter]);

  // 날짜별 일정 맵핑 (팝오버 및 단일 일정용)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((evt) => {
      const startKey = evt.startDate.slice(0, 10);
      const endKey = evt.endDate.slice(0, 10);

      const cur = parseDateOnly(startKey);
      const end = parseDateOnly(endKey);

      while (cur.getTime() <= end.getTime()) {
        const key = formatDateKey(cur);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(evt);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return map;
  }, [filteredEvents]);

  // 단일일(Single-day) 일정만 날짜별로 맵핑
  const singleDayEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((evt) => {
      const startKey = evt.startDate.slice(0, 10);
      const endKey = evt.endDate.slice(0, 10);
      if (startKey === endKey) {
        if (!map.has(startKey)) map.set(startKey, []);
        map.get(startKey)!.push(evt);
      }
    });
    return map;
  }, [filteredEvents]);

  // ================= 7. 주(Week) 단위 다중일 연속 바 트랙 배치 알고리즘 (사진 2 핵심) =================
  const getWeekSpanningTracks = useCallback(
    (days: DayCellData[]) => {
      const weekStartKey = days[0].dateKey;
      const weekEndKey = days[6].dateKey;

      // 이번 주와 겹치는 다중일 일정 선별
      const multiDayEvents = filteredEvents.filter((evt) => {
        const sKey = evt.startDate.slice(0, 10);
        const eKey = evt.endDate.slice(0, 10);
        if (sKey === eKey) return false; // 단일일 제외
        return sKey <= weekEndKey && eKey >= weekStartKey;
      });

      // 긴 일정 우선, 시작일 빠른 순 정렬
      const sorted = [...multiDayEvents].sort((a, b) => {
        const spanA = getDaysDiff(a.startDate.slice(0, 10), a.endDate.slice(0, 10));
        const spanB = getDaysDiff(b.startDate.slice(0, 10), b.endDate.slice(0, 10));
        if (spanB !== spanA) return spanB - spanA;
        return a.startDate.localeCompare(b.startDate);
      });

      // 탐욕적 트랙 할당 (충돌 없는 최소 행 배치)
      const tracks: number[][] = [];
      const segments: SpanningTrackSegment[] = [];

      for (const evt of sorted) {
        const sKey = evt.startDate.slice(0, 10);
        const eKey = evt.endDate.slice(0, 10);

        const isContinuationFromPrev = sKey < weekStartKey;
        const isContinuationToNext = eKey > weekEndKey;

        const startIdx = isContinuationFromPrev
          ? 0
          : days.findIndex((d) => d.dateKey === sKey);
        const endIdx = isContinuationToNext
          ? 6
          : days.findIndex((d) => d.dateKey === eKey);

        const startCol = Math.max(1, (startIdx === -1 ? 0 : startIdx) + 1);
        const endCol = Math.max(startCol, (endIdx === -1 ? 6 : endIdx) + 1);
        const colSpan = endCol - startCol + 1;

        // 비어있는 트랙 탐색
        let assignedTrack = -1;
        for (let t = 0; t < tracks.length; t++) {
          const hasCollision = tracks[t].some((c) => c >= startCol && c <= endCol);
          if (!hasCollision) {
            assignedTrack = t;
            break;
          }
        }

        if (assignedTrack === -1) {
          assignedTrack = tracks.length;
          tracks.push([]);
        }

        for (let c = startCol; c <= endCol; c++) {
          tracks[assignedTrack].push(c);
        }

        segments.push({
          evt,
          startCol,
          endCol,
          colSpan,
          isContinuationFromPrev,
          isContinuationToNext,
          trackIndex: assignedTrack,
        });
      }

      return {
        trackCount: Math.max(1, tracks.length),
        segments,
      };
    },
    [filteredEvents]
  );

  // 셀 클릭 시 사진3 팝오버 오픈
  const handleSelectDayCell = (day: DayCellData, elem: HTMLElement) => {
    setSelectedDateKey(day.dateKey);
    setSelectedDayForModal(day.date);
    setSelectedDayAnchorRect(elem.getBoundingClientRect());
  };

  const handleCloseDayModal = () => {
    setSelectedDayForModal(null);
    setSelectedDayAnchorRect(null);
  };

  const handleOpenCreateModal = (date?: Date) => {
    setEditingEvent(null);
    setFormInitialDate(date || new Date());
    setIsEventFormOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormInitialDate(undefined);
    setIsEventFormOpen(true);
  };

  return (
    <div className="w-full space-y-4 text-on-surface">
      {/* ================= 1. 최상단 헤더 (플랫 헤더 표준) ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">캘린더</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* 저장 상태 인디케이터 */}
          <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />

          {/* 새로고침 아이콘 */}
          <button
            onClick={fetchEvents}
            disabled={isLoading}
            className="p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer border border-outline-variant"
            title="일정 새로고침"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-primary" : ""} />
          </button>

          {/* + 일정 추가 버튼 */}
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:opacity-90 text-on-primary font-semibold rounded-md text-xs transition-all shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>일정 추가</span>
          </button>
        </div>
      </div>

      {/* ================= 2. 서브 컨트롤 툴바 (사진1) ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* 좌측: 카테고리 필터 + 이전/다음 월 + 오늘 버튼 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
              className="px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FolderPlus size={13} className="text-primary" />
              <span>
                {selectedCategoryFilter === "all"
                  ? "카테고리"
                  : DEFAULT_CATEGORIES.find((c) => c.id === selectedCategoryFilter)?.label || "카테고리"}
              </span>
            </button>

            {isCategoryFilterOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-36 bg-surface-container-lowest border border-outline-variant rounded-md shadow-lg p-1 z-30 space-y-0.5">
                <button
                  onClick={() => {
                    setSelectedCategoryFilter("all");
                    setIsCategoryFilterOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    selectedCategoryFilter === "all"
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-surface-container"
                  }`}
                >
                  전체 일정 보기
                </button>
                {DEFAULT_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCategoryFilter(c.id);
                      setIsCategoryFilterOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                      selectedCategoryFilter === c.id
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-surface-container"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center bg-surface-container-low rounded-md border border-outline-variant p-0.5">
            <button
              onClick={goPrevMonth}
              className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer text-on-surface"
              title="이전 달"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={goNextMonth}
              className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer text-on-surface"
              title="다음 달"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            onClick={goToday}
            className="px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-md font-medium transition-colors cursor-pointer"
          >
            오늘
          </button>
        </div>

        {/* 중앙: 2026년 10월 / 11월 (사진1 & 사진2) */}
        <div className="text-center">
          <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight font-mono">
            {year}년 {month + 1}월
          </h2>
        </div>

        {/* 우측: 월 / 주 / 일 / 목록 뷰 스위처 */}
        <div className="flex items-center bg-surface-container-low p-0.5 rounded-md border border-outline-variant self-start md:self-auto">
          {(["month", "week", "day", "list"] as ViewMode[]).map((mode) => {
            const labels: Record<ViewMode, string> = {
              month: "월",
              week: "주",
              day: "일",
              list: "목록",
            };
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                  viewMode === mode
                    ? "bg-surface-container text-on-surface font-semibold"
                    : "text-on-surface-variant hover:text-on-surface font-light"
                }`}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= 3. 메인 월간 그리드 뷰 (사진2 가로 연속 바 완벽 구현) ================= */}
      {viewMode === "month" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
          {/* 요일 헤더: 사진2 기준 월, 화, 수, 목, 금, 토, 일 */}
          <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-low text-center text-xs font-medium py-2.5 text-on-surface-variant">
            <span>월</span>
            <span>화</span>
            <span>수</span>
            <span>목</span>
            <span>금</span>
            <span className="text-blue-500">토</span>
            <span className="text-rose-500">일</span>
          </div>

          {/* 주(Week) 단위 세로 스택 컨테이너 */}
          <div className="divide-y divide-outline-variant">
            {weeks.map((weekDays, weekIdx) => {
              const { trackCount, segments } = getWeekSpanningTracks(weekDays);

              return (
                <div
                  key={weekIdx}
                  className="relative min-h-[110px] sm:min-h-[130px] flex flex-col justify-between"
                >
                  {/* 3-1. 배경 일자 격자 셀 (7열) - DND 드롭 및 클릭 감지 */}
                  <div className="absolute inset-0 grid grid-cols-7 divide-x divide-outline-variant pointer-events-none">
                    {weekDays.map((day) => {
                      const isToday = day.dateKey === todayKey;
                      const isOver = dragOverDate === day.dateKey;
                      const isSelected = selectedDateKey === day.dateKey;

                      // 리사이즈 프리뷰 여부
                      const isResizeTarget =
                        resizingEvent &&
                        resizePreviewEndDate &&
                        day.dateKey >= resizingEvent.startDate.slice(0, 10) &&
                        day.dateKey <= resizePreviewEndDate;

                      return (
                        <div
                          key={day.dateKey}
                          data-date-key={day.dateKey}
                          onDragOver={(e) => handleCellDragOver(e, day.dateKey)}
                          onDrop={(e) => handleCellDrop(e, day.dateKey)}
                          onClick={(e) => handleSelectDayCell(day, e.currentTarget)}
                          className={`h-full p-1.5 sm:p-2 pointer-events-auto transition-colors cursor-pointer group flex flex-col justify-between ${
                            !day.isCurrentMonth
                              ? "opacity-35 bg-surface-container-low/20"
                              : "hover:bg-surface-container-low/40"
                          } ${isSelected ? "ring-1 ring-white/70 dark:ring-white/80 rounded-sm" : ""} ${
                            isOver ? "bg-primary/10 ring-2 ring-primary ring-inset" : ""
                          } ${isResizeTarget ? "bg-amber-500/10 ring-1 ring-amber-500/50" : ""}`}
                        >
                          {/* 날짜 번호 및 추가 버튼 (사진2: 좌측 상단 일자) */}
                          <div className="flex items-center justify-between text-xs leading-none">
                            <span
                              className={`font-mono text-xs font-medium ${
                                isToday
                                  ? "w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold"
                                  : day.dayOfWeek === 6
                                  ? "text-rose-500"
                                  : day.dayOfWeek === 5
                                  ? "text-blue-500"
                                  : "text-on-surface"
                              }`}
                            >
                              {day.dayNumber}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCreateModal(day.date);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-opacity"
                              title="일정 추가"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3-2. 전면 일정 오버레이 레이어 (사진 2의 가로 연속 바 + 불릿 리스트) */}
                  <div className="relative pt-6 sm:pt-7 pb-1.5 px-0.5 flex flex-col gap-1 pointer-events-none">
                    {/* A. 다중일(기간) 연속 가로 바 레이어 (트랙별 7열 CSS Grid) */}
                    {Array.from({ length: trackCount }).map((_, trackIdx) => {
                      const trackSegments = segments.filter((s) => s.trackIndex === trackIdx);
                      if (trackSegments.length === 0) return null;

                      return (
                        <div
                          key={trackIdx}
                          className="grid grid-cols-7 gap-0 w-full h-4 sm:h-4.5 relative pointer-events-none"
                        >
                          {trackSegments.map((seg) => {
                            const styles = getEventColorStyles(seg.evt.color, isDark);

                            return (
                              <div
                                key={seg.evt._id || seg.evt.title}
                                style={{
                                  gridColumnStart: seg.startCol,
                                  gridColumnEnd: seg.endCol + 1,
                                }}
                                className="px-0.5 h-full relative pointer-events-auto"
                              >
                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, seg.evt)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(seg.evt);
                                  }}
                                  style={{
                                    backgroundColor: styles.bgRgba,
                                    borderColor: styles.borderRgba,
                                    color: styles.textColor,
                                    backdropFilter: "blur(2px)",
                                  }}
                                  className={`group/bar relative w-full h-full flex items-center justify-between text-[10px] sm:text-[11px] font-medium select-none cursor-grab active:cursor-grabbing hover:brightness-125 transition-all border ${
                                    seg.isContinuationFromPrev
                                      ? "rounded-l-none border-l-0 pl-1"
                                      : "rounded-l-xs pl-1.5"
                                  } ${
                                    seg.isContinuationToNext
                                      ? "rounded-r-none border-r-0 pr-1"
                                      : "rounded-r-xs pr-1.5"
                                  } ${
                                    draggingEvent?._id === seg.evt._id ? "opacity-30 border-dashed" : "opacity-100"
                                  }`}
                                  title={`${seg.evt.title} (${seg.evt.startDate.slice(5, 10)} ~ ${seg.evt.endDate.slice(5, 10)}) - 드래그하여 이동 또는 끝을 늘릴 수 있습니다`}
                                >
                                  {/* 좌측 타이틀 (이전 주에서 넘어왔으면 ◀ 화살표) */}
                                  <div className="flex items-center gap-1 min-w-0 truncate">
                                    {seg.isContinuationFromPrev && (
                                      <span className="text-[9px] font-bold opacity-80 shrink-0">◀</span>
                                    )}
                                    <span className="truncate leading-none">{seg.evt.title}</span>
                                  </div>

                                  {/* 우측 인디케이터 (다음 주로 넘어가면 ▶ 화살표) */}
                                  {seg.isContinuationToNext && (
                                    <span className="text-[9px] font-bold opacity-80 shrink-0 ml-1">▶</span>
                                  )}

                                  {/* 우측 가장자리 리사이즈 핸들 (이번 주에 끝나는 일정에만 활성화) */}
                                  {!seg.isContinuationToNext && (
                                    <div
                                      onMouseDown={(e) => handleResizeStart(e, seg.evt)}
                                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-white/40 rounded-r-xs opacity-0 group-hover/bar:opacity-100 transition-opacity"
                                      title="마우스로 드래그하여 일정 종료일 늘리기/줄이기"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {/* B. 단일일(Single-day) 일정 불릿 리스트 (사진 2: • ㅁㄴㅇ, • ㅇ, • ㄹ) */}
                    <div className="grid grid-cols-7 gap-0 w-full pointer-events-none mt-0.5">
                      {weekDays.map((day) => {
                        const singles = singleDayEventsByDate.get(day.dateKey) || [];
                        const maxVisible = 2;
                        const visibleSingles = singles.slice(0, maxVisible);
                        const extraCount = singles.length - maxVisible;

                        return (
                          <div
                            key={day.dateKey}
                            className="px-1.5 space-y-0.5 pointer-events-auto min-h-[20px]"
                          >
                            {visibleSingles.map((evt) => {
                              const styles = getEventColorStyles(evt.color, isDark);
                              const timeStr =
                                !evt.allDay && evt.startDate.includes("T")
                                  ? evt.startDate.slice(11, 16)
                                  : null;

                              return (
                                <div
                                  key={evt._id || evt.title}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, evt)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(evt);
                                  }}
                                  className="flex items-center gap-1 text-[11px] text-on-surface hover:text-primary cursor-pointer truncate py-0.5 group/item transition-colors"
                                  title={`${timeStr ? `${timeStr} ` : ""}${evt.title}`}
                                >
                                  {/* 사진 2 스타일의 깔끔한 불릿 도트 */}
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{ backgroundColor: styles.dotColor }}
                                  />
                                  {timeStr && (
                                    <span className="font-mono text-[10px] text-on-surface-variant shrink-0 font-light">
                                      {timeStr}
                                    </span>
                                  )}
                                  <span className="truncate leading-none">{evt.title}</span>
                                </div>
                              );
                            })}

                            {/* 초과분 카운트 (+N개 클릭 시 사진 3 팝오버 오픈) */}
                            {extraCount > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectDayCell(day, e.currentTarget);
                                }}
                                className="text-[10px] font-mono text-on-surface-variant hover:text-primary pl-2 transition-colors cursor-pointer"
                              >
                                +{extraCount}개
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 4. 주간 뷰 (Week View) ================= */}
      {viewMode === "week" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
          <div className="text-xs text-on-surface-variant font-light">
            이번 주 핵심 일정 브리핑 ({weeks[0] ? `${weeks[0][0].dateKey} ~ ${weeks[0][6].dateKey}` : ""})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
            {weeks[0]?.map((day) => {
              const dayEvents = eventsByDate.get(day.dateKey) || [];
              const isToday = day.dateKey === todayKey;
              const days = ["월", "화", "수", "목", "금", "토", "일"];

              return (
                <div
                  key={day.dateKey}
                  onClick={(e) => handleSelectDayCell(day, e.currentTarget)}
                  className="bg-surface-container-low border border-outline-variant rounded-md p-2.5 min-h-[160px] flex flex-col justify-between cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-outline-variant text-xs">
                    <span className="font-semibold">{days[day.dayOfWeek]}</span>
                    <span className={`font-mono ${isToday ? "text-primary font-bold" : ""}`}>
                      {day.dayNumber}일
                    </span>
                  </div>

                  <div className="space-y-1 my-2 flex-1 overflow-y-auto">
                    {dayEvents.map((evt) => {
                      const styles = getEventColorStyles(evt.color, isDark);
                      return (
                        <div
                          key={evt._id || evt.title}
                          className="p-1 rounded text-[11px] truncate border font-medium"
                          style={{
                            backgroundColor: styles.bgRgba,
                            borderColor: styles.borderRgba,
                            color: styles.textColor,
                          }}
                        >
                          {evt.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 5. 일간 뷰 (Day View) ================= */}
      {viewMode === "day" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-outline-variant pb-2">
            <h3 className="font-bold text-sm text-on-surface font-mono">
              {todayKey} 오늘의 일정
            </h3>
            <button
              onClick={() => handleOpenCreateModal(new Date())}
              className="text-xs text-primary hover:underline font-medium"
            >
              + 이 날에 추가
            </button>
          </div>

          <div className="space-y-2">
            {(eventsByDate.get(todayKey) || []).map((evt) => {
              const styles = getEventColorStyles(evt.color, isDark);
              return (
                <div
                  key={evt._id || evt.title}
                  onClick={() => handleOpenEditModal(evt)}
                  style={{
                    backgroundColor: styles.bgRgba,
                    borderColor: styles.borderRgba,
                    color: styles.textColor,
                  }}
                  className="p-3 rounded-md border flex items-center justify-between cursor-pointer hover:brightness-110"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: styles.dotColor }}
                    />
                    <span className="font-semibold text-xs">{evt.title}</span>
                  </div>
                  <span className="text-[11px] font-mono opacity-80">
                    {evt.startDate.slice(5, 10)} ~ {evt.endDate.slice(5, 10)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 6. 목록 뷰 (List View) ================= */}
      {viewMode === "list" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-2">
          <div className="text-xs text-on-surface-variant font-light pb-2 border-b border-outline-variant">
            전체 일정 목록 ({filteredEvents.length}개)
          </div>
          <div className="space-y-1.5">
            {filteredEvents.map((evt) => {
              const styles = getEventColorStyles(evt.color, isDark);
              return (
                <div
                  key={evt._id || evt.title}
                  onClick={() => handleOpenEditModal(evt)}
                  className="flex items-center justify-between p-2.5 rounded-md hover:bg-surface-container-low border border-outline-variant text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: styles.dotColor }}
                    />
                    <span className="font-medium text-on-surface truncate">{evt.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-on-surface-variant shrink-0">
                    {evt.startDate.slice(5, 10)} ~ {evt.endDate.slice(5, 10)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= 7. 사진 3 날짜 상세 팝오버 모달 ================= */}
      {selectedDayForModal && (
        <CalendarDayModal
          date={selectedDayForModal}
          events={eventsByDate.get(formatDateKey(selectedDayForModal)) || []}
          anchorRect={selectedDayAnchorRect}
          onClose={handleCloseDayModal}
          onSelectEvent={(evt) => {
            handleCloseDayModal();
            handleOpenEditModal(evt);
          }}
          onAddNewEvent={(date) => {
            handleCloseDayModal();
            handleOpenCreateModal(date);
          }}
        />
      )}

      {/* ================= 8. 일정 추가 / 수정 모달 ================= */}
      {isEventFormOpen && (
        <EventFormModal
          initialDate={formInitialDate}
          event={editingEvent}
          onClose={() => setIsEventFormOpen(false)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  );
}
