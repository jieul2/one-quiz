"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Settings,
  Lightbulb,
  Moon,
  Sun,
  Lock,
  ShieldAlert,
  Clock,
  FileText,
  Loader2,
  Calendar,
  LogOut,
  User,
  LogIn,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

interface SettingsType {
  siteTitle: string;
  landingSubtitle: string;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceUpdatedAt?: string | null;
  disabledFeatures: {
    exam: boolean;
    diary: boolean;
    ideas: boolean;
    admin: boolean;
    calendar?: boolean;
  };
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (e) {
        console.error("Failed to load site settings:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4 text-center text-gray-800 dark:text-gray-200 gap-3">
        <Loader2 size={36} className="animate-spin text-yellow-500" />
        <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">
          시스템 로딩 중...
        </p>
      </div>
    );
  }

  if (settings?.isMaintenanceMode) {
    const formattedTime = settings.maintenanceUpdatedAt
      ? new Date(settings.maintenanceUpdatedAt).toLocaleString("ko-KR", {
          dateStyle: "medium",
          timeStyle: "medium",
        })
      : "기록 없음";

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4 text-center text-gray-800 dark:text-gray-200">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-2xl border border-red-500/30 max-w-md w-full space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
            <ShieldAlert size={32} />
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              시스템 긴급 점검 중
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              더 나은 서비스 제공을 위해 시스템 점검을 진행하고 있습니다.
            </p>

            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                <Clock size={15} className="shrink-0" />
                <span>점검 시간 : {formattedTime}</span>
              </div>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                <FileText size={15} className="shrink-0" />
                <span>점검 내용 : {settings.maintenanceMessage || "시스템 서버 안정화 작업"}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => router.push("/admin")}
            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Settings size={16} /> 관리자 페이지로 이동 (점검 해제)
          </button>
        </div>
      </div>
    );
  }

  const handleMenuClick = (featureKey: string, path: string) => {
    if (settings?.disabledFeatures?.[featureKey as keyof typeof settings.disabledFeatures]) {
      alert("현재 관리자에 의해 일시적으로 비활성화(OFF)된 기능입니다.");
      return;
    }
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center text-gray-800 dark:text-gray-200 transition-colors duration-300 relative overflow-hidden p-4 sm:p-8">
      {/* 💡 우측 상단 헤더 영역 (모바일 화면 잘림 방지를 위해 좌우 패딩 및 간격 최적화) */}
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex items-center gap-2.5 z-20">
        {/* 다크모드 토글 버튼 */}
        <button
          suppressHydrationWarning
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2.5 sm:p-3 bg-white dark:bg-[#1e1e1e] rounded-full shadow-md border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          title="테마 변경"
        >
          <span className="block dark:hidden">
            <Moon size={18} className="sm:w-5 sm:h-5" />
          </span>
          <span className="hidden dark:block">
            <Sun size={18} className="sm:w-5 sm:h-5" />
          </span>
        </button>

        {/* 사용자 프로필 콤보박스 or 로그인 버튼 */}
        <div className="relative" ref={dropdownRef}>
          {status === "loading" ? (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-[#2d2d2d] animate-pulse" />
          ) : session ? (
            <div>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center p-1 bg-white dark:bg-[#1e1e1e] rounded-full shadow-md border border-gray-200 dark:border-gray-800 hover:border-yellow-500 transition-all cursor-pointer"
              >
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt="프로필"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-yellow-500 text-black flex items-center justify-center font-bold text-xs">
                    {session.user?.name?.[0] || "U"}
                  </div>
                )}
              </button>

              {/* 드롭다운 메뉴 (우측 정렬로 화면 밖 이탈 방지) */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl py-2 z-50 animate-fade-in text-xs">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 truncate">
                    <p className="font-bold text-gray-900 dark:text-white truncate">
                      {session.user?.name || "사용자"}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{session.user?.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      alert("추후 개발 예정인 기능입니다!");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-[#2d2d2d] flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium cursor-pointer transition-colors"
                  >
                    <User size={14} className="text-yellow-500" /> 프로필
                  </button>

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 text-red-600 dark:text-red-400 font-bold cursor-pointer transition-colors border-t border-gray-100 dark:border-gray-800"
                  >
                    <LogOut size={14} /> 로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white dark:bg-[#1e1e1e] shadow-md border border-gray-200 dark:border-gray-800 flex items-center justify-center text-yellow-500 hover:border-yellow-500 transition-all cursor-pointer"
              title="로그인"
            >
              <LogIn size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 로고 및 상태메시지 박스 */}
      <div
        className="text-center mb-8 sm:mb-12 cursor-pointer mt-16 sm:mt-0"
        onClick={() => router.push("/")}
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-4 sm:mb-5 tracking-tight">
          oneQuiz
        </h1>

        <div className="inline-block bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl shadow-sm max-w-[90vw] sm:max-w-md">
          <p className="text-gray-600 dark:text-gray-400 text-[11px] sm:text-sm font-medium tracking-wide truncate">
            {settings?.landingSubtitle || "중간고사 : 10/12 ~ 16, 드론조종사 : 10/21"}
          </p>
        </div>
      </div>

      {/* 메인 메뉴 카드 그리드 (반응형: 모바일 1열, 태블릿 2열, 데스크탑 3열) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in w-full max-w-5xl">
        {/* 1. 시험 응시하기 */}
        <button
          onClick={() => handleMenuClick("exam", "/exam/subject")}
          className={`flex flex-col items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#1e1e1e] border rounded-2xl transition-all hover:-translate-y-1 hover:shadow-2xl group w-full shadow-lg dark:shadow-xl text-center cursor-pointer ${
            settings?.disabledFeatures?.exam
              ? "opacity-40 border-gray-300 cursor-not-allowed hover:translate-y-0 hover:shadow-lg"
              : "border-gray-200 dark:border-gray-800 hover:border-yellow-500"
          }`}
        >
          <BookOpen
            size={40}
            className="text-yellow-600 dark:text-yellow-500 mb-3 sm:mb-4 group-hover:text-yellow-500 transition-colors"
          />
          <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
            시험 응시하기
          </span>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            과목과 회차를 선택해
            <br />
            맞춤형으로 학습하세요
          </span>
          {settings?.disabledFeatures?.exam && (
            <span className="mt-2 text-[10px] text-red-500 font-bold">비활성화됨 (OFF)</span>
          )}
        </button>

        {/* 2. 나만의 일기장 */}
        <button
          onClick={() => handleMenuClick("diary", "/diary")}
          className={`flex flex-col items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#1e1e1e] border rounded-2xl transition-all hover:-translate-y-1 hover:shadow-2xl group w-full shadow-lg dark:shadow-xl text-center cursor-pointer ${
            settings?.disabledFeatures?.diary
              ? "opacity-40 border-gray-300 cursor-not-allowed hover:translate-y-0 hover:shadow-lg"
              : "border-gray-200 dark:border-gray-800 hover:border-blue-500"
          }`}
        >
          <Lock
            size={40}
            className="text-blue-500 mb-3 sm:mb-4 group-hover:text-blue-400 transition-colors"
          />
          <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
            나만의 일기장
          </span>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            로그인 전용 프라이빗
            <br />
            일기를 기록하세요
          </span>
          {settings?.disabledFeatures?.diary && (
            <span className="mt-2 text-[10px] text-red-500 font-bold">비활성화됨 (OFF)</span>
          )}
        </button>

        {/* 3. 통합 캘린더 */}
        <button
          onClick={() => handleMenuClick("calendar", "/calendar")}
          className={`flex flex-col items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#1e1e1e] border rounded-2xl transition-all hover:-translate-y-1 hover:shadow-2xl group w-full shadow-lg dark:shadow-xl text-center cursor-pointer ${
            settings?.disabledFeatures?.calendar
              ? "opacity-40 border-gray-300 cursor-not-allowed hover:translate-y-0 hover:shadow-lg"
              : "border-gray-200 dark:border-gray-800 hover:border-indigo-500"
          }`}
        >
          <Calendar
            size={40}
            className="text-indigo-500 mb-3 sm:mb-4 group-hover:text-indigo-400 transition-colors"
          />
          <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
            통합 캘린더
          </span>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            일정과 프로젝트를
            <br />
            한눈에 관리하세요
          </span>
          {settings?.disabledFeatures?.calendar && (
            <span className="mt-2 text-[10px] text-red-500 font-bold">비활성화됨 (OFF)</span>
          )}
        </button>

        {/* 4. 프로젝트 로드맵 */}
        <button
          onClick={() => handleMenuClick("ideas", "/ideas")}
          className={`flex flex-col items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#1e1e1e] border rounded-2xl transition-all hover:-translate-y-1 hover:shadow-2xl group w-full shadow-lg dark:shadow-xl text-center cursor-pointer ${
            settings?.disabledFeatures?.ideas
              ? "opacity-40 border-gray-300 cursor-not-allowed hover:translate-y-0 hover:shadow-lg"
              : "border-gray-200 dark:border-gray-800 hover:border-teal-500"
          }`}
        >
          <Lightbulb
            size={40}
            className="text-teal-500 mb-3 sm:mb-4 group-hover:text-teal-400 transition-colors"
          />
          <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
            프로젝트 로드맵
          </span>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            통합 앱 확장을 위한
            <br />
            피드백을 기록하세요
          </span>
          {settings?.disabledFeatures?.ideas && (
            <span className="mt-2 text-[10px] text-red-500 font-bold">비활성화됨 (OFF)</span>
          )}
        </button>

        {/* 5. 관리자 페이지 */}
        <button
          onClick={() => handleMenuClick("admin", "/admin")}
          className={`flex flex-col items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#1e1e1e] border rounded-2xl transition-all hover:-translate-y-1 hover:shadow-2xl group w-full shadow-lg dark:shadow-xl text-center cursor-pointer ${
            settings?.disabledFeatures?.admin
              ? "opacity-40 border-gray-300 cursor-not-allowed hover:translate-y-0 hover:shadow-lg"
              : "border-gray-200 dark:border-gray-800 hover:border-gray-400"
          }`}
        >
          <Settings
            size={40}
            className="text-gray-400 dark:text-gray-500 mb-3 sm:mb-4 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
          />
          <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2">
            관리자 설정
          </span>
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            서비스 전체 상태 및<br />
            기능을 관리하세요
          </span>
          {settings?.disabledFeatures?.admin && (
            <span className="mt-2 text-[10px] text-red-500 font-bold">비활성화됨 (OFF)</span>
          )}
        </button>
      </div>
    </div>
  );
}
