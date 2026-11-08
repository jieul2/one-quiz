"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useMounted } from "@/lib/hooks/useMounted";
import { CustomScrollArea } from "@/components/common/CustomScrollArea";
import {
  GraduationCap,
  Flame,
  Home,
  Calendar,
  Check,
  Folder,
  Bookmark,
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
  StickyNote,
  UsersRound,
  MessageSquareText,
  BookOpen,
  Activity,
  PenTool,
} from "lucide-react";

export type SidebarMode = "hidden" | "icon" | "full";

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

  // 🌟 관리자 대기 중인 피드백 알림 카운트
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function checkPendingFeedback() {
      if (session?.user?.role === "admin") {
        try {
          const res = await fetch("/api/feedback?limit=1");
          if (res.ok && !ignore) {
            const data = await res.json();
            if (typeof data.pendingCount === "number") {
              setPendingFeedbackCount(data.pendingCount);
            }
          }
        } catch {}
      }
    }
    checkPendingFeedback();
    return () => {
      ignore = true;
    };
  }, [session?.user?.role]);

  // 🌟 축소 모드일 때 클리핑 없는 뷰포트 고정 플로팅 말풍선(툴팁) 위치 상태
  const mounted = useMounted();
  const [hoveredNav, setHoveredNav] = useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const handleMouseEnterItem = (
    e: React.MouseEvent<HTMLElement>,
    label: string
  ) => {
    if (!isIconOnly) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredNav({
      label,
      x: 78,
      y: Math.round(rect.top + rect.height / 2),
    });
  };

  const handleMouseLeaveItem = () => {
    setHoveredNav(null);
  };

  // 🌟 5대 대분류 네비게이션 체계 (자주사용 / 커뮤니티·소통 / 워크스페이스 / 일상·라이프 / 학습·자격증)
  const navSections = [
    {
      title: "자주 사용하는 도구",
      items: [
        { label: "대시보드", href: "/", icon: Home },
        { label: "캘린더", href: "/calendar", icon: Calendar },
        { label: "할일", href: "/tasks", icon: Check },
        { label: "일기", href: "/diary", icon: BookHeart },
      ],
    },
    {
      title: "커뮤니티 & 소통",
      items: [
        { label: "커뮤니티 광장", href: "/board", icon: MessageSquareText },
        { label: "인사이트 블로그", href: "/blog", icon: BookOpen },
        { label: "라운지 실시간 채팅", href: "/chat", icon: MessageSquare },
      ],
    },
    {
      title: "워크스페이스 & 프로젝트",
      items: [
        { label: "아이디어 캔버스", href: "/canvas", icon: StickyNote },
        { label: "2D 마인드맵", href: "/mindmap", icon: Network },
        { label: "스케치 그림판", href: "/drawing", icon: PenTool },
        { label: "프로젝트 로드맵", href: "/projects", icon: FolderGit2 },
        { label: "기능 백로그", href: "/ideas", icon: Lightbulb },
      ],
    },
    {
      title: "일상 & 라이프",
      items: [
        { label: "러닝(달리기) 기록", href: "/running", icon: Activity },
        { label: "클라우드 드라이브", href: "/drive", icon: Folder },
        { label: "웹 북마크", href: "/bookmarks", icon: Bookmark },
      ],
    },
    {
      title: "학습 & 자격증",
      items: [
        { label: "기출문제 학습", href: "/exam/subject", icon: GraduationCap },
        { label: "학습 성장 리포트", href: "/learning", icon: Flame },
        { label: "스터디 그룹", href: "/groups", icon: UsersRound },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((i) =>
        i.label.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((section) => section.items.length > 0);

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
        className={`fixed left-0 top-0 h-screen h-[100dvh] max-h-[100dvh] bg-surface-container-lowest z-50 flex flex-col justify-between overflow-hidden md:overflow-visible border-r border-outline-variant shadow-xs transition-all duration-300 ${
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
        {/* 상단 고정 헤더 & 검색바 (shrink-0) */}
        <div className="p-3 shrink-0 flex flex-col gap-3">
          {/* 상단 브랜드 로고 & 3단계 모드 토글 버튼 */}
          {isIconOnly ? (
            /* 🌟 1. 아이콘 모드일 때: 홈 로고와 펼치기 버튼을 수직으로 깔끔하게 배치하여 겹침 방지 */
            <div className="hidden md:flex flex-col items-center gap-2 pt-1 w-full">
              <Link
                href="/"
                onMouseEnter={(e) => handleMouseEnterItem(e, "원퀴즈 홈")}
                onMouseLeave={handleMouseLeaveItem}
                className="p-1 rounded-xl group relative cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4 text-on-primary" />
                </div>
              </Link>

              <button
                type="button"
                onClick={() => handleModeSelect("full")}
                onMouseEnter={(e) => handleMouseEnterItem(e, "사이드바 펼치기")}
                onMouseLeave={handleMouseLeaveItem}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer group"
              >
                <ChevronRight size={16} />
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
                    All-in-One Workspace
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
        </div>

        {/* 🌟 우리가 직접 제작한 커스텀 오버레이 스크롤바가 적용된 네비게이션 영역 */}
        <CustomScrollArea
          className="flex-1 min-h-0 py-1"
          isIconOnly={isIconOnly}
          onScroll={() => setHoveredNav(null)}
        >
          {/* 4대 대분류 섹션별 네비게이션 렌더링 */}
          <nav className="flex flex-col gap-2">
            {filteredSections.map((section, sIdx) => (
              <div key={section.title} className="flex flex-col gap-1">
                {/* 대분류 제목 (전체 펼침 모드일 때만 표시) */}
                {!isIconOnly && (
                  <div className="px-3 pt-2 pb-0.5 text-[11px] font-bold text-on-surface-variant/70 tracking-wider">
                    {section.title}
                  </div>
                )}
                {/* 축소 모드일 때 섹션 간 얇은 구분선 */}
                {isIconOnly && sIdx > 0 && (
                  <div className="h-px bg-outline-variant/60 my-1 mx-2" />
                )}

                {section.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        onCloseMobile();
                        if (item.href === "/exam/subject" && typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("onequiz:reset-exam-selection"));
                        }
                      }}
                      onMouseEnter={(e) =>
                        handleMouseEnterItem(e, item.label)
                      }
                      onMouseLeave={handleMouseLeaveItem}
                      className={`group relative flex items-center rounded-xl transition-all font-semibold text-sm ${
                        isIconOnly
                          ? "justify-center w-10 h-10 mx-auto shrink-0 overflow-visible"
                          : "justify-between px-3 py-2.5"
                      } ${
                        active
                          ? "bg-surface-container text-on-surface font-bold shadow-xs border border-outline-variant/60"
                          : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                      }`}
                    >
                      {isIconOnly ? (
                        <Icon
                          className={`w-[19px] h-[19px] shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                            active ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"
                          }`}
                        />
                      ) : (
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon
                            className={`w-[18px] h-[18px] shrink-0 ${
                              active ? "text-primary" : "text-on-surface-variant"
                            }`}
                          />
                          <span className="truncate whitespace-nowrap">
                            {item.label}
                          </span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </CustomScrollArea>

        {/* 사이드바 하단 제어 영역 (모바일 브라우저 하단 툴바에 가려지지 않도록 안전 패딩 적용) */}
        <div className="shrink-0 p-3 flex flex-col gap-2.5 bg-surface-container-lowest border-t border-outline-variant pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] md:pb-3">
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
              onMouseEnter={(e) => handleMouseEnterItem(e, "테마 설정")}
              onMouseLeave={handleMouseLeaveItem}
              className="p-1.5 rounded-lg hover:bg-surface-container-low text-primary transition-colors cursor-pointer group"
              title={isIconOnly ? undefined : "24개 다중 테마 선택"}
            >
              <Palette className="w-4 h-4" />
            </button>

            {/* 환경 설정 (개인 설정) */}
            <Link
              href="/settings"
              onClick={onCloseMobile}
              onMouseEnter={(e) => handleMouseEnterItem(e, "개인 설정")}
              onMouseLeave={handleMouseLeaveItem}
              className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors group"
              title={isIconOnly ? undefined : "설정"}
            >
              <Settings className="w-4 h-4" />
            </Link>

            {/* 알림 (관리자일 때 대기 중인 피드백 알람 배지 연동) */}
            <Link
              href={session?.user?.role === "admin" ? "/settings/feedback" : "/settings"}
              onClick={onCloseMobile}
              onMouseEnter={(e) =>
                handleMouseEnterItem(
                  e,
                  session?.user?.role === "admin"
                    ? `피드백 알림 (${pendingFeedbackCount}건)`
                    : "알림"
                )
              }
              onMouseLeave={handleMouseLeaveItem}
              className="p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer group relative"
              title={
                isIconOnly
                  ? undefined
                  : session?.user?.role === "admin"
                  ? `알림 (미확인 피드백 ${pendingFeedbackCount}건)`
                  : "알림"
              }
            >
              <Bell className="w-4 h-4" />
              {session?.user?.role === "admin" && pendingFeedbackCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error animate-pulse" />
              )}
            </Link>
          </div>

          {/* 유저 세션 프로필 */}
          {session?.user ? (
            <div
              className={`flex items-center justify-between py-1 group ${
                isIconOnly ? "justify-center" : "px-1"
              }`}
            >
              <div
                className="flex items-center gap-2 min-w-0"
                onMouseEnter={(e) =>
                  handleMouseEnterItem(e, session.user?.name || "학습자")
                }
                onMouseLeave={handleMouseLeaveItem}
              >
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {session.user.name ? session.user.name[0].toUpperCase() : "U"}
                </div>
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
              onMouseEnter={(e) => handleMouseEnterItem(e, "로그인")}
              onMouseLeave={handleMouseLeaveItem}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer group ${
                isIconOnly ? "w-10 h-10 p-0 mx-auto" : "w-full"
              }`}
              title={isIconOnly ? undefined : "로그인"}
            >
              <LogIn className="w-4 h-4" />
              {!isIconOnly && <span>로그인</span>}
            </button>
          )}
        </div>

      </aside>

      {/* 🌟 축소 모드 전용: 뷰포트 고정 플로팅 말풍선 (document.body로 createPortal 하여 어떤 부모 컨테이너/스크롤/스택컨텍스트에서도 클리핑되지 않음) */}
      {mounted && isIconOnly && hoveredNav && createPortal(
        <div
          style={{
            top: `${hoveredNav.y}px`,
            left: `${hoveredNav.x}px`,
          }}
          className="hidden md:flex fixed -translate-y-1/2 items-center px-3 py-1.5 bg-neutral-900 text-white border border-neutral-700/80 rounded-lg text-xs font-semibold whitespace-nowrap shadow-2xl z-[999999] pointer-events-none animate-in fade-in zoom-in-95 duration-100"
        >
          {/* 말풍선 꼬리 화살표 (좌측 방향, 본체 색상과 100% 일치) */}
          <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[6px] border-r-neutral-900" />
          <span className="leading-none">{hoveredNav.label}</span>
        </div>,
        document.body
      )}
    </>
  );
}
