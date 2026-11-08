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

// 🌟 모던하고 세련된 캘린더 바 & 틴트 색상 스타일 헬퍼 (구글 캘린더 / 노션 캘린더 스타일)
export function getEventColorStyles(colorHex?: string, isDark: boolean = true) {
  const hex = (colorHex || "#d97706").toLowerCase();

  // 1. 웜 앰버 / 코퍼 / 오렌지 (기본 메인 색상)
  if (
    hex === "#d97706" ||
    hex === "#b45309" ||
    hex === "#f59e0b" ||
    hex === "#a35c3b" ||
    hex.includes("amber") ||
    hex.includes("orange")
  ) {
    return {
      bg: isDark ? "bg-amber-950/40" : "bg-amber-50/95",
      border: isDark ? "border-amber-500/40" : "border-amber-300/80",
      text: isDark ? "text-amber-100" : "text-amber-900",
      dot: isDark ? "bg-amber-400" : "bg-amber-500",
      bgRgba: isDark ? "rgba(245, 158, 11, 0.18)" : "rgba(254, 243, 199, 0.95)",
      borderRgba: isDark ? "rgba(251, 191, 36, 0.4)" : "rgba(245, 158, 11, 0.35)",
      textColor: isDark ? "#fef3c7" : "#92400e",
      accentColor: isDark ? "#fbbf24" : "#d97706",
      dotColor: isDark ? "#fbbf24" : "#f59e0b",
    };
  }

  // 2. 블루 / 스카이
  if (hex === "#0284c7" || hex === "#3b82f6" || hex.includes("blue") || hex.includes("sky")) {
    return {
      bg: isDark ? "bg-sky-950/40" : "bg-sky-50/95",
      border: isDark ? "border-sky-500/40" : "border-sky-300/80",
      text: isDark ? "text-sky-100" : "text-sky-900",
      dot: isDark ? "bg-sky-400" : "bg-sky-500",
      bgRgba: isDark ? "rgba(56, 189, 248, 0.18)" : "rgba(239, 246, 255, 0.95)",
      borderRgba: isDark ? "rgba(96, 165, 250, 0.4)" : "rgba(59, 130, 246, 0.35)",
      textColor: isDark ? "#dbeafe" : "#1e40af",
      accentColor: isDark ? "#60a5fa" : "#2563eb",
      dotColor: isDark ? "#60a5fa" : "#3b82f6",
    };
  }

  // 3. 에메랄드 / 그린
  if (hex === "#10b981" || hex === "#059669" || hex.includes("green") || hex.includes("emerald")) {
    return {
      bg: isDark ? "bg-emerald-950/40" : "bg-emerald-50/95",
      border: isDark ? "border-emerald-500/40" : "border-emerald-300/80",
      text: isDark ? "text-emerald-100" : "text-emerald-900",
      dot: isDark ? "bg-emerald-400" : "bg-emerald-500",
      bgRgba: isDark ? "rgba(16, 185, 129, 0.18)" : "rgba(236, 253, 245, 0.95)",
      borderRgba: isDark ? "rgba(52, 211, 153, 0.4)" : "rgba(16, 185, 129, 0.35)",
      textColor: isDark ? "#d1fae5" : "#065f46",
      accentColor: isDark ? "#34d399" : "#059669",
      dotColor: isDark ? "#34d399" : "#10b981",
    };
  }

  // 4. 로즈 / 레드
  if (hex === "#f43f5e" || hex === "#ef4444" || hex.includes("red") || hex.includes("rose")) {
    return {
      bg: isDark ? "bg-rose-950/40" : "bg-rose-50/95",
      border: isDark ? "border-rose-500/40" : "border-rose-300/80",
      text: isDark ? "text-rose-100" : "text-rose-900",
      dot: isDark ? "bg-rose-400" : "bg-rose-500",
      bgRgba: isDark ? "rgba(244, 63, 94, 0.18)" : "rgba(255, 241, 242, 0.95)",
      borderRgba: isDark ? "rgba(251, 113, 133, 0.4)" : "rgba(244, 63, 94, 0.35)",
      textColor: isDark ? "#ffe4e6" : "#9f1239",
      accentColor: isDark ? "#fb7185" : "#e11d48",
      dotColor: isDark ? "#fb7185" : "#f43f5e",
    };
  }

  // 5. 바이올렛 / 퍼플
  if (hex === "#8b5cf6" || hex === "#7c3aed" || hex.includes("purple") || hex.includes("violet")) {
    return {
      bg: isDark ? "bg-purple-950/40" : "bg-purple-50/95",
      border: isDark ? "border-purple-500/40" : "border-purple-300/80",
      text: isDark ? "text-purple-100" : "text-purple-900",
      dot: isDark ? "bg-purple-400" : "bg-purple-500",
      bgRgba: isDark ? "rgba(139, 92, 246, 0.18)" : "rgba(250, 245, 255, 0.95)",
      borderRgba: isDark ? "rgba(167, 139, 250, 0.4)" : "rgba(139, 92, 246, 0.35)",
      textColor: isDark ? "#ede9fe" : "#5b21b6",
      accentColor: isDark ? "#a78bfa" : "#7c3aed",
      dotColor: isDark ? "#a78bfa" : "#8b5cf6",
    };
  }

  // 기본 fallback: 테마 primary 기반
  return {
    bg: isDark ? "bg-amber-950/40" : "bg-amber-50/95",
    border: isDark ? "border-amber-500/40" : "border-amber-300/80",
    text: isDark ? "text-amber-100" : "text-amber-900",
    dot: isDark ? "bg-amber-400" : "bg-amber-500",
    bgRgba: isDark ? "rgba(245, 158, 11, 0.18)" : "rgba(254, 243, 199, 0.95)",
    borderRgba: isDark ? "rgba(251, 191, 36, 0.4)" : "rgba(245, 158, 11, 0.35)",
    textColor: isDark ? "#fef3c7" : "#92400e",
    accentColor: isDark ? "#fbbf24" : "#d97706",
    dotColor: isDark ? "#fbbf24" : "#f59e0b",
  };
}

// 날짜 포맷팅 헬퍼 ("YYYY-MM-DD")
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 문자열 날짜(ISO 또는 "YYYY-MM-DD")를 브라우저 로컬 날짜 키("YYYY-MM-DD")로 안전하게 변환
export function getLocalDateKey(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "";
  if (dateInput instanceof Date) {
    return formatDateKey(dateInput);
  }
  const str = String(dateInput).trim();
  // 순수 "YYYY-MM-DD" 형태만 들어왔을 경우 그대로 사용
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // ISO 문자열("2026-11-04T15:00:00.000Z" 등)일 경우 Date로 파싱하여 로컬 타임존 날짜 반환
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return formatDateKey(d);
  }
  return str.slice(0, 10);
}

// 문자열 날짜를 Date로 파싱 (로컬 자정 기준)
export function parseDateOnly(str: string): Date {
  const key = getLocalDateKey(str);
  const parts = key.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// 두 날짜 사이의 일수 차이 계산
export function getDaysDiff(startStr: string, endStr: string): number {
  const start = parseDateOnly(startStr);
  const end = parseDateOnly(endStr);
  const diffTime = end.getTime() - start.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// 문자열 날짜/ISO에서 브라우저 로컬 시간("HH:mm")을 안전하게 추출
export function getLocalTimeStr(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "";
  if (dateInput instanceof Date) {
    const hh = String(dateInput.getHours()).padStart(2, "0");
    const mm = String(dateInput.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  const str = String(dateInput).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  if (str.includes("T")) {
    return str.slice(11, 16);
  }
  return "";
}

/**
 * 🌟 일정의 시간 정보 문자열을 안전하게 반환
 * - allDay === true -> { isAllDay: true, timeText: "종일" }
 * - allDay === false -> { isAllDay: false, timeText: "14:00" 또는 "14:00~15:30" }
 */
export function getEventTimeDisplay(
  evt: { startDate?: string; endDate?: string; allDay?: boolean },
  includeRange: boolean = false
): { isAllDay: boolean; timeText: string } {
  if (evt.allDay) {
    return { isAllDay: true, timeText: "종일" };
  }

  const startTime = getLocalTimeStr(evt.startDate);
  const endTime = getLocalTimeStr(evt.endDate);

  if (!startTime) {
    return { isAllDay: true, timeText: "종일" };
  }

  if (includeRange && endTime && endTime !== startTime) {
    return { isAllDay: false, timeText: `${startTime}~${endTime}` };
  }

  return { isAllDay: false, timeText: startTime };
}

// 사진2 표준: 월요일 시작 인덱스 (0: 월, 1: 화, 2: 수, 3: 목, 4: 금, 5: 토, 6: 일)
export function getMondayBasedDayOfWeek(date: Date): number {
  const d = date.getDay(); // 0: 일, 1: 월 ... 6: 토
  return d === 0 ? 6 : d - 1;
}
