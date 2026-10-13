"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

interface CalendarEvent {
  _id?: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  category: "work" | "personal" | "meeting" | "reminder" | "other";
  color?: string;
  authorEmail?: string;
  calendarType?: "personal" | "group";
}

const CATEGORY_CONFIG = {
  work: {
    label: "업무",
    color: "bg-blue-500",
    bgLight: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  },
  personal: {
    label: "개인",
    color: "bg-green-500",
    bgLight: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
  },
  meeting: {
    label: "미팅",
    color: "bg-purple-500",
    bgLight: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
  },
  reminder: {
    label: "리마인더",
    color: "bg-yellow-500",
    bgLight: "bg-yellow-500/10",
    text: "text-yellow-600 dark:text-yellow-500",
  },
  other: {
    label: "기타",
    color: "bg-gray-500",
    bgLight: "bg-gray-500/10",
    text: "text-gray-600 dark:text-gray-400",
  },
};

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(new Date(NaN));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState<CalendarEvent>({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    allDay: true,
    category: "personal",
  });

  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date());
  }, []);

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

  // 👈 공유해주신 일기장 페이지의 인증 및 데이터 로딩 로직을 그대로 반영
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

  if (!mounted) return null;

  // 👈 세션 로딩 중이거나 데이터 로딩 중일 때 스피너 표시
  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4 text-center text-gray-800 dark:text-gray-200 gap-3">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
        <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">
          캘린더 데이터를 안전하게 불러오는 중...
        </p>
      </div>
    );
  }

  // 👈 세션이 없을 경우 일기장 페이지와 동일한 패턴으로 로그인 화면 표출
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
            <Lock size={28} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">통합 캘린더</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              일정을 확인하려면 로그인이 필요합니다.
            </p>
          </div>
          <button
            onClick={() => signIn()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md text-sm cursor-pointer"
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

  // 캘린더 그리드 생성 로직 (항상 6주, 총 42칸 고정으로 레이아웃 밀림 방지)
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  // 1. 이전 달 빈 칸 채우기
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // 2. 현재 달 날짜 채우기
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // 3. 💡 항상 6주(총 42칸)가 되도록 남은 칸을 다음 달 빈 칸으로 마저 채움
  const remainingCells = 42 - days.length;
  for (let i = 0; i < remainingCells; i++) {
    days.push(null);
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const handleDayClick = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);

    setSelectedDate(date);
    setSelectedEvent(null);
    setIsEditing(false);
    setFormData({
      title: "",
      description: "",
      startDate: localISOTime,
      endDate: localISOTime,
      allDay: true,
      category: "personal",
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setFormData({
      ...event,
      startDate: new Date(event.startDate).toISOString().slice(0, 16),
      endDate: new Date(event.endDate).toISOString().slice(0, 16),
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const method = isEditing && selectedEvent?._id ? "PUT" : "POST";
      const payload =
        isEditing && selectedEvent?._id ? { ...formData, _id: selectedEvent._id } : formData;

      const res = await fetch("/api/calendar", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchEvents();
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (err) {
      alert("서버 오류가 발생했습니다.");
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent?._id) return;
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/calendar?id=${selectedEvent._id}`, { method: "DELETE" });
      if (res.ok) {
        setIsModalOpen(false);
        fetchEvents();
      }
    } catch (err) {
      alert("삭제 실패");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-800 dark:text-gray-200 p-4 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
              <CalendarIcon size={24} />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white truncate">
                🗓️ 통합 캘린더
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                개인 일정과 다가올 그룹/팀 프로젝트 일정을 관리하세요.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-xl text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] px-3.5 py-2.5 rounded-xl transition-colors font-medium"
            >
              <Home size={16} /> <span className="hidden sm:inline">메인으로</span>
            </Link>
          </div>
        </div>

        {/* 캘린더 상단 컨트롤 툴바 */}
        <div className="bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={goToday}
              className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-xs sm:text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
            >
              오늘
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-xl transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white w-32 text-center">
                {year}년 {month + 1}월
              </h2>
              <button
                onClick={nextMonth}
                className="p-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-xl transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              const localISOTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
              setFormData({
                title: "",
                description: "",
                startDate: localISOTime,
                endDate: localISOTime,
                allDay: true,
                category: "personal",
              });
              setSelectedEvent(null);
              setIsEditing(true);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-md cursor-pointer w-full sm:w-auto justify-center"
          >
            <Plus size={16} /> 일정 추가
          </button>
        </div>

        {/* 캘린더 그리드 */}
        <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#252526]">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
              <div
                key={day}
                className={`py-3 text-center text-xs font-bold ${idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : "text-gray-500 dark:text-gray-400"}`}
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 auto-rows-fr">
            {days.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[100px] md:min-h-[120px] bg-gray-50/50 dark:bg-[#1a1a1a] border-r border-b border-gray-100 dark:border-gray-800/50 p-2"
                  ></div>
                );
              }

              const isToday = new Date().toDateString() === date.toDateString();
              const dateEvents = events.filter((e) => {
                const start = new Date(e.startDate);
                return (
                  start.getFullYear() === date.getFullYear() &&
                  start.getMonth() === date.getMonth() &&
                  start.getDate() === date.getDate()
                );
              });

              return (
                <div
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date)}
                  className={`min-h-[100px] md:min-h-[120px] p-1.5 md:p-2 border-r border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-[#252526] transition-colors cursor-pointer group relative ${isToday ? "bg-indigo-50/30 dark:bg-indigo-900/10" : "bg-white dark:bg-[#1e1e1e]"}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`text-xs md:text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-indigo-500 text-white" : date.getDay() === 0 ? "text-red-500" : date.getDay() === 6 ? "text-blue-500" : "text-gray-700 dark:text-gray-300"}`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {dateEvents.map((evt, idx) => (
                      <div
                        key={idx}
                        onClick={(e) => handleEventClick(e, evt)}
                        className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded truncate font-medium ${CATEGORY_CONFIG[evt.category].bgLight} ${CATEGORY_CONFIG[evt.category].text} border border-transparent hover:border-indigo-300 transition-all`}
                        title={evt.title}
                      >
                        {evt.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 모달 창 */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-full transition-colors cursor-pointer"
              >
                <X size={18} className="text-gray-600 dark:text-gray-400" />
              </button>

              {selectedEvent && !isEditing ? (
                <div className="space-y-6 pt-2">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${CATEGORY_CONFIG[selectedEvent.category].bgLight} ${CATEGORY_CONFIG[selectedEvent.category].text}`}
                      >
                        {CATEGORY_CONFIG[selectedEvent.category].label}
                      </span>
                      {selectedEvent.allDay && (
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-md font-bold">
                          하루 종일
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight">
                      {selectedEvent.title}
                    </h2>
                  </div>

                  <div className="bg-gray-50 dark:bg-[#252526] p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60 space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                      <Clock size={16} className="text-indigo-500 shrink-0" />
                      <div>
                        <p>{new Date(selectedEvent.startDate).toLocaleString()}</p>
                        {!selectedEvent.allDay && (
                          <p className="text-xs text-gray-500">
                            ~ {new Date(selectedEvent.endDate).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedEvent.description && (
                      <div className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700/60 pt-3">
                        <AlignLeft size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                        <p className="whitespace-pre-wrap">{selectedEvent.description}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={handleDeleteEvent}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-xl transition-colors text-sm font-bold cursor-pointer"
                    >
                      <Trash2 size={16} /> 삭제
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors text-sm font-bold shadow cursor-pointer"
                    >
                      <Edit3 size={16} /> 수정하기
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveEvent} className="space-y-5 pt-2">
                  <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    {selectedEvent ? (
                      <Edit3 size={18} className="text-indigo-500" />
                    ) : (
                      <Plus size={18} className="text-indigo-500" />
                    )}
                    {selectedEvent ? "일정 수정" : "새로운 일정 추가"}
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        일정 제목
                      </label>
                      <input
                        type="text"
                        placeholder="예: 주간 기획 회의"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          카테고리
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({ ...formData, category: e.target.value as any })
                          }
                          className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white cursor-pointer"
                        >
                          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>
                              {config.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 w-full">
                          <input
                            type="checkbox"
                            checked={formData.allDay}
                            onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            하루 종일
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          시작 일시
                        </label>
                        <input
                          type={formData.allDay ? "date" : "datetime-local"}
                          value={
                            formData.allDay ? formData.startDate.split("T")[0] : formData.startDate
                          }
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                          required
                        />
                      </div>
                      {!formData.allDay && (
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                            종료 일시
                          </label>
                          <input
                            type="datetime-local"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        메모 / 설명
                      </label>
                      <textarea
                        rows={3}
                        placeholder="일정에 대한 간단한 메모를 남겨주세요."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => (selectedEvent ? setIsEditing(false) : setIsModalOpen(false))}
                      className="flex-1 py-3 bg-gray-200 dark:bg-[#2d2d2d] hover:bg-gray-300 dark:hover:bg-[#383838] text-gray-800 dark:text-gray-200 rounded-xl transition-colors text-sm font-bold cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors text-sm font-bold shadow cursor-pointer"
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
