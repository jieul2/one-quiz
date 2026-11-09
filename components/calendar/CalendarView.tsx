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
  getLocalDateKey,
  parseDateOnly,
  getDaysDiff,
  getMondayBasedDayOfWeek,
  getEventTimeDisplay,
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

  // ================= 1. DND 날짜 이동 상태 및 스켈레톤 프리뷰 =================
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [dragGrabDateKey, setDragGrabDateKey] = useState<string | null>(null);

  // 🌟 DND 드래그 중 실시간 목표 일자 및 스켈레톤 프리뷰 범위 계산
  const dragPreviewRef = useRef<{
    startKey: string;
    endKey: string;
    dayDiff: number;
    title: string;
    color?: string;
  } | null>(null);

  const dragPreview = useMemo(() => {
    if (!draggingEvent || !dragOverDate) return null;
    const origStartKey = getLocalDateKey(draggingEvent.startDate);
    const origEndKey = getLocalDateKey(draggingEvent.endDate);
    const durationDays = Math.max(1, getDaysDiff(origStartKey, origEndKey) + 1);

    const grabKey = dragGrabDateKey || origStartKey;
    const dayDiff = getDaysDiff(grabKey, dragOverDate);

    const targetStartDate = parseDateOnly(origStartKey);
    targetStartDate.setDate(targetStartDate.getDate() + dayDiff);
    const startKey = formatDateKey(targetStartDate);

    const targetEndDate = parseDateOnly(startKey);
    targetEndDate.setDate(targetEndDate.getDate() + durationDays - 1);
    const endKey = formatDateKey(targetEndDate);

    return {
      startKey,
      endKey,
      dayDiff,
      title: draggingEvent.title,
      color: draggingEvent.color,
    };
  }, [draggingEvent, dragOverDate, dragGrabDateKey]);

  useEffect(() => {
    dragPreviewRef.current = dragPreview;
  }, [dragPreview]);

  // ================= 2. 마우스 리사이즈(기간 조절) 상태 =================
  const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
  const [resizingEdge, setResizingEdge] = useState<"start" | "end">("end");
  const [resizePreviewStartDate, setResizePreviewStartDate] = useState<string | null>(null);
  const [resizePreviewEndDate, setResizePreviewEndDate] = useState<string | null>(null);
  const isResizingRef = useRef(false);
  const resizingEdgeRef = useRef<"start" | "end">("end");
  const resizePreviewStartDateRef = useRef<string | null>(null);
  const resizePreviewEndDateRef = useRef<string | null>(null);

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

  // ================= 3. 마우스 리사이즈 전역 이벤트 (시작일/종료일 양방향 지원) =================
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !resizingEvent) return;

      // 마우스 위치 하위의 모든 DOM 요소를 탐색하여 data-date-key 셀을 100% 검출
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      let targetDateKey: string | null = null;
      for (const el of elements) {
        const cell = el.closest("[data-date-key]");
        if (cell) {
          targetDateKey = cell.getAttribute("data-date-key");
          if (targetDateKey) break;
        }
      }

      if (targetDateKey) {
        if (resizingEdgeRef.current === "start") {
          const currentEnd = resizePreviewEndDateRef.current || getLocalDateKey(resizingEvent.endDate);
          if (targetDateKey <= currentEnd && targetDateKey !== resizePreviewStartDateRef.current) {
            resizePreviewStartDateRef.current = targetDateKey;
            setResizePreviewStartDate(targetDateKey);
          }
        } else {
          const currentStart = resizePreviewStartDateRef.current || getLocalDateKey(resizingEvent.startDate);
          if (targetDateKey >= currentStart && targetDateKey !== resizePreviewEndDateRef.current) {
            resizePreviewEndDateRef.current = targetDateKey;
            setResizePreviewEndDate(targetDateKey);
          }
        }
      }
    };

    const handleGlobalMouseUp = async () => {
      if (!isResizingRef.current || !resizingEvent) return;
      isResizingRef.current = false;

      const origStartKey = getLocalDateKey(resizingEvent.startDate);
      const origEndKey = getLocalDateKey(resizingEvent.endDate);

      const newStartKey = resizePreviewStartDateRef.current || origStartKey;
      const newEndKey = resizePreviewEndDateRef.current || origEndKey;

      const hasChanged = newStartKey !== origStartKey || newEndKey !== origEndKey;

      if (hasChanged && newStartKey <= newEndKey) {
        const startStr = typeof resizingEvent.startDate === "string" ? resizingEvent.startDate : "";
        const endStr = typeof resizingEvent.endDate === "string" ? resizingEvent.endDate : "";
        const startTimePart =
          !resizingEvent.allDay && startStr.includes("T")
            ? startStr.slice(11, 19)
            : "00:00:00";
        const endTimePart =
          !resizingEvent.allDay && endStr.includes("T")
            ? endStr.slice(11, 19)
            : "23:59:59";

        const localStartDate = new Date(`${newStartKey}T${startTimePart.slice(0, 5) || "00:00"}:00`);
        const localEndDate = new Date(`${newEndKey}T${endTimePart.slice(0, 5) || "23:59"}:59`);

        const updatedStartDate = localStartDate.toISOString();
        const updatedEndDate = localEndDate.toISOString();

        // 낙관적 업데이트
        setEvents((prev) =>
          prev.map((evt) =>
            evt._id === resizingEvent._id
              ? { ...evt, startDate: updatedStartDate, endDate: updatedEndDate }
              : evt
          )
        );

        // 서버 전송
        await handleSaveEvent({
          _id: resizingEvent._id,
          startDate: updatedStartDate,
          endDate: updatedEndDate,
        });
      }

      setResizingEvent(null);
      setResizePreviewStartDate(null);
      setResizePreviewEndDate(null);
      resizePreviewStartDateRef.current = null;
      resizePreviewEndDateRef.current = null;
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [resizingEvent, handleSaveEvent]);

  const handleResizeStart = (
    e: React.MouseEvent,
    event: CalendarEvent,
    edge: "start" | "end" = "end"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    isResizingRef.current = true;
    resizingEdgeRef.current = edge;
    const sKey = getLocalDateKey(event.startDate);
    const eKey = getLocalDateKey(event.endDate);
    resizePreviewStartDateRef.current = sKey;
    resizePreviewEndDateRef.current = eKey;
    setResizingEdge(edge);
    setResizingEvent(event);
    setResizePreviewStartDate(sKey);
    setResizePreviewEndDate(eKey);
  };

  // ================= 4. DND 이동 핸들러 =================
  const handleDragStart = (
    e: React.DragEvent,
    event: CalendarEvent,
    grabDateKey?: string
  ) => {
    // 🌟 캘린더 일정을 잡고 이동할 때 이전에 선택된 텍스트 선택 영역 즉시 해제 (잔상 방지)
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    e.dataTransfer.setData("text/plain", event._id || "");
    e.dataTransfer.effectAllowed = "move";
    setDraggingEvent(event);
    setDragGrabDateKey(grabDateKey || getLocalDateKey(event.startDate));
  };

  const handleDragEnd = () => {
    setDraggingEvent(null);
    setDragOverDate(null);
    setDragGrabDateKey(null);
  };

  const handleCellDragOver = (e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverDate !== dateKey) {
      setDragOverDate(dateKey);
    }
  };

  const handleCellDrop = async (e: React.DragEvent, targetDateKey?: string) => {
    e.preventDefault();
    const eventToMove = draggingEvent;
    const currentPreview = dragPreviewRef.current || dragPreview;

    setDragOverDate(null);
    setDraggingEvent(null);
    setDragGrabDateKey(null);
    dragPreviewRef.current = null;

    if (!eventToMove || !eventToMove._id) return;

    const origStartKey = getLocalDateKey(eventToMove.startDate);
    const origEndKey = getLocalDateKey(eventToMove.endDate);
    const durationDays = Math.max(1, getDaysDiff(origStartKey, origEndKey) + 1);

    // 프리뷰가 있으면 스켈레톤 계산값 사용, 없으면 targetDateKey 기반 직접 계산
    let newStartKey: string;
    let newEndKey: string;

    if (currentPreview) {
      newStartKey = currentPreview.startKey;
      newEndKey = currentPreview.endKey;
    } else if (targetDateKey) {
      const grabKey = dragGrabDateKey || origStartKey;
      const dayDiff = getDaysDiff(grabKey, targetDateKey);
      const sDate = parseDateOnly(origStartKey);
      sDate.setDate(sDate.getDate() + dayDiff);
      newStartKey = formatDateKey(sDate);

      const eDate = parseDateOnly(newStartKey);
      eDate.setDate(eDate.getDate() + durationDays - 1);
      newEndKey = formatDateKey(eDate);
    } else {
      return;
    }

    // 변경사항이 없으면 중단
    if (newStartKey === origStartKey && newEndKey === origEndKey) return;

    // 시간 성분 보존 및 ISO Date 변환 (로컬 타임존 일치 보장)
    const startStr = typeof eventToMove.startDate === "string" ? eventToMove.startDate : "";
    const endStr = typeof eventToMove.endDate === "string" ? eventToMove.endDate : "";
    const startTimePart =
      !eventToMove.allDay && startStr.includes("T")
        ? startStr.slice(11, 19)
        : "00:00:00";
    const endTimePart =
      !eventToMove.allDay && endStr.includes("T")
        ? endStr.slice(11, 19)
        : "23:59:59";

    const localStartDate = new Date(`${newStartKey}T${startTimePart.slice(0, 5) || "00:00"}:00`);
    const localEndDate = new Date(`${newEndKey}T${endTimePart.slice(0, 5) || "23:59"}:59`);

    const updatedStartDate = localStartDate.toISOString();
    const updatedEndDate = localEndDate.toISOString();

    // 1. 낙관적 로컬 상태 즉각 반영 (화면 스켈레톤 위치와 100% 일치)
    setEvents((prev) =>
      prev.map((evt) =>
        evt._id === eventToMove._id
          ? { ...evt, startDate: updatedStartDate, endDate: updatedEndDate }
          : evt
      )
    );

    // 2. DB 영구 저장 전송 (스켈레톤 목표 시작일/종료일 동기화)
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

  // 🌟 실시간 리사이즈 프리뷰 날짜가 주입된 동적 이벤트 목록
  // 리사이즈 드래그 중인 이벤트의 기간이 줄어들면 빈 자리가 생겨 알고리즘에 의해 실시간으로 위(Row 0 등)로 이동 반영
  const effectiveEvents = useMemo(() => {
    if (!resizingEvent || (!resizePreviewStartDate && !resizePreviewEndDate)) {
      return filteredEvents;
    }
    const currentStart = resizePreviewStartDate || getLocalDateKey(resizingEvent.startDate);
    const currentEnd = resizePreviewEndDate || getLocalDateKey(resizingEvent.endDate);

    return filteredEvents.map((e) =>
      e._id === resizingEvent._id
        ? {
            ...e,
            startDate: `${currentStart}T00:00:00`,
            endDate: `${currentEnd}T23:59:59`,
          }
        : e
    );
  }, [filteredEvents, resizingEvent, resizePreviewStartDate, resizePreviewEndDate]);

  // 날짜별 일정 맵핑 (팝오버 및 단일 일정용)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    effectiveEvents.forEach((evt) => {
      const startKey = getLocalDateKey(evt.startDate);
      const endKey = getLocalDateKey(evt.endDate);

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
  }, [effectiveEvents]);

  // ================= 7. 주(Week) 단위 캘린더 막대 정렬 & 행 할당 알고리즘 =================
  // [알고리즘 규칙 1. 정렬(Sorting)]
  // 1순위: 시작 날짜(Start Date)가 가장 빠른(과거인) 순서대로 오름차순 정렬 (맨 위 행 선점)
  // 2순위: 시작 날짜가 같다면 일정이 차지하는 '기간(Duration)'이 긴 순서대로 내림차순 정렬
  // [알고리즘 규칙 2. 행 할당(Row Allocation)]
  // 각 일정이 차지하는 날짜 범위 내에서, 0번 행(Row 0)부터 시작하여
  // 해당 날짜들에 이미 배치된 다른 일정과 겹치지 않는 '가장 첫 번째 빈 행(Lowest available Row Index)'을 찾아 할당
  const getWeekSpanningTracks = useCallback(
    (days: DayCellData[]) => {
      const weekStartKey = days[0].dateKey;
      const weekEndKey = days[6].dateKey;

      // 이번 주와 겹치는 모든 일정 (다중일 + 단일일 - 리사이즈 실시간 프리뷰 자동 반영)
      const weekEvents = effectiveEvents.filter((evt) => {
        const sKey = getLocalDateKey(evt.startDate);
        const eKey = getLocalDateKey(evt.endDate);
        return sKey <= weekEndKey && eKey >= weekStartKey;
      });

      // 1. 정렬(Sorting):
      // 🌟 1순위: '이번 주(Week)에서 시작하는 유효 날짜'가 빠른 순서 (오름차순)
      //          -> 1주차(11.02~11.08): 11.02 시작인 3이 11.04 시작인 1보다 위(Row 0)에 배치!
      // 🌟 2순위: 이번 주 시작일이 같다면 (2주차처럼 둘 다 지난주에서 이어져 월요일부터 시작할 때),
      //          '전체 기간(Duration)'이 길거나 종료일이 더 늦은 일정을 위쪽(Row 0)에 우선 배치!
      //          -> 2주차(11.09~11.15): 11.18까지 가는 1이 위(Row 0), 11.13에 끝나는 3이 아래(Row 1)에 배치!
      const sorted = [...weekEvents].sort((a, b) => {
        const sA = getLocalDateKey(a.startDate);
        const eA = getLocalDateKey(a.endDate);
        const sB = getLocalDateKey(b.startDate);
        const eB = getLocalDateKey(b.endDate);

        // 이번 주 내에서 바가 시작하는 유효 날짜 (지난주에서 이어져 왔으면 이번 주 첫날인 weekStartKey)
        const effectiveStartA = sA < weekStartKey ? weekStartKey : sA;
        const effectiveStartB = sB < weekStartKey ? weekStartKey : sB;

        // 1순위: 이번 주 기준 시작일이 더 이른 일정 우선
        if (effectiveStartA !== effectiveStartB) {
          return effectiveStartA.localeCompare(effectiveStartB);
        }

        // 2순위: 이번 주 시작일이 같다면 전체 기간(Duration)이 더 긴 일정 우선
        const durationA = Math.max(1, getDaysDiff(sA, eA) + 1);
        const durationB = Math.max(1, getDaysDiff(sB, eB) + 1);
        if (durationB !== durationA) {
          return durationB - durationA;
        }

        // 3순위: 전체 종료일이 더 늦은 일정 우선
        if (eA !== eB) {
          return eB.localeCompare(eA);
        }

        // 4순위: 전체 시작일이 더 과거인 일정 우선
        if (sA !== sB) {
          return sA.localeCompare(sB);
        }

        return a.title.localeCompare(b.title);
      });

      // 2. 행 할당(Row Allocation): 0번 행부터 비어있는 가장 첫 번째 행(Lowest Row Index) 탐색
      const rowOccupancy: boolean[][] = []; // [rowIdx][col 1..7]
      const segments: SpanningTrackSegment[] = [];

      for (const evt of sorted) {
        const sKey = getLocalDateKey(evt.startDate);
        const eKey = getLocalDateKey(evt.endDate);

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

        // 0번 행(Row 0)부터 시작하여 startCol ~ endCol이 비어있는 가장 첫 번째 빈 행 찾기
        let assignedRow = -1;
        for (let r = 0; r < rowOccupancy.length; r++) {
          let hasCollision = false;
          for (let c = startCol; c <= endCol; c++) {
            if (rowOccupancy[r][c]) {
              hasCollision = true;
              break;
            }
          }
          if (!hasCollision) {
            assignedRow = r;
            break;
          }
        }

        // 비어있는 행이 없으면 새로운 행 생성
        if (assignedRow === -1) {
          assignedRow = rowOccupancy.length;
          rowOccupancy.push(new Array(8).fill(false));
        }

        // 해당 행에 점유 표시
        for (let c = startCol; c <= endCol; c++) {
          rowOccupancy[assignedRow][c] = true;
        }

        segments.push({
          evt,
          startCol,
          endCol,
          colSpan,
          isContinuationFromPrev,
          isContinuationToNext,
          trackIndex: assignedRow,
        });
      }

      return {
        trackCount: Math.max(1, rowOccupancy.length),
        segments,
      };
    },
    [effectiveEvents]
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
    setSelectedDateKey(null);
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
          <h1 className="ui-page-title">캘린더</h1>
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
            <RefreshCw size={15} className={isLoading ? "animate-spin text-primary" : ""} />
          </button>

          {/* + 일정 추가 버튼 */}
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:opacity-90 text-on-primary font-semibold rounded-md text-sm transition-all shadow-xs cursor-pointer"
          >
            <Plus size={15} />
            <span>일정 추가</span>
          </button>
        </div>
      </div>

      {/* ================= 2. 서브 컨트롤 툴바 (사진1) ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-sm">
        {/* 좌측: 카테고리 필터 + 이전/다음 월 + 오늘 버튼 */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button
              onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
              className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 text-sm"
            >
              <FolderPlus size={15} className="text-primary" />
              <span>
                {selectedCategoryFilter === "all"
                  ? "카테고리"
                  : DEFAULT_CATEGORIES.find((c) => c.id === selectedCategoryFilter)?.label || "카테고리"}
              </span>
            </button>

            {isCategoryFilterOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-40 bg-surface-container-lowest border border-outline-variant rounded-md shadow-lg p-1.5 z-30 space-y-0.5 text-sm">
                <button
                  onClick={() => {
                    setSelectedCategoryFilter("all");
                    setIsCategoryFilterOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs sm:text-sm font-medium transition-colors ${
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
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      selectedCategoryFilter === c.id
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-surface-container"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
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
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goNextMonth}
              className="p-1 hover:bg-surface-container rounded transition-colors cursor-pointer text-on-surface"
              title="다음 달"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={goToday}
            className="px-3 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-md font-medium transition-colors cursor-pointer text-sm"
          >
            오늘
          </button>
        </div>

        {/* 중앙: 2026년 10월 / 11월 (사진1 & 사진2) */}
        <div className="text-center">
          <h2 className="ui-section-title font-mono">
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
                className={`px-3 py-1.5 rounded text-sm transition-colors cursor-pointer ${
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

      {/* 🌟 캘린더 막대 리사이즈 중 실시간 기간 안내 툴팁 배지 */}
      {resizingEvent && (resizePreviewStartDate || resizePreviewEndDate) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary text-on-primary rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 pointer-events-none transition-all duration-150 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
          <span>{resizingEvent.title}</span>
          <span className="opacity-60">|</span>
          <span className="font-mono">
            {resizePreviewStartDate || getLocalDateKey(resizingEvent.startDate)} ~{" "}
            {resizePreviewEndDate || getLocalDateKey(resizingEvent.endDate)}
          </span>
          <span className="text-[10px] bg-black/25 px-2 py-0.5 rounded-full font-semibold">
            {resizingEdge === "start" ? "시작일 조절" : "종료일 조절"} (
            {Math.max(
              1,
              getDaysDiff(
                resizePreviewStartDate || getLocalDateKey(resizingEvent.startDate),
                resizePreviewEndDate || getLocalDateKey(resizingEvent.endDate)
              ) + 1
            )}
            일간)
          </span>
        </div>
      )}

      {/* 🌟 캘린더 드래그 앤 드롭 이동 중 상단 실시간 안내 배지 */}
      {draggingEvent && dragPreview && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-primary text-on-primary rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 pointer-events-none transition-all duration-150 animate-bounce">
          <span>이동 중: {draggingEvent.title}</span>
          <span className="opacity-60">|</span>
          <span className="font-mono">
            {dragPreview.startKey} ~ {dragPreview.endKey}
          </span>
          <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full">
            {dragPreview.dayDiff > 0 ? `+${dragPreview.dayDiff}일` : `${dragPreview.dayDiff}일`}
          </span>
        </div>
      )}

      {/* ================= 3. 메인 월간 그리드 뷰 (사진2 가로 연속 바 완벽 구현) ================= */}
      {viewMode === "month" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
          {/* 요일 헤더: 사진2 기준 월, 화, 수, 목, 금, 토, 일 */}
          <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-low text-center text-sm font-semibold py-2.5 text-on-surface-variant">
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
              const weekStartKey = weekDays[0].dateKey;
              const weekEndKey = weekDays[6].dateKey;

              // 🌟 DND 스켈레톤 프리뷰 세그먼트 계산 (현재 주에 걸치는 경우)
              let skeletonSeg: {
                startCol: number;
                endCol: number;
                isContinuationFromPrev: boolean;
                isContinuationToNext: boolean;
              } | null = null;

              if (dragPreview) {
                const { startKey: pStart, endKey: pEnd } = dragPreview;
                if (pStart <= weekEndKey && pEnd >= weekStartKey) {
                  const effStart = pStart < weekStartKey ? weekStartKey : pStart;
                  const effEnd = pEnd > weekEndKey ? weekEndKey : pEnd;
                  const startCol = weekDays.findIndex((d) => d.dateKey === effStart) + 1;
                  const endCol = weekDays.findIndex((d) => d.dateKey === effEnd) + 1;
                  if (startCol >= 1 && endCol >= 1) {
                    skeletonSeg = {
                      startCol,
                      endCol,
                      isContinuationFromPrev: pStart < weekStartKey,
                      isContinuationToNext: pEnd > weekEndKey,
                    };
                  }
                }
              }

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

                      // 리사이즈 프리뷰 여부 (시작일/종료일 양방향 모두 커버)
                      const curResizeStart = resizePreviewStartDate || (resizingEvent ? getLocalDateKey(resizingEvent.startDate) : "");
                      const curResizeEnd = resizePreviewEndDate || (resizingEvent ? getLocalDateKey(resizingEvent.endDate) : "");
                      const isResizeTarget = Boolean(
                        resizingEvent &&
                        curResizeStart &&
                        curResizeEnd &&
                        day.dateKey >= curResizeStart &&
                        day.dateKey <= curResizeEnd
                      );

                      return (
                        <div
                          key={day.dateKey}
                          data-date-key={day.dateKey}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            handleCellDragOver(e, day.dateKey);
                          }}
                          onDragOver={(e) => handleCellDragOver(e, day.dateKey)}
                          onDrop={(e) => handleCellDrop(e, day.dateKey)}
                          onClick={(e) => handleSelectDayCell(day, e.currentTarget)}
                          className={`h-full p-1.5 sm:p-2 pointer-events-auto transition-colors cursor-pointer group flex flex-col justify-between ${
                            !day.isCurrentMonth
                              ? "opacity-35 bg-surface-container-low/20"
                              : "hover:bg-surface-container-low/40"
                          } ${isSelected ? "ring-1 ring-white/70 dark:ring-white/80 rounded-sm" : ""} ${
                            isOver ? "bg-primary/20 ring-2 ring-primary ring-inset" : ""
                          } ${isResizeTarget ? "bg-primary/15 ring-2 ring-primary/40 ring-inset" : ""}`}
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

                            {isOver ? (
                              <span className="px-1.5 py-0.5 rounded bg-primary text-on-primary text-[10px] font-bold shadow-xs animate-in zoom-in-95 duration-100">
                                여기에 이동
                              </span>
                            ) : (
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
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3-2. 전면 일정 오버레이 레이어 (사진 2의 가로 연속 바 + 불릿 리스트) */}
                  <div className="relative pt-6 sm:pt-7 pb-1.5 px-0.5 flex flex-col gap-1 pointer-events-none">
                    {/* 🌟 B. DND 스켈레톤 프리뷰 바 (드래그 중 목표 위치를 펄싱 점선 스켈레톤으로 시각화 - 라이트/다크 완벽 대비) */}
                    {skeletonSeg && (
                      <div className="grid grid-cols-7 gap-0 w-full h-5 sm:h-5.5 relative pointer-events-none mb-1">
                        <div
                          style={{
                            gridColumnStart: skeletonSeg.startCol,
                            gridColumnEnd: skeletonSeg.endCol + 1,
                          }}
                          className="px-0.5 h-full relative"
                        >
                          <div
                            className={`w-full h-full flex items-center justify-between text-[10px] sm:text-[11px] font-bold border-2 border-dashed border-primary bg-primary/20 dark:bg-primary/30 text-primary shadow-md shadow-primary/20 ring-2 ring-primary/40 backdrop-blur-[1px] animate-pulse ${
                              skeletonSeg.isContinuationFromPrev
                                ? "rounded-l-none border-l-0 pl-1"
                                : "rounded-l-md border-l-[3.5px] pl-1.5"
                            } ${
                              skeletonSeg.isContinuationToNext
                                ? "rounded-r-none border-r-0 pr-1"
                                : "rounded-r-md pr-1.5"
                            }`}
                          >
                            <div className="flex items-center gap-1 min-w-0 truncate">
                              {skeletonSeg.isContinuationFromPrev ? (
                                <span className="text-[9px]">◀</span>
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0" />
                              )}
                              <span className="truncate">{dragPreview?.title}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-primary text-on-primary shrink-0 shadow-xs">
                                {dragPreview?.startKey ? dragPreview.startKey.slice(5) : ""} ~ {dragPreview?.endKey ? dragPreview.endKey.slice(5) : ""}
                              </span>
                              {skeletonSeg.isContinuationToNext && <span className="text-[9px]">▶</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* A. 다중일(기간) 연속 가로 바 레이어 (트랙별 7열 CSS Grid) */}
                    {Array.from({ length: trackCount }).map((_, trackIdx) => {
                      const trackSegments = segments.filter((s) => s.trackIndex === trackIdx);
                      if (trackSegments.length === 0) return null;

                      return (
                        <div
                          key={trackIdx}
                          className="grid grid-cols-7 gap-0 w-full h-5 sm:h-5.5 relative pointer-events-none mb-1"
                        >
                          {trackSegments.map((seg) => {
                            const styles = getEventColorStyles(seg.evt.color, isDark);
                            const isThisResizing = Boolean(resizingEvent && seg.evt._id === resizingEvent._id);
                            const isThisDragging = Boolean(draggingEvent && seg.evt._id === draggingEvent._id);

                            // 🌟 1. 리사이즈 중인 이벤트: 실시간 고대비 점선 스켈레톤 바 (라이트모드 초고대비 + 줄이기/늘리기 시 트랙 재할당 즉각 반영)
                            if (isThisResizing) {
                              const isStartEdge = resizingEdge === "start";
                              const curStartKey = getLocalDateKey(seg.evt.startDate);
                              const curEndKey = getLocalDateKey(seg.evt.endDate);
                              const curDuration = Math.max(1, getDaysDiff(curStartKey, curEndKey) + 1);

                              return (
                                <div
                                  key={`resizing-skeleton-${seg.evt._id}`}
                                  style={{
                                    gridColumnStart: seg.startCol,
                                    gridColumnEnd: seg.endCol + 1,
                                  }}
                                  className="px-0.5 h-full relative pointer-events-none z-20"
                                >
                                  <div
                                    className={`w-full h-full flex items-center justify-between text-[10px] sm:text-[11px] font-bold border-2 border-dashed border-primary bg-primary/20 dark:bg-primary/30 text-primary shadow-md shadow-primary/20 ring-2 ring-primary/40 backdrop-blur-[1px] animate-pulse ${
                                      seg.isContinuationFromPrev
                                        ? "rounded-l-none border-l-0 pl-1"
                                        : "rounded-l-md border-l-[3.5px] pl-1.5"
                                    } ${
                                      seg.isContinuationToNext
                                        ? "rounded-r-none border-r-0 pr-1"
                                        : "rounded-r-md pr-1.5"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1 min-w-0 truncate">
                                      {seg.isContinuationFromPrev ? (
                                        <span className="text-[9px]">◀</span>
                                      ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping shrink-0" />
                                      )}
                                      <span className="truncate">{seg.evt.title}</span>
                                      <span className="text-[9px] font-medium opacity-85 shrink-0 hidden sm:inline">
                                        ({isStartEdge ? "시작일 조절" : "종료일 조절"})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-primary text-on-primary shrink-0 shadow-xs">
                                        {curDuration}일 ({curStartKey ? curStartKey.slice(5) : ""}~{curEndKey ? curEndKey.slice(5) : ""})
                                      </span>
                                      {seg.isContinuationToNext && <span className="text-[9px]">▶</span>}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // 🌟 2. 일반 및 드래그 중인 이벤트 바
                            return (
                              <div
                                key={seg.evt._id || seg.evt.title}
                                style={{
                                  gridColumnStart: seg.startCol,
                                  gridColumnEnd: seg.endCol + 1,
                                }}
                                className={`px-0.5 h-full relative ${
                                  draggingEvent || resizingEvent ? "pointer-events-none" : "pointer-events-auto"
                                }`}
                              >
                                <div
                                  draggable
                                  onDragStart={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const fraction = Math.max(
                                      0,
                                      Math.min(0.999, (e.clientX - rect.left) / rect.width)
                                    );
                                    const colSpan = seg.endCol - seg.startCol + 1;
                                    const colOffset = Math.floor(fraction * colSpan);
                                    const grabIdx = seg.startCol - 1 + colOffset;
                                    handleDragStart(e, seg.evt, weekDays[grabIdx]?.dateKey);
                                  }}
                                  onDragEnd={handleDragEnd}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(seg.evt);
                                  }}
                                  style={{
                                    backgroundColor: styles.bgRgba,
                                    borderColor: styles.borderRgba,
                                    borderLeftColor: !seg.isContinuationFromPrev ? styles.accentColor : styles.borderRgba,
                                    color: styles.textColor,
                                  }}
                                  className={`group/bar relative w-full h-full flex items-center justify-between text-[11px] sm:text-[11.5px] font-semibold select-none cursor-grab active:cursor-grabbing hover:brightness-105 hover:shadow-xs transition-all duration-150 ease-out border shadow-2xs ${
                                    seg.isContinuationFromPrev
                                      ? "rounded-l-none border-l-0 pl-1"
                                      : "rounded-l-md border-l-[3.5px] pl-1.5"
                                  } ${
                                    seg.isContinuationToNext
                                      ? "rounded-r-none border-r-0 pr-1"
                                      : "rounded-r-md pr-1.5"
                                  } ${
                                    isThisDragging
                                      ? "opacity-25 border-dashed scale-95"
                                      : "opacity-100"
                                  }`}
                                  title={`${seg.evt?.title || "일정"} (${seg.evt?.allDay ? "종일" : getEventTimeDisplay(seg.evt, true).timeText}, ${(getLocalDateKey(seg.evt?.startDate) || "").slice(5)} ~ ${(getLocalDateKey(seg.evt?.endDate) || "").slice(5)}) - 드래그하여 이동 또는 양 끝을 조절할 수 있습니다`}
                                >
                                  {/* 좌측 가장자리 리사이즈 핸들 (시작일 조정) */}
                                  {!seg.isContinuationFromPrev && (
                                    <div
                                      onMouseDown={(e) => handleResizeStart(e, seg.evt, "start")}
                                      className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/15 dark:hover:bg-white/30 rounded-l-xs opacity-0 group-hover/bar:opacity-100 transition-opacity z-10"
                                      title="시작일 드래그 조절"
                                    />
                                  )}

                                  {/* 좌측 타이틀 (이전 주에서 넘어왔으면 ◀ 화살표, 시작일이면 컬러 도트 + 종일/시간 뱃지) */}
                                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                                    {seg.isContinuationFromPrev ? (
                                      <span className="text-[9px] font-bold opacity-75 shrink-0">◀</span>
                                    ) : (
                                      <>
                                        <span
                                          className="w-1.5 h-1.5 rounded-full shrink-0 shadow-2xs"
                                          style={{ backgroundColor: styles.accentColor }}
                                        />
                                        {seg.evt.allDay ? (
                                          <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-black/10 dark:bg-white/15 shrink-0 leading-tight opacity-90">
                                            종일
                                          </span>
                                        ) : (
                                          <span className="font-mono text-[9.5px] font-bold px-1 py-0.2 rounded bg-black/10 dark:bg-white/15 shrink-0 leading-tight opacity-95">
                                            {getEventTimeDisplay(seg.evt, false).timeText}
                                          </span>
                                        )}
                                      </>
                                    )}
                                    <span className="truncate leading-none">{seg.evt.title}</span>
                                  </div>

                                  {/* 우측 인디케이터 (다음 주로 넘어가면 ▶ 화살표) */}
                                  {seg.isContinuationToNext && (
                                    <span className="text-[9px] font-bold opacity-75 shrink-0 ml-1">▶</span>
                                  )}

                                  {/* 우측 가장자리 리사이즈 핸들 (종료일 조정) */}
                                  {!seg.isContinuationToNext && (
                                    <div
                                      onMouseDown={(e) => handleResizeStart(e, seg.evt, "end")}
                                      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/15 dark:hover:bg-white/30 rounded-r-xs opacity-0 group-hover/bar:opacity-100 transition-opacity z-10"
                                      title="종료일 드래그 조절"
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}
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
                          className="px-2 py-1 rounded-md text-[11px] truncate border border-l-[3px] font-semibold transition-all hover:brightness-105 shadow-2xs"
                          style={{
                            backgroundColor: styles.bgRgba,
                            borderColor: styles.borderRgba,
                            borderLeftColor: styles.accentColor,
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
                    borderLeftColor: styles.accentColor,
                    color: styles.textColor,
                  }}
                  className="p-3 rounded-lg border border-l-[4px] flex items-center justify-between cursor-pointer hover:brightness-105 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: styles.accentColor }}
                    />
                    <span className="font-semibold text-xs sm:text-sm">{evt.title}</span>
                  </div>
                  <span className="text-[11px] font-mono opacity-80">
                    {(getLocalDateKey(evt?.startDate) || "").slice(5)} ~ {(getLocalDateKey(evt?.endDate) || "").slice(5)}
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
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-container-low border border-outline-variant text-xs cursor-pointer transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: styles.accentColor }}
                    />
                    <span className="font-medium text-on-surface truncate">{evt.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-on-surface-variant shrink-0">
                    {(getLocalDateKey(evt?.startDate) || "").slice(5)} ~ {(getLocalDateKey(evt?.endDate) || "").slice(5)}
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
          isDark={isDark}
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
