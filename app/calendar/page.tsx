"use client";

import { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Home,
  Sun,
  Moon,
  Loader2,
  Clock,
  AlignLeft,
  X,
  Edit3,
  Trash2,
  Lock,
  Settings,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Repeat,
  Sparkles,
  CalendarDays,
  ListTodo,
  CheckCircle2,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useMounted } from "@/lib/hooks/useMounted";

export interface CalendarEvent {
  _id?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  category: string;
  color?: string;
  authorEmail?: string;
  calendarType?: "personal" | "group";
  isTodo?: boolean;
  isCompleted?: boolean;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarCategory {
  id: string;
  label: string;
  color: string;
  visible: boolean;
  isDefault?: boolean;
}

// oneQuiz 시그니처 컬러 팔레트 (독창적 14색 큐레이션)
const ONEQUIZ_PALETTE = [
  { name: "엠버 골드", hex: "#f59e0b" },
  { name: "웜 테라코타", hex: "#ea580c" },
  { name: "클래식 크림슨", hex: "#e11d48" },
  { name: "로열 코발트", hex: "#2563eb" },
  { name: "미드나잇 오션", hex: "#0284c7" },
  { name: "포레스트 세이지", hex: "#059669" },
  { name: "올리브 카키", hex: "#65a30d" },
  { name: "더스크 바이올렛", hex: "#7c3aed" },
  { name: "모브 플럼", hex: "#9333ea" },
  { name: "빈티지 로즈", hex: "#db2777" },
  { name: "스모키 슬레이트", hex: "#475569" },
  { name: "에어리 틸", hex: "#0d9488" },
  { name: "웜 브라운", hex: "#78350f" },
  { name: "딥 챠콜", hex: "#1e293b" },
];

const DEFAULT_CATEGORIES: CalendarCategory[] = [
  { id: "general", label: "일반 일정", color: "#f59e0b", visible: true, isDefault: true },
  { id: "study", label: "학습/시험", color: "#2563eb", visible: true, isDefault: true },
  { id: "project", label: "프로젝트/업무", color: "#059669", visible: true, isDefault: true },
  { id: "personal", label: "개인/약속", color: "#7c3aed", visible: true, isDefault: true },
  { id: "reminder", label: "할 일/체크", color: "#ea580c", visible: true, isDefault: true },
  { id: "other", label: "기타", color: "#475569", visible: true, isDefault: true },
];

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || typeof hex !== "string") return `rgba(245, 158, 11, ${alpha})`;
  let c = hex.replace("#", "");
  if (c.length === 3) {
    c = c.split("").map((x) => x + x).join("");
  }
  if (c.length !== 6) return hex;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toInputDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toInputDateTime(d: Date): string {
  const dateStr = toInputDate(d);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${dateStr}T${hours}:${mins}`;
}

function parseToInputValues(startDateStr: string, endDateStr: string, allDay: boolean) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr || startDateStr);
  const validStart = isNaN(start.getTime()) ? new Date() : start;
  const validEnd = isNaN(end.getTime()) ? validStart : end;

  if (allDay) {
    return {
      startDate: toInputDate(validStart),
      endDate: toInputDate(validEnd),
    };
  } else {
    return {
      startDate: toInputDateTime(validStart),
      endDate: toInputDateTime(validEnd),
    };
  }
}

function formatEventTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${mins}`;
  } catch {
    return "";
  }
}

function formatEventDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
  } catch {
    return dateStr;
  }
}

function getDurationLabel(startDate: string, endDate: string, allDay: boolean) {
  const s = new Date(startDate);
  const e = new Date(endDate || startDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return "";

  const sMid = new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime();
  const eMid = new Date(e.getFullYear(), e.getMonth(), e.getDate()).getTime();
  const diffDays = Math.round((eMid - sMid) / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays > 1) {
    return `${diffDays}일간`;
  }
  if (allDay) {
    return "하루 종일";
  }

  const diffHours = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60) * 10) / 10;
  if (diffHours > 0) {
    return `${diffHours}시간`;
  }
  return "당일";
}

function isDateInEventRange(targetDate: Date, event: CalendarEvent) {
  const target = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ).getTime();
  const start = new Date(event.startDate);
  const end = new Date(event.endDate || event.startDate);
  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return target >= startTime && target <= endTime;
}

const toMidnight = (d: Date | string) => {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

interface MonthGridDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayNumber: number;
  dayOfWeek: number;
  midnight: number;
  dateStr: string;
}

interface WeekSegment {
  event: CalendarEvent;
  startCol: number;
  endCol: number;
  span: number;
  track: number;
  isFirstSegment: boolean;
  isLastSegment: boolean;
  isMultiDay: boolean;
  isTodo: boolean;
}

interface WeekRowData {
  weekIndex: number;
  days: MonthGridDay[];
  segments: WeekSegment[];
  overflowCountPerDay: number[];
}

const MAX_VISIBLE_TRACKS = 3;

function CalendarContent() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();

  const mounted = useMounted();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 카테고리 관리 상태 (로컬 스토리지 동기화)
  const [categories, setCategories] = useState<CalendarCategory[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("onequiz_calendar_categories");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_CATEGORIES;
  });

  const saveCategories = (newCats: CalendarCategory[]) => {
    setCategories(newCats);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_calendar_categories", JSON.stringify(newCats));
    }
  };

  const getCategory = useCallback(
    (catId: string): CalendarCategory => {
      if (catId === "naver") {
        return categories.find((c) => c.id === "general") || DEFAULT_CATEGORIES[0];
      }
      return (
        categories.find((c) => c.id === catId) || {
          id: catId,
          label: catId,
          color: "#f59e0b",
          visible: true,
        }
      );
    },
    [categories],
  );

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"event" | "todo">("event");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 설정 모달 (카테고리 색상 및 표시 여부)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState("#f59e0b");

  // +N개 더보기 모달 창 (일정 + 할 일 분리 뷰)
  const [moreEventsModal, setMoreEventsModal] = useState<{
    date: Date;
    events: CalendarEvent[];
    todos: CalendarEvent[];
  } | null>(null);

  // 사이드 패널 (To-Do & Schedule)
  const [showTodoPanel, setShowTodoPanel] = useState(true);
  const [sidePanelFilter, setSidePanelFilter] = useState<"all" | "events" | "todos">("all");
  const [newTodoInput, setNewTodoInput] = useState("");
  const [isTodoDailyRoutine, setIsTodoDailyRoutine] = useState(false);

  // 매일 루틴 생성 모달
  const [isQuickRoutineModalOpen, setIsQuickRoutineModalOpen] = useState(false);
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineDays, setRoutineDays] = useState(7);
  const [routineCategory, setRoutineCategory] = useState("study");

  // 등록/수정 폼 데이터
  const [formData, setFormData] = useState<CalendarEvent>({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    allDay: true,
    category: "general",
    color: "#f59e0b",
    isTodo: false,
    isCompleted: false,
  });

  // 반복 일정 설정 (일정 전용)
  const [recurrenceType, setRecurrenceType] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [recurrenceCount, setRecurrenceCount] = useState(7);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/calendar");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (status === "authenticated") {
        setIsLoading(true);
        try {
          const res = await fetch("/api/calendar");
          if (res.ok && isMounted) {
            const data = await res.json();
            setEvents(data);
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else if (status === "unauthenticated") {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [status]);

  // 카테고리 VISIBLE 필터링된 일정 목록
  const visibleEvents = useMemo(() => {
    return events.filter((e) => {
      const cat = getCategory(e.category);
      return cat.visible !== false;
    });
  }, [events, getCategory]);

  // 1. 캘린더 6주 고정 42일 그리드 생성 (연속된 날짜 타임스탬프 매핑)
  const monthGridDays: MonthGridDay[] = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const firstDayOfWeek = new Date(y, m, 1).getDay(); // 0 (일) ~ 6 (토)
    const daysInCurrentMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrevMonth = new Date(y, m, 0).getDate();
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const list: MonthGridDay[] = [];

    // 이전 달 잔여 일자
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(y, m - 1, daysInPrevMonth - i);
      const mid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      list.push({
        date: d,
        isCurrentMonth: false,
        isToday: mid === todayMidnight,
        dayNumber: d.getDate(),
        dayOfWeek: d.getDay(),
        midnight: mid,
        dateStr: toInputDate(d),
      });
    }

    // 이번 달 일자
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const d = new Date(y, m, day);
      const mid = new Date(y, m, day).getTime();
      list.push({
        date: d,
        isCurrentMonth: true,
        isToday: mid === todayMidnight,
        dayNumber: day,
        dayOfWeek: d.getDay(),
        midnight: mid,
        dateStr: toInputDate(d),
      });
    }

    // 다음 달 선행 일자 (42칸 고정)
    const remaining = 42 - list.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(y, m + 1, day);
      const mid = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      list.push({
        date: d,
        isCurrentMonth: false,
        isToday: mid === todayMidnight,
        dayNumber: day,
        dayOfWeek: d.getDay(),
        midnight: mid,
        dateStr: toInputDate(d),
      });
    }

    return list;
  }, [currentDate]);

  // 2. Interval Partitioning 알고리즘 및 주(Week) 단위 세그먼트 분할
  const weeksData: WeekRowData[] = useMemo(() => {
    if (monthGridDays.length < 42) return [];

    const gridStartMid = monthGridDays[0].midnight;
    const gridEndMid = monthGridDays[41].midnight;

    // 1) 42일 범위 내 후보 일정 및 할 일 필터링
    const candidates = visibleEvents.filter((e) => {
      const s = toMidnight(e.startDate);
      const end = toMidnight(e.endDate || e.startDate);
      return s <= gridEndMid && end >= gridStartMid;
    });

    // 2) 결정론적 강제 정렬 (Deterministic Strict Sorting)
    const sorted = [...candidates].sort((a, b) => {
      const aStart = toMidnight(a.startDate);
      const bStart = toMidnight(b.startDate);
      const aEnd = toMidnight(a.endDate || a.startDate);
      const bEnd = toMidnight(b.endDate || b.startDate);

      const aDuration = aEnd - aStart;
      const bDuration = bEnd - bStart;
      const aIsMulti = !a.isTodo && aDuration > 0;
      const bIsMulti = !b.isTodo && bDuration > 0;

      // 1순위: 다중 일 기간 일정 우선 (화면 상단 연속 리본 형성)
      if (aIsMulti !== bIsMulti) return aIsMulti ? -1 : 1;
      // 2순위: 시작일 오름차순
      if (aStart !== bStart) return aStart - bStart;
      // 3순위: 다중 일 일정 간에는 기간이 긴 일정 우선 (상단 트랙 안정 점유)
      if (aIsMulti && bIsMulti && aDuration !== bDuration) return bDuration - aDuration;
      // 4순위: 일반 일정 우선 (할 일보다 먼저)
      if (a.isTodo !== b.isTodo) return a.isTodo ? 1 : -1;
      // 5순위: 할 일 간: 미완료 우선
      if (a.isTodo && b.isTodo && a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      // 6순위: 시간제 일정 시간 순
      if (!a.allDay && !b.allDay) {
        const aTime = new Date(a.startDate).getTime();
        const bTime = new Date(b.startDate).getTime();
        if (aTime !== bTime) return aTime - bTime;
      }
      // 7순위: 타이 브레이커 (순서 뒤바뀜 방지)
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aCreated !== bCreated) return aCreated - bCreated;
      return (a._id || a.title).localeCompare(b._id || b.title);
    });

    // 3) 다중 일 기간 일정 전역 Interval Partitioning (주 경계를 넘어도 동일 행 트랙 유지)
    const globalMultiOccupancy: boolean[][] = [];
    const multiDayTrackMap = new Map<string, number>();

    const multiDayList = sorted.filter(
      (e) => !e.isTodo && toMidnight(e.endDate || e.startDate) > toMidnight(e.startDate)
    );

    multiDayList.forEach((evt) => {
      const sMid = toMidnight(evt.startDate);
      const eMid = toMidnight(evt.endDate || evt.startDate);
      const sIdx = Math.max(0, Math.round((sMid - gridStartMid) / 86400000));
      const eIdx = Math.min(41, Math.round((eMid - gridStartMid) / 86400000));

      let track = 0;
      while (true) {
        if (!globalMultiOccupancy[track]) {
          globalMultiOccupancy[track] = new Array(42).fill(false);
        }
        let canFit = true;
        for (let d = sIdx; d <= eIdx; d++) {
          if (globalMultiOccupancy[track][d]) {
            canFit = false;
            break;
          }
        }
        if (canFit) {
          for (let d = sIdx; d <= eIdx; d++) {
            globalMultiOccupancy[track][d] = true;
          }
          const key = evt._id || `${evt.title}-${evt.startDate}`;
          multiDayTrackMap.set(key, track);
          break;
        }
        track++;
      }
    });

    // 4) 주(Week) 단위 세그먼트 분할 및 단일 일/할 일 Interval Partitioning
    const result: WeekRowData[] = [];

    for (let w = 0; w < 6; w++) {
      const weekDays = monthGridDays.slice(w * 7, (w + 1) * 7);
      const weekStartMid = weekDays[0].midnight;
      const weekEndMid = weekDays[6].midnight;

      const weekTrackOccupancy: boolean[][] = [];
      const segments: WeekSegment[] = [];

      // 4-1. 다중 일 일정 세그먼트 생성 (전역 트랙 계승)
      for (const evt of multiDayList) {
        const sMid = toMidnight(evt.startDate);
        const eMid = toMidnight(evt.endDate || evt.startDate);

        if (sMid <= weekEndMid && eMid >= weekStartMid) {
          const startCol = Math.max(0, Math.min(6, Math.round((sMid - weekStartMid) / 86400000)));
          const endCol = Math.max(0, Math.min(6, Math.round((eMid - weekStartMid) / 86400000)));
          const key = evt._id || `${evt.title}-${evt.startDate}`;
          const track = multiDayTrackMap.get(key) ?? 0;

          while (weekTrackOccupancy.length <= track) {
            weekTrackOccupancy.push(new Array(7).fill(false));
          }
          for (let c = startCol; c <= endCol; c++) {
            weekTrackOccupancy[track][c] = true;
          }

          segments.push({
            event: evt,
            startCol,
            endCol,
            span: endCol - startCol + 1,
            track,
            isFirstSegment: sMid >= weekStartMid,
            isLastSegment: eMid <= weekEndMid,
            isMultiDay: true,
            isTodo: false,
          });
        }
      }

      // 4-2. 단일 일 일정 및 할 일 세그먼트 배치 (해당 컬럼 내 가장 낮은 빈 트랙 탐색)
      const singleAndTodos = sorted.filter(
        (e) => e.isTodo || toMidnight(e.endDate || e.startDate) === toMidnight(e.startDate)
      );

      for (const item of singleAndTodos) {
        const itemMid = toMidnight(item.startDate);
        if (itemMid >= weekStartMid && itemMid <= weekEndMid) {
          const col = Math.round((itemMid - weekStartMid) / 86400000);
          if (col >= 0 && col <= 6) {
            let track = 0;
            while (true) {
              if (!weekTrackOccupancy[track]) {
                weekTrackOccupancy[track] = new Array(7).fill(false);
              }
              if (!weekTrackOccupancy[track][col]) {
                weekTrackOccupancy[track][col] = true;
                break;
              }
              track++;
            }

            segments.push({
              event: item,
              startCol: col,
              endCol: col,
              span: 1,
              track,
              isFirstSegment: true,
              isLastSegment: true,
              isMultiDay: false,
              isTodo: !!item.isTodo,
            });
          }
        }
      }

      // 4-3. 일별 초과(+N개 더보기) 카운트 계산
      const overflowCountPerDay = new Array(7).fill(0);
      for (let c = 0; c < 7; c++) {
        let count = 0;
        for (let t = MAX_VISIBLE_TRACKS; t < weekTrackOccupancy.length; t++) {
          if (weekTrackOccupancy[t] && weekTrackOccupancy[t][c]) {
            count++;
          }
        }
        overflowCountPerDay[c] = count;
      }

      result.push({
        weekIndex: w,
        days: weekDays,
        segments,
        overflowCountPerDay,
      });
    }

    return result;
  }, [monthGridDays, visibleEvents]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // 1차 클릭: 날짜 선택 & 할 일 패널 동기화, 2차 클릭: 추가 모달 오픈
  const handleDayClick = (date: Date) => {
    const isAlreadySelected =
      selectedDate &&
      selectedDate.getFullYear() === date.getFullYear() &&
      selectedDate.getMonth() === date.getMonth() &&
      selectedDate.getDate() === date.getDate();

    setSelectedDate(date);

    if (isAlreadySelected) {
      handleOpenAddModal(date, "event");
    }
  };

  // 추가 모달 오픈 (일정 또는 할 일 탭 기본 선택)
  const handleOpenAddModal = (
    targetDate?: Date,
    initialTab: "event" | "todo" = "event",
  ) => {
    const target = targetDate instanceof Date ? targetDate : selectedDate;
    const dateStr = toInputDate(target);
    setSelectedEvent(null);
    setIsEditing(true);
    setModalTab(initialTab);
    setRecurrenceType("none");
    setRecurrenceCount(7);
    setIsTodoDailyRoutine(false);
    setFormData({
      title: "",
      description: "",
      startDate: dateStr,
      endDate: dateStr,
      allDay: true,
      category: initialTab === "todo" ? "reminder" : categories[0]?.id || "general",
      color: initialTab === "todo" ? "#ea580c" : categories[0]?.color || "#f59e0b",
      isTodo: initialTab === "todo",
      isCompleted: false,
    });
    setIsModalOpen(true);
  };

  // 기존 항목 클릭 (상세 보기 / 수정)
  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setModalTab(event.isTodo ? "todo" : "event");
    const vals = parseToInputValues(event.startDate, event.endDate, event.allDay);
    setFormData({
      ...event,
      startDate: vals.startDate,
      endDate: vals.endDate,
      color: event.color || getCategory(event.category).color,
      isTodo: !!event.isTodo,
      isCompleted: !!event.isCompleted,
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // 할 일(Task) 즉시 완료/미완료 토글 (Optimistic UI)
  const handleToggleTodo = async (todo: CalendarEvent) => {
    if (!todo._id) return;
    const nextCompleted = !todo.isCompleted;

    setEvents((prev) =>
      prev.map((e) => (e._id === todo._id ? { ...e, isCompleted: nextCompleted } : e)),
    );

    try {
      const res = await fetch("/api/calendar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: todo._id,
          isCompleted: nextCompleted,
        }),
      });
      if (!res.ok) {
        fetchEvents();
      }
    } catch {
      fetchEvents();
    }
  };

  // 일정 또는 할 일 저장
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const isTodoMode = modalTab === "todo";

    const payloadStartDate = isTodoMode || formData.allDay
      ? `${formData.startDate}T00:00:00`
      : formData.startDate;
    const payloadEndDate = isTodoMode || formData.allDay
      ? `${isTodoMode ? formData.startDate : formData.endDate || formData.startDate}T23:59:59`
      : formData.endDate || formData.startDate;

    if (!isTodoMode && new Date(payloadEndDate).getTime() < new Date(payloadStartDate).getTime()) {
      alert("종료 일시는 시작 일시보다 앞설 수 없습니다.");
      return;
    }

    try {
      if (isEditing && selectedEvent?._id) {
        // 수정
        const res = await fetch("/api/calendar", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            isTodo: isTodoMode,
            startDate: payloadStartDate,
            endDate: payloadEndDate,
            _id: selectedEvent._id,
          }),
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchEvents();
        } else {
          alert("수정에 실패했습니다.");
        }
      } else {
        // 신규 등록
        if (!isTodoMode && recurrenceType !== "none") {
          // 반복 일정 일괄 생성
          const batchItems = [];
          const baseStart = new Date(payloadStartDate);
          const baseEnd = new Date(payloadEndDate);
          const durationDiff = baseEnd.getTime() - baseStart.getTime();

          for (let i = 0; i < recurrenceCount; i++) {
            const nextStart = new Date(baseStart);
            if (recurrenceType === "daily") {
              nextStart.setDate(baseStart.getDate() + i);
            } else if (recurrenceType === "weekly") {
              nextStart.setDate(baseStart.getDate() + i * 7);
            } else if (recurrenceType === "monthly") {
              nextStart.setMonth(baseStart.getMonth() + i);
            }

            const nextEnd = new Date(nextStart.getTime() + durationDiff);

            batchItems.push({
              ...formData,
              isTodo: false,
              startDate: formData.allDay ? `${toInputDate(nextStart)}T00:00:00` : toInputDateTime(nextStart),
              endDate: formData.allDay ? `${toInputDate(nextEnd)}T23:59:59` : toInputDateTime(nextEnd),
              recurrence: recurrenceType,
            });
          }

          const res = await fetch("/api/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(batchItems),
          });

          if (res.ok) {
            setIsModalOpen(false);
            fetchEvents();
            alert(`${batchItems.length}개의 반복 일정이 성공적으로 생성되었습니다.`);
          } else {
            alert("일정 생성에 실패했습니다.");
          }
        } else if (isTodoMode && isTodoDailyRoutine) {
          // 7일간 매일 할 일로 일괄 복제 생성
          const batch = [];
          const base = new Date(formData.startDate);
          for (let i = 0; i < 7; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i);
            const dStr = toInputDate(d);
            batch.push({
              ...formData,
              isTodo: true,
              startDate: `${dStr}T00:00:00`,
              endDate: `${dStr}T23:59:59`,
              allDay: true,
            });
          }

          const res = await fetch("/api/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(batch),
          });

          if (res.ok) {
            setIsModalOpen(false);
            setIsTodoDailyRoutine(false);
            fetchEvents();
          } else {
            alert("할 일 등록에 실패했습니다.");
          }
        } else {
          // 단일 등록
          const res = await fetch("/api/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...formData,
              isTodo: isTodoMode,
              startDate: payloadStartDate,
              endDate: payloadEndDate,
            }),
          });

          if (res.ok) {
            setIsModalOpen(false);
            fetchEvents();
          } else {
            alert("등록에 실패했습니다.");
          }
        }
      }
    } catch {
      alert("서버 통신 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent?._id) return;
    const label = selectedEvent.isTodo ? "할 일" : "일정";
    if (!confirm(`이 ${label}을(를) 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/calendar?id=${selectedEvent._id}`, { method: "DELETE" });
      if (res.ok) {
        setIsModalOpen(false);
        fetchEvents();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch {
      alert("삭제 실패");
    }
  };

  // 사이드 패널에서 빠른 할 일 추가
  const handleQuickAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoInput.trim()) return;

    const dateStr = toInputDate(selectedDate);

    try {
      if (isTodoDailyRoutine) {
        const batch = [];
        const base = new Date(dateStr);
        for (let i = 0; i < 7; i++) {
          const d = new Date(base);
          d.setDate(base.getDate() + i);
          const dStr = toInputDate(d);
          batch.push({
            title: newTodoInput.trim(),
            startDate: `${dStr}T00:00:00`,
            endDate: `${dStr}T23:59:59`,
            allDay: true,
            category: "reminder",
            color: "#ea580c",
            isTodo: true,
            isCompleted: false,
          });
        }
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        });
        if (res.ok) {
          setNewTodoInput("");
          setIsTodoDailyRoutine(false);
          fetchEvents();
        }
      } else {
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTodoInput.trim(),
            startDate: `${dateStr}T00:00:00`,
            endDate: `${dateStr}T23:59:59`,
            allDay: true,
            category: "reminder",
            color: "#ea580c",
            isTodo: true,
            isCompleted: false,
          }),
        });
        if (res.ok) {
          setNewTodoInput("");
          fetchEvents();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      const res = await fetch(`/api/calendar?id=${todoId}`, { method: "DELETE" });
      if (res.ok) fetchEvents();
    } catch (e) {
      console.error(e);
    }
  };

  // 매일 루틴 빠른 생성
  const handleCreateQuickRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineTitle.trim()) return;

    const base = new Date();
    const batch = [];
    for (let i = 0; i < routineDays; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dStr = toInputDate(d);
      batch.push({
        title: routineTitle.trim(),
        startDate: `${dStr}T00:00:00`,
        endDate: `${dStr}T23:59:59`,
        allDay: true,
        category: routineCategory,
        color: getCategory(routineCategory).color,
        recurrence: "daily",
      });
    }

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      if (res.ok) {
        setIsQuickRoutineModalOpen(false);
        setRoutineTitle("");
        fetchEvents();
        alert(`${routineDays}일간의 매일 루틴이 생성되었습니다.`);
      }
    } catch {
      alert("생성 실패");
    }
  };

  // 카테고리 관리 액션
  const handleToggleCategoryVisible = (catId: string) => {
    const updated = categories.map((c) =>
      c.id === catId ? { ...c, visible: !c.visible } : c,
    );
    saveCategories(updated);
  };

  const handleUpdateCategoryColor = (catId: string, color: string) => {
    const updated = categories.map((c) =>
      c.id === catId ? { ...c, color } : c,
    );
    saveCategories(updated);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return;
    const newId = `cat_${Date.now()}`;
    const updated = [
      ...categories,
      {
        id: newId,
        label: newCatLabel.trim(),
        color: newCatColor,
        visible: true,
        isDefault: false,
      },
    ];
    saveCategories(updated);
    setNewCatLabel("");
  };

  const handleDeleteCategory = (catId: string) => {
    if (!confirm("이 카테고리를 삭제하시겠습니까?")) return;
    const updated = categories.filter((c) => c.id !== catId);
    saveCategories(updated);
  };

  // 선택된 날짜의 전체 일정 및 할 일 (사이드 패널용)
  const selectedDateAllEvents = visibleEvents.filter((e) => isDateInEventRange(selectedDate, e));
  const selectedDateOnlyEvents = selectedDateAllEvents.filter((e) => !e.isTodo);
  const selectedDateTodos = selectedDateAllEvents.filter((e) => e.isTodo);

  // 할 일 정렬 (미완료 상단 -> 완료 하단, 생성/시작순 유지)
  const sortedSelectedDateTodos = [...selectedDateTodos].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    const timeA = new Date(a.createdAt || a.startDate).getTime();
    const timeB = new Date(b.createdAt || b.startDate).getTime();
    return timeA - timeB;
  });

  if (!mounted) return null;

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4 text-center text-gray-800 dark:text-gray-200 gap-3">
        <Loader2 size={36} className="animate-spin text-amber-500" />
        <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">
          캘린더 데이터를 불러오는 중...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Lock size={28} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">캘린더</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              일정과 할 일을 확인하려면 로그인이 필요합니다.
            </p>
          </div>
          <button
            onClick={() => signIn()}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-3.5 px-4 rounded-xl transition-all shadow-md text-sm cursor-pointer"
          >
            로그인하기
          </button>
          <div>
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
            >
              ← 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isNaN(currentDate.getTime())) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#121212] text-gray-800 dark:text-gray-200 p-3 sm:p-6 transition-colors">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* 최상단 헤더 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] px-4 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-black shadow-xs shrink-0 select-none">
              <CalendarDays size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-black text-gray-900 dark:text-white truncate">
                  캘린더
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hidden sm:inline-block">
                  일정 & 할 일
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                기간별 일정 바(Bar)와 체크박스 할 일(Task)을 한눈에 관리하세요.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 sm:px-3 sm:py-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-xl text-gray-700 dark:text-gray-300 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
              title="카테고리 및 색상 설정"
            >
              <Settings size={16} className="text-amber-500" />
              <span className="hidden md:inline">설정</span>
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 sm:p-2.5 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-xl text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
              title="다크/라이트 모드"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] px-3 py-2 rounded-xl transition-colors font-bold text-gray-700 dark:text-gray-300"
            >
              <Home size={15} /> <span className="hidden sm:inline">메인</span>
            </Link>
          </div>
        </div>

        {/* 캘린더 컨트롤 툴바 (오늘 / 월 이동 / 등록 버튼군) */}
        <div className="bg-white dark:bg-[#1e1e1e] p-3.5 sm:p-4 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 flex flex-wrap justify-between items-center gap-3">
          {/* 좌측: 오늘 버튼 & 월 네비게이션 */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={goToday}
              className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold rounded-xl text-xs transition-colors cursor-pointer border border-amber-500/30"
            >
              오늘
            </button>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#282828] p-1 rounded-xl">
              <button
                onClick={prevMonth}
                className="p-1.5 hover:bg-white dark:hover:bg-[#383838] rounded-lg transition-colors cursor-pointer text-gray-700 dark:text-gray-300"
                title="이전 달"
              >
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white px-2 min-w-[100px] sm:min-w-[120px] text-center font-mono">
                {year}. {String(month + 1).padStart(2, "0")}
              </h2>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-white dark:hover:bg-[#383838] rounded-lg transition-colors cursor-pointer text-gray-700 dark:text-gray-300"
                title="다음 달"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* 우측: 일정 추가, 할 일 추가, 패널 토글 버튼군 */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 할 일 패널 토글 버튼 */}
            <button
              onClick={() => setShowTodoPanel(!showTodoPanel)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
                showTodoPanel
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  : "bg-gray-100 dark:bg-[#282828] border-transparent text-gray-600 dark:text-gray-400"
              }`}
              title="사이드 패널 열기/닫기"
            >
              <ListTodo size={14} />
              <span>할 일 패널</span>
            </button>

            {/* 빠른 매일 루틴 버튼 */}
            <button
              onClick={() => setIsQuickRoutineModalOpen(true)}
              className="flex items-center gap-1 px-3 py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              title="매일 루틴 일정 일괄 생성"
            >
              <Sparkles size={14} />
              <span className="hidden sm:inline">매일 루틴</span>
            </button>

            {/* 할 일 추가 버튼 */}
            <button
              onClick={() => handleOpenAddModal(undefined, "todo")}
              className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#282828] hover:bg-gray-100 dark:hover:bg-[#333] text-gray-800 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-xl font-bold text-xs transition-all shadow-2xs cursor-pointer"
            >
              <CheckSquare size={14} className="text-[#ea580c]" />
              <span>할 일 추가</span>
            </button>

            {/* 일정 추가 버튼 */}
            <button
              onClick={() => handleOpenAddModal(undefined, "event")}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-black text-xs transition-all shadow-xs cursor-pointer"
            >
              <Plus size={15} />
              <span>일정 추가</span>
            </button>
          </div>
        </div>

        {/* 카테고리 필터 바 */}
        <div className="bg-white dark:bg-[#1e1e1e] px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 overflow-x-auto text-xs">
          <div className="flex items-center gap-2 shrink-0 text-gray-500 dark:text-gray-400 font-bold text-[11px]">
            <Tag size={13} className="text-amber-500" />
            <span>카테고리 필터:</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 py-0.5">
            {categories.map((cat) => {
              const count = events.filter((e) => e.category === cat.id && !e.isTodo).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleToggleCategoryVisible(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer border shrink-0 ${
                    cat.visible
                      ? "bg-gray-100/90 dark:bg-[#2c2c2c] border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 shadow-2xs"
                      : "opacity-40 line-through bg-transparent border-dashed border-gray-300 dark:border-gray-700 text-gray-400"
                  }`}
                  title={cat.visible ? "클릭 시 숨김" : "클릭 시 표시"}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span>{cat.label}</span>
                  <span className="text-[10px] opacity-60 font-mono">({count})</span>
                  {cat.visible ? <Eye size={11} className="opacity-60" /> : <EyeOff size={11} className="opacity-60" />}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline shrink-0"
          >
            + 카테고리 관리
          </button>
        </div>

        {/* 메인 캘린더 뷰: 캘린더 그리드 + 사이드 패널 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* 캘린더 그리드 영역 */}
          <div className={`${showTodoPanel ? "lg:col-span-3" : "lg:col-span-4"} bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 overflow-hidden`}>
            {/* 요일 헤더 (일~토) */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-[#f8fafc] dark:bg-[#252526]">
              {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
                <div
                  key={day}
                  className={`py-2.5 text-center text-xs font-black select-none ${
                    idx === 0
                      ? "text-red-500"
                      : idx === 6
                      ? "text-blue-500"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 주(Week) 행 단위 그리드 및 Interval Partitioning 트랙 렌더링 */}
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-[#1e1e1e]">
              {weeksData.map((weekData) => (
                <div
                  key={`week-row-${weekData.weekIndex}`}
                  className="relative min-h-[115px] md:min-h-[135px] flex flex-col justify-between"
                >
                  {/* 1. 배경 7열 날짜 셀 그리드 */}
                  <div className="grid grid-cols-7 absolute inset-0 divide-x divide-gray-100 dark:divide-gray-800/60">
                    {weekData.days.map((day, colIdx) => {
                      const isToday = day.isToday;
                      const isSelected = selectedDate.toDateString() === day.date.toDateString();
                      const overflowCount = weekData.overflowCountPerDay[colIdx];
                      const dayTodos = visibleEvents.filter((e) => e.isTodo && isDateInEventRange(day.date, e));
                      const completedTodos = dayTodos.filter((t) => t.isCompleted).length;

                      return (
                        <div
                          key={day.dateStr}
                          onClick={() => handleDayClick(day.date)}
                          onDoubleClick={() => handleOpenAddModal(day.date, "event")}
                          className={`p-1.5 md:p-2 flex flex-col justify-between transition-colors cursor-pointer group ${
                            isSelected
                              ? "bg-amber-500/10 dark:bg-amber-500/15 ring-2 ring-inset ring-amber-500/50"
                              : isToday
                              ? "bg-amber-50/40 dark:bg-amber-950/20"
                              : day.isCurrentMonth
                              ? "bg-white dark:bg-[#1e1e1e] hover:bg-gray-50/80 dark:hover:bg-[#232323]"
                              : "bg-gray-50/40 dark:bg-[#161616] hover:bg-gray-100/60 dark:hover:bg-[#1c1c1c]"
                          }`}
                        >
                          {/* 상단: 날짜 번호 & 할 일 뱃지 */}
                          <div className="flex justify-between items-center z-10 pointer-events-none">
                            <div className="flex items-center gap-1 min-w-0 pointer-events-auto">
                              <span
                                className={`text-xs md:text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-105 shrink-0 ${
                                  isToday
                                    ? "bg-amber-500 text-black shadow-xs font-black"
                                    : !day.isCurrentMonth
                                    ? "text-gray-300 dark:text-gray-600"
                                    : colIdx === 0
                                    ? "text-red-500"
                                    : colIdx === 6
                                    ? "text-blue-500"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {day.dayNumber}
                              </span>
                              {isSelected && (
                                <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 hidden sm:inline truncate">
                                  (추가)
                                </span>
                              )}
                            </div>

                            {/* 할 일 완료율 뱃지 */}
                            {dayTodos.length > 0 && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(day.date);
                                  setShowTodoPanel(true);
                                  setSidePanelFilter("todos");
                                }}
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md flex items-center gap-0.5 cursor-pointer shadow-2xs pointer-events-auto ${
                                  completedTodos === dayTodos.length
                                    ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                                    : "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300"
                                }`}
                                title="이 날의 할 일 보기"
                              >
                                <CheckSquare size={10} />
                                <span>
                                  {completedTodos}/{dayTodos.length}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* 하단: +N개 더보기 버튼 */}
                          <div className="z-20 pointer-events-auto pt-1">
                            {overflowCount > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const allDayItems = visibleEvents.filter((ev) => isDateInEventRange(day.date, ev));
                                  const allEvts = allDayItems.filter((ev) => !ev.isTodo);
                                  const allTds = allDayItems.filter((ev) => ev.isTodo);
                                  setMoreEventsModal({
                                    date: day.date,
                                    events: allEvts,
                                    todos: allTds,
                                  });
                                }}
                                className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-bold cursor-pointer block truncate text-left"
                              >
                                +{overflowCount}개 더보기
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 2. 주간 트랙 레이어 (Interval Partitioning 된 일정 바 & 할 일) */}
                  <div className="relative pt-7 pb-6 pointer-events-none z-10">
                    <div className="grid grid-cols-7 auto-rows-[22px] gap-y-1">
                      {weekData.segments
                        .filter((seg) => seg.track < MAX_VISIBLE_TRACKS)
                        .map((seg, sIdx) => {
                          const evt = seg.event;
                          const cat = getCategory(evt.category);
                          const rawColor = evt.color || cat.color || "#f59e0b";
                          const barBg = hexToRgba(rawColor, 0.82);

                          // 멀티데이 연속 바 스타일링 (주 경계 분할 및 모서리 곡률 처리)
                          let cornerClasses = "rounded-md";
                          let marginClasses = "mx-0.5";
                          let borderClasses = "border border-white/25 dark:border-white/15";

                          if (seg.isMultiDay) {
                            if (seg.isFirstSegment && seg.isLastSegment) {
                              cornerClasses = "rounded-md";
                              marginClasses = "mx-0.5";
                              borderClasses = "border border-white/25 dark:border-white/15";
                            } else if (seg.isFirstSegment) {
                              cornerClasses = "rounded-l-md rounded-r-none";
                              marginClasses = "ml-0.5 mr-0";
                              borderClasses = "border-y border-l border-r-0 border-white/25 dark:border-white/15";
                            } else if (!seg.isFirstSegment && !seg.isLastSegment) {
                              cornerClasses = "rounded-none";
                              marginClasses = "mx-0";
                              borderClasses = "border-y border-x-0 border-white/25 dark:border-white/15";
                            } else if (seg.isLastSegment) {
                              cornerClasses = "rounded-l-none rounded-r-md";
                              marginClasses = "ml-0 mr-0.5";
                              borderClasses = "border-y border-r border-l-0 border-white/25 dark:border-white/15";
                            }
                          }

                          return (
                            <div
                              key={`${evt._id || evt.title}-${sIdx}`}
                              style={{
                                gridColumn: `${seg.startCol + 1} / ${seg.endCol + 2}`,
                                gridRow: `${seg.track + 1}`,
                              }}
                              className={`pointer-events-auto min-w-0 ${marginClasses}`}
                            >
                              {seg.isTodo ? (
                                /* 할 일 체크박스 텍스트 */
                                <div
                                  onClick={(e) => handleEventClick(e, evt)}
                                  className={`h-[22px] flex items-center gap-1.5 px-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#282828] cursor-pointer transition-colors group/task min-w-0 border border-transparent hover:border-gray-300 dark:hover:border-gray-700 bg-white/70 dark:bg-[#202020]/70 backdrop-blur-xs ${
                                    evt.isCompleted ? "opacity-50" : ""
                                  }`}
                                  title={`${evt.title} (${evt.isCompleted ? "완료됨" : "미완료"})`}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleTodo(evt);
                                    }}
                                    className="text-gray-400 hover:text-amber-500 transition-colors shrink-0 cursor-pointer"
                                  >
                                    {evt.isCompleted ? (
                                      <CheckCircle2 size={13} className="text-emerald-500" />
                                    ) : (
                                      <Square size={13} />
                                    )}
                                  </button>
                                  <span
                                    className={`text-[11px] truncate select-none ${
                                      evt.isCompleted
                                        ? "line-through text-gray-400"
                                        : "text-gray-800 dark:text-gray-200 font-medium"
                                    }`}
                                  >
                                    {evt.title}
                                  </span>
                                </div>
                              ) : (
                                /* 일정 연속 바 */
                                <div
                                  onClick={(e) => handleEventClick(e, evt)}
                                  style={{ backgroundColor: barBg }}
                                  className={`h-[22px] text-[11px] font-semibold text-white px-2 cursor-pointer transition-all flex items-center shadow-2xs hover:brightness-110 relative overflow-hidden backdrop-blur-xs ${borderClasses} ${cornerClasses}`}
                                  title={`${evt.title} (${
                                    seg.isMultiDay
                                      ? `${formatEventDate(evt.startDate)} ~ ${formatEventDate(evt.endDate)}`
                                      : evt.allDay
                                      ? "종일"
                                      : formatEventTime(evt.startDate)
                                  })`}
                                >
                                  {seg.isMultiDay ? (
                                    <div className="flex items-center gap-1 min-w-0 w-full">
                                      <span className="truncate font-semibold text-[11px] drop-shadow-xs">
                                        {seg.isFirstSegment ? evt.title : `↳ ${evt.title} (이어서)`}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 min-w-0 w-full">
                                      {!evt.allDay ? (
                                        <span className="text-[10px] font-mono opacity-90 shrink-0 font-normal">
                                          {formatEventTime(evt.startDate)}
                                        </span>
                                      ) : (
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/90 shrink-0" />
                                      )}
                                      <span className="truncate font-semibold text-[11px] drop-shadow-xs">
                                        {evt.title}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 선택 날짜 사이드 패널 */}
          {showTodoPanel && (
            <div className="lg:col-span-1 bg-white dark:bg-[#1e1e1e] p-4 sm:p-5 rounded-2xl shadow-xs border border-gray-200 dark:border-gray-800 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={16} className="text-amber-500" />
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-white truncate">
                      {formatEventDate(toInputDate(selectedDate))}
                    </h3>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    일정 {selectedDateOnlyEvents.length}개 · 할 일 {selectedDateTodos.length}개
                  </p>
                </div>
                <button
                  onClick={() => setShowTodoPanel(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-lg text-gray-400 cursor-pointer"
                  title="패널 닫기"
                >
                  <X size={16} />
                </button>
              </div>

              {/* 사이드 패널 탭 필터: 전체 | 일정 | 할 일 */}
              <div className="flex rounded-xl bg-gray-100 dark:bg-[#252526] p-1 gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSidePanelFilter("all")}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                    sidePanelFilter === "all"
                      ? "bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white shadow-2xs font-black"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  전체 ({selectedDateAllEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidePanelFilter("events")}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                    sidePanelFilter === "events"
                      ? "bg-white dark:bg-[#1e1e1e] text-amber-600 dark:text-amber-400 shadow-2xs font-black"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  일정 ({selectedDateOnlyEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSidePanelFilter("todos")}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                    sidePanelFilter === "todos"
                      ? "bg-white dark:bg-[#1e1e1e] text-[#ea580c] shadow-2xs font-black"
                      : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                  }`}
                >
                  할 일 ({selectedDateTodos.length})
                </button>
              </div>

              {/* 빠른 할 일 입력 폼 */}
              <form onSubmit={handleQuickAddTodo} className="space-y-2">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newTodoInput}
                    onChange={(e) => setNewTodoInput(e.target.value)}
                    placeholder="오늘 꼭 해야 할 일 입력..."
                    className="flex-1 bg-gray-50 dark:bg-[#282828] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-colors shadow-2xs"
                  >
                    추가
                  </button>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isTodoDailyRoutine}
                    onChange={(e) => setIsTodoDailyRoutine(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span>7일간 반복 등록</span>
                </label>
              </form>

              {/* 목록 표시 영역 */}
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {/* 일정 섹션 */}
                {(sidePanelFilter === "all" || sidePanelFilter === "events") && (
                  <div className="space-y-1.5">
                    {sidePanelFilter === "all" && selectedDateOnlyEvents.length > 0 && (
                      <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock size={12} className="text-amber-500" />
                        <span>일정 ({selectedDateOnlyEvents.length})</span>
                      </p>
                    )}
                    {selectedDateOnlyEvents.map((evt) => {
                      const cat = getCategory(evt.category);
                      const barColor = evt.color || cat.color || "#f59e0b";
                      return (
                        <div
                          key={evt._id}
                          onClick={(e) => handleEventClick(e, evt)}
                          className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-[#252526] hover:bg-gray-50 dark:hover:bg-[#2c2c2d] cursor-pointer transition-all flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: barColor }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {evt.title}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                {evt.allDay ? "하루 종일" : formatEventTime(evt.startDate)} · {cat.label}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400 font-bold shrink-0">
                            상세 →
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 할 일 섹션 */}
                {(sidePanelFilter === "all" || sidePanelFilter === "todos") && (
                  <div className="space-y-1.5">
                    {sidePanelFilter === "all" && sortedSelectedDateTodos.length > 0 && (
                      <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 pt-1">
                        <CheckSquare size={12} className="text-[#ea580c]" />
                        <span>할 일 ({sortedSelectedDateTodos.length})</span>
                      </p>
                    )}
                    {sortedSelectedDateTodos.map((todo) => (
                      <div
                        key={todo._id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          todo.isCompleted
                            ? "bg-gray-50/60 dark:bg-[#1a1a1a] border-gray-200/60 dark:border-gray-800 text-gray-400"
                            : "bg-white dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 shadow-2xs"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTodo(todo)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          {todo.isCompleted ? (
                            <CheckSquare size={16} className="text-emerald-500 shrink-0" />
                          ) : (
                            <Square size={16} className="text-gray-400 hover:text-amber-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p
                              className={`text-xs truncate ${
                                todo.isCompleted ? "line-through text-gray-400 dark:text-gray-500 opacity-60" : "font-medium"
                              }`}
                            >
                              {todo.title}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {getCategory(todo.category).label}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleEventClick(e, todo)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 cursor-pointer"
                            title="수정"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => todo._id && handleDeleteTodo(todo._id)}
                            className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 데이터가 없을 때 */}
                {selectedDateAllEvents.length === 0 && (
                  <div className="py-8 text-center text-gray-400 space-y-1">
                    <CalendarIcon size={24} className="mx-auto opacity-30 mb-1" />
                    <p className="text-xs font-bold">등록된 일정이나 할 일이 없습니다.</p>
                    <p className="text-[11px] text-gray-400">위 입력창에서 바로 추가해보세요!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 더보기 모달 창 (일정 및 할 일 분리 뷰) */}
        {moreEventsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 relative space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <CalendarDays size={18} className="text-amber-500" />
                    <span>{formatEventDate(toInputDate(moreEventsModal.date))}</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    전체 {moreEventsModal.events.length + moreEventsModal.todos.length}개 (일정 {moreEventsModal.events.length}개 · 할 일 {moreEventsModal.todos.length}개)
                  </p>
                </div>
                <button
                  onClick={() => setMoreEventsModal(null)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-full text-gray-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 상단 빠른 추가 액션 바 */}
              <div className="flex gap-2 pb-1">
                <button
                  type="button"
                  onClick={() => {
                    const d = moreEventsModal.date;
                    setMoreEventsModal(null);
                    handleOpenAddModal(d, "event");
                  }}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1 shadow-xs"
                >
                  <Plus size={14} /> + 일정 추가
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = moreEventsModal.date;
                    setMoreEventsModal(null);
                    handleOpenAddModal(d, "todo");
                  }}
                  className="flex-1 py-2 bg-gray-100 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#333] text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1 shadow-2xs"
                >
                  <CheckSquare size={14} className="text-[#ea580c]" /> + 할 일 추가
                </button>
              </div>

              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {/* 섹션 1: 일정(Events) 목록 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                    <Clock size={13} className="text-amber-500" />
                    <span>일정 (총 {moreEventsModal.events.length}개)</span>
                  </h4>
                  {moreEventsModal.events.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">등록된 일정이 없습니다.</p>
                  ) : (
                    moreEventsModal.events.map((evt) => {
                      const cat = getCategory(evt.category);
                      const barColor = evt.color || cat.color || "#f59e0b";
                      return (
                        <div
                          key={evt._id}
                          onClick={(e) => {
                            setMoreEventsModal(null);
                            handleEventClick(e, evt);
                          }}
                          className="p-3 bg-gray-50 dark:bg-[#252526] hover:bg-amber-500/10 dark:hover:bg-amber-500/20 rounded-xl border border-gray-200 dark:border-gray-700/80 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: barColor }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                                {evt.title}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {cat.label} · {evt.allDay ? "하루 종일" : `${formatEventTime(evt.startDate)} ~ ${formatEventTime(evt.endDate || evt.startDate)}`}
                                {" · "}
                                {getDurationLabel(evt.startDate, evt.endDate, evt.allDay)}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-bold shrink-0">
                            상세 →
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 섹션 2: 할 일(Tasks) 목록 */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-800 pb-1.5">
                    <CheckSquare size={13} className="text-[#ea580c]" />
                    <span>할 일 (총 {moreEventsModal.todos.length}개)</span>
                  </h4>
                  {moreEventsModal.todos.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">등록된 할 일이 없습니다.</p>
                  ) : (
                    moreEventsModal.todos.map((task) => (
                      <div
                        key={task._id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          task.isCompleted
                            ? "bg-gray-50/60 dark:bg-[#1a1a1a] border-gray-200/60 dark:border-gray-800 text-gray-400"
                            : "bg-white dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white shadow-2xs"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTodo(task)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          {task.isCompleted ? (
                            <CheckSquare size={17} className="text-emerald-500 shrink-0" />
                          ) : (
                            <Square size={17} className="text-gray-400 hover:text-amber-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p
                              className={`text-xs sm:text-sm font-semibold truncate ${
                                task.isCompleted ? "line-through text-gray-400 dark:text-gray-500 opacity-60" : ""
                              }`}
                            >
                              {task.title}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {getCategory(task.category).label}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              setMoreEventsModal(null);
                              handleEventClick(e, task);
                            }}
                            className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-bold px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#333]"
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => task._id && handleDeleteTodo(task._id)}
                            className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setMoreEventsModal(null)}
                  className="px-4 py-2 bg-gray-200 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 카테고리 색상 수정 및 표시 여부 설정 모달 */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-5 relative">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings size={20} className="text-amber-500" />
                  <span>카테고리 표시 & 색상 설정</span>
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-full text-gray-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    등록된 카테고리 ({categories.length}개)
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => saveCategories(categories.map((c) => ({ ...c, visible: true })))}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      모두 표시
                    </button>
                    <span className="text-gray-300">·</span>
                    <button
                      type="button"
                      onClick={() => saveCategories(categories.map((c) => ({ ...c, visible: false })))}
                      className="text-[11px] font-bold text-gray-500 hover:underline cursor-pointer"
                    >
                      모두 숨김
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const count = events.filter((e) => e.category === cat.id && !e.isTodo).length;
                    return (
                      <div
                        key={cat.id}
                        className="p-3 bg-gray-50 dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-700/80 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="color"
                            value={cat.color}
                            onChange={(e) => handleUpdateCategoryColor(cat.id, e.target.value)}
                            className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent shrink-0"
                            title="색상 변경"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                              {cat.label}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono">
                              일정 {count}개
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryVisible(cat.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                              cat.visible
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                                : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-400"
                            }`}
                          >
                            {cat.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                            <span>{cat.visible ? "표시" : "숨김"}</span>
                          </button>

                          {!cat.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              title="카테고리 삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 새 카테고리 추가 폼 */}
              <form onSubmit={handleAddCategory} className="p-3.5 bg-gray-50 dark:bg-[#252526] rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  + 새 카테고리 직접 추가
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="예: 프로젝트, 운동, 자격증..."
                    className="flex-1 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl text-xs cursor-pointer shrink-0"
                  >
                    추가
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                    팔레트:
                  </span>
                  {ONEQUIZ_PALETTE.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setNewCatColor(p.hex)}
                      className={`w-5 h-5 rounded-full transition-transform shrink-0 ${
                        newCatColor === p.hex ? "scale-125 ring-2 ring-amber-500" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-5 h-5 rounded-full p-0 border-0 bg-transparent cursor-pointer shrink-0"
                    title="기타 색상"
                  />
                </div>
              </form>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-[#2d2d2d] text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold cursor-pointer"
                >
                  완료
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 루틴 일정 등록 모달 */}
        {isQuickRoutineModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-purple-500" />
                  <span>루틴 일정 등록</span>
                </h3>
                <button
                  onClick={() => setIsQuickRoutineModalOpen(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] rounded-full text-gray-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateQuickRoutine} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    루틴 제목
                  </label>
                  <input
                    type="text"
                    placeholder="예: 기상 후 알고리즘 1문제, CS 공부 30분"
                    value={routineTitle}
                    onChange={(e) => setRoutineTitle(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      반복 기간
                    </label>
                    <select
                      value={routineDays}
                      onChange={(e) => setRoutineDays(Number(e.target.value))}
                      className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white"
                    >
                      <option value={7}>앞으로 7일간 (1주)</option>
                      <option value={14}>앞으로 14일간 (2주)</option>
                      <option value={30}>앞으로 30일간 (1달)</option>
                      <option value={60}>앞으로 60일간 (2달)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      카테고리
                    </label>
                    <select
                      value={routineCategory}
                      onChange={(e) => setRoutineCategory(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsQuickRoutineModalOpen(false)}
                    className="flex-1 py-2 bg-gray-200 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                  >
                    일괄 생성하기
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 일정 및 할 일 통합 모달 */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in overflow-y-auto">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-lg md:max-w-xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-7 relative my-auto">
              {/* 헤더: 타이틀 & 닫기 버튼 */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-2">
                  {modalTab === "event" ? (
                    <CalendarDays size={20} className="text-amber-500" />
                  ) : (
                    <CheckSquare size={20} className="text-[#ea580c]" />
                  )}
                  <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                    {selectedEvent && !isEditing
                      ? modalTab === "event"
                        ? "일정 상세 정보"
                        : "할 일 상세 정보"
                      : selectedEvent
                      ? modalTab === "event"
                        ? "일정 수정"
                        : "할 일 수정"
                      : modalTab === "event"
                      ? "새로운 일정 추가"
                      : "새로운 할 일 추가"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 sm:p-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-full transition-colors cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label="닫기"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 일정 vs 할 일 탭 전환 */}
              {!selectedEvent && (
                <div className="flex rounded-xl bg-gray-100 dark:bg-[#252526] p-1 gap-1 mb-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setModalTab("event");
                      setFormData({
                        ...formData,
                        isTodo: false,
                        color: categories[0]?.color || "#f59e0b",
                      });
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      modalTab === "event"
                        ? "bg-white dark:bg-[#1e1e1e] text-amber-600 dark:text-amber-400 shadow-2xs font-black"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    <CalendarDays size={15} />
                    <span>일정</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalTab("todo");
                      setFormData({
                        ...formData,
                        isTodo: true,
                        category: "reminder",
                        color: "#ea580c",
                      });
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      modalTab === "todo"
                        ? "bg-white dark:bg-[#1e1e1e] text-[#ea580c] shadow-2xs font-black"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    <CheckSquare size={15} />
                    <span>할 일</span>
                  </button>
                </div>
              )}

              {selectedEvent && !isEditing ? (
                /* 상세 보기 모드 */
                <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className="text-[10px] px-2.5 py-0.5 rounded-md font-bold text-white shadow-2xs"
                        style={{
                          backgroundColor:
                            selectedEvent.color || getCategory(selectedEvent.category).color,
                        }}
                      >
                        {getCategory(selectedEvent.category).label}
                      </span>
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 rounded-md font-bold">
                        {selectedEvent.isTodo ? "할 일(Task)" : selectedEvent.allDay ? "하루 종일" : "시간제 일정"}
                      </span>
                      {!selectedEvent.isTodo && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 rounded-md font-bold">
                          {getDurationLabel(
                            selectedEvent.startDate,
                            selectedEvent.endDate,
                            selectedEvent.allDay,
                          )}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white leading-snug">
                      {selectedEvent.title}
                    </h3>
                  </div>

                  {/* 할 일 완료 토글 버튼 (할 일인 경우) */}
                  {selectedEvent.isTodo && (
                    <div
                      onClick={() => handleToggleTodo(selectedEvent)}
                      className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors ${
                        selectedEvent.isCompleted
                          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                          : "bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {selectedEvent.isCompleted ? (
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                        <span className="text-xs font-bold">
                          {selectedEvent.isCompleted ? "완료된 할 일입니다" : "아직 완료되지 않은 할 일입니다"}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        클릭하여 상태 변경
                      </span>
                    </div>
                  )}

                  {/* 일시 및 기간 카드 */}
                  <div className="bg-gray-50 dark:bg-[#252526] p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60 space-y-3">
                    <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1.5 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400 font-semibold">
                            {selectedEvent.isTodo ? "수행 날짜" : "시작"}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                            {formatEventDate(selectedEvent.startDate)}
                            {!selectedEvent.allDay && !selectedEvent.isTodo && ` ${formatEventTime(selectedEvent.startDate)}`}
                          </span>
                        </div>
                        {!selectedEvent.isTodo && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 font-semibold">종료</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-sm">
                              {formatEventDate(selectedEvent.endDate || selectedEvent.startDate)}
                              {!selectedEvent.allDay &&
                                ` ${formatEventTime(selectedEvent.endDate || selectedEvent.startDate)}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {selectedEvent.description && (
                      <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700/60 pt-3">
                        <AlignLeft size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">{selectedEvent.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={handleDeleteEvent}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-colors text-xs sm:text-sm font-bold cursor-pointer"
                    >
                      <Trash2 size={16} /> 삭제
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-xl transition-colors text-xs sm:text-sm shadow-xs cursor-pointer"
                    >
                      <Edit3 size={16} /> 수정하기
                    </button>
                  </div>
                </div>
              ) : (
                /* 일정 및 할 일 등록/수정 폼 */
                <form onSubmit={handleSaveEvent} className="flex flex-col flex-1 min-h-0">
                  <div className="space-y-3.5 overflow-y-auto pr-1 flex-1 py-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        {modalTab === "todo" ? "할 일 내용" : "일정 제목"}
                      </label>
                      <input
                        type="text"
                        placeholder={
                          modalTab === "todo"
                            ? "예: 영어 단어 30개 암기, 정보처리기사 기출 1회 풀기"
                            : "예: 팀 스프린트 회의, 자격증 실기 시험"
                        }
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full min-w-0 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    {/* 카테고리 & 하루 종일 / 완료 여부 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          카테고리
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => {
                            const newCat = e.target.value;
                            setFormData({
                              ...formData,
                              category: newCat,
                              color: getCategory(newCat).color,
                            });
                          }}
                          className="w-full min-w-0 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white cursor-pointer"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end min-w-0">
                        {modalTab === "event" ? (
                          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 w-full hover:bg-gray-100 dark:hover:bg-[#333333] transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.allDay}
                              onChange={(e) => {
                                const isAll = e.target.checked;
                                const vals = parseToInputValues(
                                  formData.startDate,
                                  formData.endDate,
                                  isAll,
                                );
                                setFormData({
                                  ...formData,
                                  allDay: isAll,
                                  startDate: vals.startDate,
                                  endDate: vals.endDate,
                                });
                              }}
                              className="w-4 h-4 text-amber-500 rounded focus:ring-amber-500 cursor-pointer shrink-0"
                            />
                            <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 select-none">
                              하루 종일
                            </span>
                          </label>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 w-full hover:bg-gray-100 dark:hover:bg-[#333333] transition-colors">
                            <input
                              type="checkbox"
                              checked={!!formData.isCompleted}
                              onChange={(e) =>
                                setFormData({ ...formData, isCompleted: e.target.checked })
                              }
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer shrink-0"
                            />
                            <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 select-none">
                              이미 완료된 할 일
                            </span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* 컬러 칩 팔레트 */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                          {modalTab === "todo" ? "할 일 라벨 색상" : "일정 바(Bar) 색상"}
                        </label>
                        <span className="text-[10px] text-gray-400">기본 팔레트</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {ONEQUIZ_PALETTE.map((p) => (
                          <button
                            key={p.hex}
                            type="button"
                            onClick={() => setFormData({ ...formData, color: p.hex })}
                            className={`w-6 h-6 rounded-full transition-transform shrink-0 cursor-pointer ${
                              formData.color === p.hex
                                ? "scale-110 ring-2 ring-amber-500 ring-offset-2 ring-offset-white dark:ring-offset-[#1e1e1e]"
                                : "hover:scale-110 opacity-90 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: p.hex }}
                            title={p.name}
                          />
                        ))}
                        <label
                          className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 cursor-pointer shrink-0 flex items-center justify-center hover:scale-105 transition-transform overflow-hidden relative shadow-2xs"
                          title="직접 색상 선택"
                        >
                          <input
                            type="color"
                            value={formData.color || getCategory(formData.category).color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="w-8 h-8 -m-1 p-0 border-0 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>

                    {/* 시작/종료 일시 (모바일 반응형 레이아웃) */}
                    {modalTab === "event" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="min-w-0">
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                            {formData.allDay ? "시작일" : "시작 일시"}
                          </label>
                          <input
                            type={formData.allDay ? "date" : "datetime-local"}
                            value={formData.startDate}
                            onChange={(e) => {
                              const newStart = e.target.value;
                              let newEnd = formData.endDate;
                              if (newEnd && newEnd < newStart) {
                                newEnd = newStart;
                              }
                              setFormData({ ...formData, startDate: newStart, endDate: newEnd });
                            }}
                            className="w-full min-w-0 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                            {formData.allDay ? "종료일" : "종료 일시"}
                          </label>
                          <input
                            type={formData.allDay ? "date" : "datetime-local"}
                            value={formData.endDate}
                            min={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className="w-full min-w-0 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          할 일 마감 날짜
                        </label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              startDate: e.target.value,
                              endDate: e.target.value,
                            })
                          }
                          className="w-full min-w-0 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#ea580c] text-gray-900 dark:text-white"
                          required
                        />
                      </div>
                    )}

                    {/* 반복 설정 (일정 전용) */}
                    {modalTab === "event" && !selectedEvent && (
                      <div className="p-3 bg-gray-50 dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-700/80 space-y-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <Repeat size={14} className="text-amber-500" />
                          <span>반복 일정 설정 (매일 / 매주 / 매월)</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={recurrenceType}
                            onChange={(e) =>
                              setRecurrenceType(
                                e.target.value as "none" | "daily" | "weekly" | "monthly",
                              )
                            }
                            className="w-full min-w-0 bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-xs text-gray-900 dark:text-white cursor-pointer"
                          >
                            <option value="none">반복 없음</option>
                            <option value="daily">매일 반복</option>
                            <option value="weekly">매주 반복</option>
                            <option value="monthly">매달 반복</option>
                          </select>

                          {recurrenceType !== "none" && (
                            <select
                              value={recurrenceCount}
                              onChange={(e) => setRecurrenceCount(Number(e.target.value))}
                              className="w-full min-w-0 bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-2 text-xs text-gray-900 dark:text-white cursor-pointer"
                            >
                              {recurrenceType === "daily" && (
                                <>
                                  <option value={7}>7일간 매일 (1주)</option>
                                  <option value={14}>14일간 매일 (2주)</option>
                                  <option value={30}>30일간 매일 (1달)</option>
                                  <option value={60}>60일간 매일 (2달)</option>
                                </>
                              )}
                              {recurrenceType === "weekly" && (
                                <>
                                  <option value={4}>4주간 매주 (1달)</option>
                                  <option value={8}>8주간 매주 (2달)</option>
                                  <option value={12}>12주간 매주 (3달)</option>
                                </>
                              )}
                              {recurrenceType === "monthly" && (
                                <>
                                  <option value={3}>3개월간 매월</option>
                                  <option value={6}>6개월간 매월</option>
                                  <option value={12}>12개월간 매월 (1년)</option>
                                </>
                              )}
                            </select>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 매일 반복 루틴 (할 일 신규 등록 시) */}
                    {modalTab === "todo" && !selectedEvent && (
                      <div className="p-3 bg-gray-50 dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-700/80">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={isTodoDailyRoutine}
                            onChange={(e) => setIsTodoDailyRoutine(e.target.checked)}
                            className="w-4 h-4 text-[#ea580c] rounded focus:ring-[#ea580c] cursor-pointer"
                          />
                          <span>앞으로 7일간 매일 할 일로 자동 등록</span>
                        </label>
                      </div>
                    )}

                    {/* 기간 미리보기 안내 배너 */}
                    {modalTab === "event" && formData.startDate && formData.endDate && (
                      <div className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-2 rounded-xl flex items-center justify-between border border-amber-500/20">
                        <span>⏳ 일정 총 기간</span>
                        <span className="font-extrabold">
                          {getDurationLabel(formData.startDate, formData.endDate, formData.allDay)}
                        </span>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        메모 / 설명
                      </label>
                      <textarea
                        rows={2}
                        placeholder="상세한 메모나 체크포인트를 남겨주세요."
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        className="w-full min-w-0 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        selectedEvent ? setIsEditing(false) : setIsModalOpen(false)
                      }
                      className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-[#2d2d2d] dark:hover:bg-[#383838] text-gray-700 dark:text-gray-200 rounded-xl transition-colors text-xs sm:text-sm font-bold cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 py-2.5 rounded-xl transition-colors text-xs sm:text-sm font-black shadow-xs cursor-pointer ${
                        modalTab === "todo"
                          ? "bg-[#ea580c] hover:bg-[#d94e07] text-white"
                          : "bg-amber-500 hover:bg-amber-600 text-black"
                      }`}
                    >
                      저장하기
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center text-gray-400">
          <Loader2 size={36} className="animate-spin text-amber-500" />
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
