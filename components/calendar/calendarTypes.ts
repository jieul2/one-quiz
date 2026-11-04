export interface CalendarEvent {
  _id?: string;
  title: string;
  description?: string;
  startDate: string; // "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
  endDate: string;   // "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"
  allDay: boolean;
  category?: string;
  color?: string;
  authorEmail?: string;
  isTodo?: boolean;
  isCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarCategory {
  id: string;
  label: string;
  color: string;
  textColor?: string;
}

// 사진 2 스타일의 은은하고 세련된 웜 앰버/코퍼/파스텔 카테고리 팔레트
export const DEFAULT_CATEGORIES: CalendarCategory[] = [
  { id: "work", label: "업무/학습", color: "#d97706" }, // 웜 앰버/코퍼 (사진2 스타일)
  { id: "meeting", label: "회의/스터디", color: "#0284c7" }, // 차분한 스카이블루
  { id: "personal", label: "개인 일정", color: "#10b981" }, // 에메랄드
  { id: "reminder", label: "할 일/체크", color: "#f43f5e" }, // 로즈
  { id: "project", label: "프로젝트", color: "#8b5cf6" }, // 바이올렛
];

// 사진 2의 슬림 바 및 연한 세미투명 틴트 색상 스타일 헬퍼
export function getEventColorStyles(colorHex?: string, isDark: boolean = true) {
  const hex = (colorHex || "#d97706").toLowerCase();

  // 1. 웜 앰버 / 코퍼 (사진2 기준 메인 색상)
  if (
    hex === "#d97706" ||
    hex === "#b45309" ||
    hex === "#f59e0b" ||
    hex === "#a35c3b" ||
    hex.includes("amber") ||
    hex.includes("orange")
  ) {
    return {
      bg: isDark ? "bg-[#38231c]" : "bg-amber-100/80",
      border: isDark ? "border-[#85523d]" : "border-amber-300",
      text: isDark ? "text-[#f1b29a]" : "text-amber-900",
      dot: "bg-amber-500",
      bgRgba: isDark ? "rgba(133, 82, 61, 0.28)" : "rgba(245, 158, 11, 0.15)",
      borderRgba: isDark ? "rgba(133, 82, 61, 0.6)" : "rgba(245, 158, 11, 0.4)",
      textColor: isDark ? "#f1b29a" : "#92400e",
      dotColor: "#f59e0b",
    };
  }

  // 2. 블루 / 스카이
  if (hex === "#0284c7" || hex === "#3b82f6" || hex.includes("blue") || hex.includes("sky")) {
    return {
      bg: isDark ? "bg-[#182838]" : "bg-sky-100/80",
      border: isDark ? "border-[#2b567d]" : "border-sky-300",
      text: isDark ? "text-[#93c5fd]" : "text-sky-900",
      dot: "bg-sky-400",
      bgRgba: isDark ? "rgba(30, 64, 112, 0.28)" : "rgba(56, 189, 248, 0.15)",
      borderRgba: isDark ? "rgba(43, 86, 125, 0.6)" : "rgba(56, 189, 248, 0.4)",
      textColor: isDark ? "#93c5fd" : "#0369a1",
      dotColor: "#0284c7",
    };
  }

  // 3. 에메랄드 / 그린
  if (hex === "#10b981" || hex === "#059669" || hex.includes("green") || hex.includes("emerald")) {
    return {
      bg: isDark ? "bg-[#142d24]" : "bg-emerald-100/80",
      border: isDark ? "border-[#27644d]" : "border-emerald-300",
      text: isDark ? "text-[#86efac]" : "text-emerald-900",
      dot: "bg-emerald-400",
      bgRgba: isDark ? "rgba(20, 65, 48, 0.28)" : "rgba(16, 185, 129, 0.15)",
      borderRgba: isDark ? "rgba(39, 100, 77, 0.6)" : "rgba(16, 185, 129, 0.4)",
      textColor: isDark ? "#86efac" : "#065f46",
      dotColor: "#10b981",
    };
  }

  // 4. 로즈 / 레드
  if (hex === "#f43f5e" || hex === "#ef4444" || hex.includes("red") || hex.includes("rose")) {
    return {
      bg: isDark ? "bg-[#33171e]" : "bg-rose-100/80",
      border: isDark ? "border-[#773343]" : "border-rose-300",
      text: isDark ? "text-[#fda4af]" : "text-rose-900",
      dot: "bg-rose-400",
      bgRgba: isDark ? "rgba(85, 25, 38, 0.28)" : "rgba(244, 63, 94, 0.15)",
      borderRgba: isDark ? "rgba(119, 51, 67, 0.6)" : "rgba(244, 63, 94, 0.4)",
      textColor: isDark ? "#fda4af" : "#9f1239",
      dotColor: "#f43f5e",
    };
  }

  // 5. 바이올렛 / 퍼플
  if (hex === "#8b5cf6" || hex === "#7c3aed" || hex.includes("purple") || hex.includes("violet")) {
    return {
      bg: isDark ? "bg-[#281b38]" : "bg-purple-100/80",
      border: isDark ? "border-[#5c3e80]" : "border-purple-300",
      text: isDark ? "text-[#d8b4fe]" : "text-purple-900",
      dot: "bg-purple-400",
      bgRgba: isDark ? "rgba(65, 35, 95, 0.28)" : "rgba(139, 92, 246, 0.15)",
      borderRgba: isDark ? "rgba(92, 62, 128, 0.6)" : "rgba(139, 92, 246, 0.4)",
      textColor: isDark ? "#d8b4fe" : "#581c87",
      dotColor: "#8b5cf6",
    };
  }

  // 기본 fallback: 테마 primary 기반
  return {
    bg: isDark ? "bg-[#38231c]" : "bg-amber-100/80",
    border: isDark ? "border-[#85523d]" : "border-amber-300",
    text: isDark ? "text-[#f1b29a]" : "text-amber-900",
    dot: "bg-amber-500",
    bgRgba: isDark ? "rgba(133, 82, 61, 0.28)" : "rgba(245, 158, 11, 0.15)",
    borderRgba: isDark ? "rgba(133, 82, 61, 0.6)" : "rgba(245, 158, 11, 0.4)",
    textColor: isDark ? "#f1b29a" : "#92400e",
    dotColor: "#f59e0b",
  };
}

// 날짜 포맷팅 헬퍼 ("YYYY-MM-DD")
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 문자열 날짜를 Date로 파싱 (자정 기준)
export function parseDateOnly(str: string): Date {
  const parts = str.slice(0, 10).split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// 두 날짜 사이의 일수 차이 계산
export function getDaysDiff(startStr: string, endStr: string): number {
  const start = parseDateOnly(startStr);
  const end = parseDateOnly(endStr);
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// 사진2 표준: 월요일 시작 인덱스 (0: 월, 1: 화, 2: 수, 3: 목, 4: 금, 5: 토, 6: 일)
export function getMondayBasedDayOfWeek(date: Date): number {
  const d = date.getDay(); // 0: 일, 1: 월 ... 6: 토
  return d === 0 ? 6 : d - 1;
}
