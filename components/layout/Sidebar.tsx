"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  GraduationCap,
  Home,
  Calendar,
  Check,
  Folder,
  Bookmark,
  Users,
  Network,
  FolderGit2,
  Lightbulb,
  MessageSquare,
  BookHeart,
  Palette,
  Settings,
  Bell,
  LogOut,
  LogIn,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  EyeOff,
} from "lucide-react";
import { toast } from "@/lib/toast";

export type SidebarMode = "hidden" | "icon" | "full";

interface StoredTask {
  id: string;
  categoryId?: string;
  dueDate?: string | null;
  completed?: boolean;
}

function calculateTodayTaskCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const saved = localStorage.getItem("onequiz_tasks_items_v2");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const now = new Date();
        const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const uncompletedToday = parsed.filter(
          (t: StoredTask) =>
            !t.completed &&
            (t.categoryId === "cat-today" || t.dueDate === todayDateStr || !t.categoryId)
        );
        return uncompletedToday.length;
      }
    }
  } catch {}
  return 1; // 기본 초기 데이터 (task-1이 '오늘' 카테고리 미완료 할일)
}

function subscribeTodayTasks(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("onequiz_tasks_updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("onequiz_tasks_updated", callback);
  };
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string;
}

export interface SidebarProps {
  onOpenThemeModal: () => void;
  mode?: SidebarMode;
  onChangeMode?: (mode: SidebarMode) => void;
  onCycleMode?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  onOpenThemeModal,
  mode,
  onChangeMode,
  isCollapsed: legacyCollapsed,
  onToggleCollapse: legacyToggle,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");

  // 3단계 모드 ("hidden": 아예 없음, "icon": 아이콘만, "full": 아이콘+글씨)
  const currentMode: SidebarMode = mode || (legacyCollapsed ? "icon" : "full");
  const isIconOnly = currentMode === "icon";
  const isHidden = currentMode === "hidden";

  const handleModeSelect = (newMode: SidebarMode) => {
    if (onChangeMode) {
      onChangeMode(newMode);
    } else if (legacyToggle) {
      legacyToggle();
    }
  };

  // 🌟 오늘의 할일 개수 동기화 (useSyncExternalStore로 하이드레이션 오류 및 setState-in-effect 방지)
  const todayTaskCount = useSyncExternalStore(
    subscribeTodayTasks,
    calculateTodayTaskCount,
    () => 0
  );

  const navItems: NavItem[] = [
    { label: "대시보드", href: "/", icon: Home },
    { label: "캘린더", href: "/calendar", icon: Calendar },
    { label: "일기", href: "/diary", icon: BookHeart },
    { label: "할일", href: "/tasks", icon: Check },
    { label: "드라이브", href: "/drive", icon: Folder },
    { label: "북마크", href: "/bookmarks", icon: Bookmark },
    { label: "연락처", href: "/contacts", icon: Users },
  ];

  const subNavItems: NavItem[] = [
    { label: "마인드맵", href: "/mindmap", icon: Network },
    { label: "아이디어", href: "/ideas", icon: Lightbulb },
    { label: "프로젝트", href: "/projects", icon: FolderGit2 },
    { label: "채팅", href: "/chat", icon: MessageSquare },
    { label: "기출문제 학습", href: "/exam/subject", icon: GraduationCap, badge: "HOT" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const filteredNav = navItems.filter((i) =>
    i.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSubNav = subNavItems.filter((i) =>
    i.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* 모바일 배경 오버레이 (모바일에서 열렸을 때 뒷배경 블러 및 터치 시 닫기) */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      {/* 사이드바 본체 */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-surface-container-lowest z-50 flex flex-col justify-between overflow-y-auto md:overflow-visible border-r border-outline-variant shadow-xs transition-all duration-300 ${
          /* 모바일: 서랍식 슬라이드 */
          isMobileOpen
            ? "translate-x-0 w-64 pointer-events-auto"
            : isHidden
            ? "-translate-x-full md:-translate-x-full w-0 pointer-events-none opacity-0"
            : "-translate-x-full md:translate-x-0 opacity-100"
        } ${
          /* 태블릿 & 데스크톱: 3단계 너비 (0px ↔ 72px ↔ 240px) */
          isIconOnly ? "md:w-[72px]" : currentMode === "full" ? "md:w-60" : "md:w-0"
        }`}
      >
        <div className="p-3 flex flex-col gap-3">
          {/* 상단 브랜드 로고 & 3단계 모드 토글 버튼 */}
          {isIconOnly ? (
            /* 🌟 1. 아이콘 모드일 때: 홈 로고와 펼치기 버튼을 수직으로 깔끔하게 배치하여 겹침 방지 */
            <div className="hidden md:flex flex-col items-center gap-2 pt-1 w-full">
              <Link
                href="/"
                className="p-1 rounded-xl group relative"
                title="원퀴즈 홈으로 이동"
              >
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4 text-on-primary" />
                </div>
                {/* 호버 말풍선 툴팁 (테마 색상 반영) */}
                <div className="hidden md:group-hover:flex items-center absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-primary text-on-primary border border-primary/30 rounded-md text-xs font-bold whitespace-nowrap shadow-lg shadow-primary/20 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
                  원퀴즈 홈
                </div>
              </Link>

              <button
                type="button"
                onClick={() => handleModeSelect("full")}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer group relative"
                title="사이드바 전체 펼치기 (아이콘+글씨)"
              >
                <ChevronRight size={16} />
                {/* 호버 말풍선 툴팁 (테마 색상 반영) */}
                <div className="hidden md:group-hover:flex items-center absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-primary text-on-primary border border-primary/30 rounded-md text-xs font-bold whitespace-nowrap shadow-lg shadow-primary/20 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
                  사이드바 펼치기
                </div>
              </button>
            </div>
          ) : (
            /* 🌟 2. 펼쳐진 상태일 때: 로고와 숨기기/접기 버튼 깔끔하게 정돈 (기능 중복 제거) */
            <div className="flex items-center justify-between pt-1">
              <Link
                href="/"
                onClick={onCloseMobile}
                className="flex items-center gap-2.5 group overflow-hidden"
                title="원퀴즈 홈으로 이동"
              >
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5 text-on-primary" />
                </div>

                <div className="flex flex-col transition-opacity duration-200 overflow-hidden">
                  <span className="text-[17px] font-black tracking-tight text-on-surface leading-tight whitespace-nowrap">
                    원퀴즈
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-medium tracking-wide whitespace-nowrap">
                    OneQuiz Workspace
                  </span>
                </div>
              </Link>

              {/* 모바일 닫기 버튼 */}
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container md:hidden"
              >
                <X size={18} />
              </button>

              {/* PC 데스크톱 컨트롤: 완전히 숨기기(EyeOff) + 사이드바 접기(ChevronLeft) */}
              <div className="hidden md:flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/60">
                <button
                  type="button"
                  onClick={() => handleModeSelect("hidden")}
                  className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="사이드바 완전히 숨기기 (0px)"
                >
                  <EyeOff size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSelect("icon")}
                  className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="사이드바 접기 (아이콘 모드)"
                >
                  <ChevronLeft size={13} />
                </button>
              </div>
            </div>
          )}

          {/* 검색창: 펼쳐진 상태에서만 노출 */}
          {!isIconOnly && (
            <div className="relative flex items-center mt-1">
              <Search className="w-4 h-4 absolute left-2.5 text-on-surface-variant pointer-events-none" />
              <input
                type="text"
                placeholder="메뉴 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low pl-8 pr-3 py-2 rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-all border border-transparent font-medium"
              />
            </div>
          )}

          {/* 네비게이션 링크 목록 */}
          <nav className="flex flex-col gap-1 mt-1">
            {filteredNav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`group relative flex items-center rounded-xl transition-all font-semibold text-sm ${
                    isIconOnly
                      ? "md:justify-center p-2.5"
                      : "justify-between px-3 py-2.5"
                  } ${
                    active
                      ? "bg-surface-container text-on-surface font-bold shadow-xs border border-outline-variant/60"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                  title={isIconOnly ? item.label : undefined}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        active ? "text-primary" : "text-on-surface-variant"
                      }`}
                    />
                    <span
                      className={`truncate whitespace-nowrap ${
                        isIconOnly ? "md:hidden" : "inline"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* 할일 뱃지: 미완료 '오늘의 할일'이 존재하면 사진처럼 (1) 원형 뱃지 노출 */}
                  {item.href === "/tasks" && todayTaskCount > 0 ? (
                    !isIconOnly ? (
                      <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center shrink-0 font-mono shadow-xs ml-auto leading-none">
                        {todayTaskCount}
                      </span>
                    ) : (
                      <span className="absolute top-1.5 right-1.5 min-w-[15px] h-4 px-0.5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center shadow-xs leading-none">
                        {todayTaskCount}
                      </span>
                    )
                  ) : (
                    item.badge && !isIconOnly && (
                      <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider shrink-0">
                        {item.badge}
                      </span>
                    )
                  )}

                  {/* 축소 상태일 때 호버 말풍선 툴팁 (테마 색상 반영) */}
                  {isIconOnly && (
                    <div className="hidden md:group-hover:flex items-center absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-primary text-on-primary border border-primary/30 rounded-md text-xs font-bold whitespace-nowrap shadow-lg shadow-primary/20 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                      <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
                      <span>{item.label}</span>
                      {item.href === "/tasks" && todayTaskCount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-surface-container-lowest text-primary text-[10px] font-bold font-mono leading-none">
                          {todayTaskCount}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}

            <div className="h-px bg-outline-variant my-1.5 mx-1" />

            {filteredSubNav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`group relative flex items-center rounded-xl transition-all font-semibold text-sm ${
                    isIconOnly
                      ? "md:justify-center p-2.5"
                      : "px-3 py-2.5"
                  } ${
                    active
                      ? "bg-surface-container text-on-surface font-bold shadow-xs border border-outline-variant/60"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                  title={isIconOnly ? item.label : undefined}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Icon
                      className={`w-[18px] h-[18px] shrink-0 ${
                        active ? "text-primary" : "text-on-surface-variant"
                      }`}
                    />
                    <span
                      className={`truncate whitespace-nowrap ${
                        isIconOnly ? "md:hidden" : "inline"
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* 축소 상태일 때 호버 말풍선 툴팁 (테마 색상 반영) */}
                  {isIconOnly && (
                    <div className="hidden md:group-hover:flex items-center absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-primary text-on-primary border border-primary/30 rounded-md text-xs font-bold whitespace-nowrap shadow-lg shadow-primary/20 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                      <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
                      <span>{item.label}</span>
                      {item.href === "/tasks" && todayTaskCount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-surface-container-lowest text-primary text-[10px] font-bold font-mono leading-none">
                          {todayTaskCount}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* 사이드바 하단 제어 영역 */}
        <div className="p-3 flex flex-col gap-2.5 bg-surface-container-lowest border-t border-outline-variant">
          {/* 퀵 툴바: 24개 테마 변경, 설정, 알림 */}
          <div
            className={`flex items-center py-1 text-on-surface-variant border-b border-outline-variant/60 pb-2 ${
              isIconOnly ? "flex-col gap-2" : "justify-around"
            }`}
          >
            {/* 테마 변경 버튼 */}
            <button
              type="button"
              onClick={onOpenThemeModal}
              className="p-1.5 rounded-lg hover:bg-surface-container-low text-primary transition-colors cursor-pointer group relative"
              title="24개 다중 테마 선택"
            >
              <Palette className="w-4 h-4" />
              {isIconOnly && (
                <div className="hidden md:group-hover:flex items-center absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-primary text-on-primary border border-primary/30 rounded-md text-xs font-bold whitespace-nowrap shadow-lg shadow-primary/20 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
                  <span>테마 설정</span>
                </div>
              )}
            </button>

            {/* 환경 설정 (개인 설정) */}
            <Link
              href="/settings"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors group relative"
              title="설정"
            >
              <Settings className="w-4 h-4" />
              {isIconOnly && (
                <div className="hidden md:group-hover:flex items-center absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-primary text-on-primary border border-primary/30 rounded-md text-xs font-bold whitespace-nowrap shadow-lg shadow-primary/20 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
                  <span>개인 설정</span>
                </div>
              )}
            </Link>

            {/* 알림 */}
            <button
              type="button"
              onClick={() => toast.info("현재 새로운 알림이 없습니다.")}
              className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer group relative"
              title="알림"
            >
              <Bell className="w-4 h-4" />
              {isIconOnly && (
                <div className="hidden md:group-hover:flex items-center absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-primary text-on-primary border border-primary/30 rounded-md text-xs font-bold whitespace-nowrap shadow-lg shadow-primary/20 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
                  <span>알림</span>
                </div>
              )}
            </button>
          </div>

          {/* 유저 세션 프로필 */}
          {session?.user ? (
            <div
              className={`flex items-center justify-between py-1 group relative ${
                isIconOnly ? "justify-center" : "px-1"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {session.user.name ? session.user.name[0].toUpperCase() : "U"}
                </div>
                {isIconOnly && (
                  <div className="hidden md:group-hover:flex items-center absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-primary text-on-primary border border-primary/30 rounded-md text-xs font-bold whitespace-nowrap shadow-lg shadow-primary/20 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
                    <span>{session.user.name || "학습자"}</span>
                  </div>
                )}
                {!isIconOnly && (
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-on-surface truncate font-bold">
                      {session.user.name || "학습자"}
                    </span>
                    <span className="text-xs text-on-surface-variant truncate">
                      {session.user.email}
                    </span>
                  </div>
                )}
              </div>
              {!isIconOnly && (
                <button
                  onClick={() => signOut()}
                  className="p-1 text-on-surface-variant hover:text-destructive transition-colors shrink-0 cursor-pointer"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer group relative ${
                isIconOnly ? "w-10 h-10 p-0 mx-auto" : "w-full"
              }`}
              title="로그인"
            >
              <LogIn className="w-4 h-4" />
              {!isIconOnly ? (
                <span>로그인</span>
              ) : (
                <div className="hidden md:group-hover:flex items-center absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-primary text-on-primary border border-primary/30 rounded-md text-xs font-bold whitespace-nowrap shadow-lg shadow-primary/20 z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-100">
                  <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-primary" />
                  <span>로그인</span>
                </div>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
