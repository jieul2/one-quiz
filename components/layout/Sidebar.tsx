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
  PanelLeft,
  PanelLeftOpen,
  Database,
  Wallet,
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
  enableTransitions?: boolean;
}

export function Sidebar({
  onOpenThemeModal,
  mode,
  onChangeMode,
  isCollapsed: legacyCollapsed,
  onToggleCollapse: legacyToggle,
  isMobileOpen,
  onCloseMobile,
  enableTransitions = true,
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
        { label: "ERD & 설계 명세서", href: "/erd", icon: Database },
        { label: "프로젝트 로드맵", href: "/projects", icon: FolderGit2 },
        { label: "기능 백로그", href: "/ideas", icon: Lightbulb },
      ],
    },
    {
      title: "일상 & 라이프",
      items: [
        { label: "스마트 가계부", href: "/finance", icon: Wallet },
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
        className={`fixed left-0 top-0 h-screen h-[100dvh] max-h-[100dvh] bg-surface-container-lowest z-50 flex flex-col justify-between overflow-hidden md:overflow-visible border-r border-outline-variant shadow-xs ${
          enableTransitions ? "transition-all duration-300" : ""
        } ${
          /* 모바일: 서랍식 슬라이드 (아이콘 모드 시 컴팩트 w-24, 펼침 모드 시 w-72) */
          isMobileOpen
            ? isIconOnly
              ? "translate-x-0 w-24 pointer-events-auto"
              : "translate-x-0 w-72 pointer-events-auto"
            : isHidden
            ? "-translate-x-full md:-translate-x-full w-0 pointer-events-none opacity-0"
            : "-translate-x-full md:translate-x-0 opacity-100"
        } ${
          /* 태블릿 & 데스크톱: 3단계 너비 (0px ↔ 72px ↔ 240px) */
          isIconOnly ? "md:w-[72px]" : currentMode === "full" ? "md:w-60" : "md:w-0"
        }`}
      >
        {/* 상단 고정 헤더 & 검색바 (아이폰 노치 및 다이내믹 아일랜드 safe-area-inset-top 자동 대응) */}
        <div className="p-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] shrink-0 flex flex-col gap-2.5">
          {/* 브랜드 로고 & 닫기/숨기기 컨트롤 */}
          {isIconOnly ? (
            <div className="flex flex-col items-center gap-2 pt-1 w-full">
              {/* 모바일 전용 닫기 (X) 버튼 (아이콘 모드일 때는 로고 위에 단독 배치하여 절대 가리지 않음) */}
              <div className="w-full flex justify-end md:hidden">
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
                  title="메뉴 닫기"
                >
                  <X size={18} />
                </button>
              </div>

              <Link
                href="/"
                onClick={onCloseMobile}
                className="flex items-center justify-center group"
                title="원퀴즈 홈으로 이동"
              >
                <div className="w-8 h-8 rounded-xl bg-surface-container-high/60 flex items-center justify-center shadow-xs shrink-0 p-1 group-hover:scale-105 transition-transform border border-outline-variant/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/favicon.ico"
                    alt="원퀴즈 로고"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between min-w-0 w-full gap-2 pt-1">
              <Link
                href="/"
                onClick={onCloseMobile}
                className="flex items-center gap-2.5 min-w-0 flex-1 group"
                title="원퀴즈 홈으로 이동"
              >
                <div className="w-8 h-8 rounded-xl bg-surface-container-high/60 flex items-center justify-center shadow-xs shrink-0 p-1 group-hover:scale-105 transition-transform border border-outline-variant/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/favicon.ico"
                    alt="원퀴즈 로고"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>

                <div className="flex flex-col min-w-0 overflow-hidden">
                  <span className="text-[17px] font-black tracking-tight text-on-surface leading-tight truncate">
                    원퀴즈
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-medium tracking-wide truncate">
                    All-in-One Workspace
                  </span>
                </div>
              </Link>

              {/* 모바일 전용 닫기 (X) 버튼 (shrink-0으로 로고와 절대 겹치지 않고 우측에 독립 배치) */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container md:hidden cursor-pointer shrink-0"
                title="메뉴 닫기"
              >
                <X size={20} />
              </button>

              {/* PC 데스크톱 컨트롤: 완전히 숨기기(EyeOff) */}
              <div className="hidden md:flex items-center gap-0.5 bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/60 shrink-0">
                <button
                  type="button"
                  onClick={() => handleModeSelect("hidden")}
                  className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                  title="사이드바 완전히 숨기기 (0px)"
                >
                  <EyeOff size={13} />
                </button>
              </div>
            </div>
          )}

          {/* 🌟 모바일 & 데스크톱 네브바 뷰 모드 선택기 (아이콘만 vs 글씨 포함) */}
          <div
            className={`flex items-center bg-surface-container-low p-1 rounded-xl border border-outline-variant/60 gap-1 select-none ${
              isIconOnly ? "flex-col" : "w-full"
            }`}
          >
            <button
              type="button"
              onClick={() => handleModeSelect("icon")}
              className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isIconOnly
                  ? "bg-primary text-on-primary shadow-xs p-1.5 w-full"
                  : "flex-1 py-1 px-2 text-on-surface-variant hover:text-on-surface"
              }`}
              title="아이콘만 표시 모드"
            >
              <PanelLeft size={13} />
              {!isIconOnly && <span>아이콘만</span>}
            </button>
            <button
              type="button"
              onClick={() => handleModeSelect("full")}
              className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                !isIconOnly
                  ? "bg-primary text-on-primary shadow-xs flex-1 py-1 px-2 font-bold"
                  : "p-1.5 w-full text-on-surface-variant hover:text-on-surface"
              }`}
              title="글씨 포함 전체 표시 모드"
            >
              <PanelLeftOpen size={13} />
              {!isIconOnly && <span>글씨 포함</span>}
            </button>
          </div>

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
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error" />
              )}
            </Link>
          </div>

          {/* 유저 세션 프로필 */}
          {session?.user ? (
            <div
              className={`flex flex-col gap-1 py-1 group ${
                isIconOnly ? "items-center" : "px-1"
              }`}
            >
              <div className="flex items-center justify-between w-full">
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

              {/* 약관 및 개인정보처리방침 링크 */}
              {!isIconOnly && (
                <div className="flex items-center justify-start gap-2 text-[10.5px] text-on-surface-variant/70 pt-1.5 border-t border-outline-variant/40">
                  <Link href="/terms" onClick={onCloseMobile} className="hover:text-on-surface transition-colors">
                    이용약관
                  </Link>
                  <span>·</span>
                  <Link href="/privacy" onClick={onCloseMobile} className="hover:text-on-surface transition-colors">
                    개인정보처리방침
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                const currentPath =
                  typeof window !== "undefined"
                    ? window.location.pathname + window.location.search
                    : "/";
                const targetUrl =
                  !currentPath || currentPath.startsWith("/auth")
                    ? "/"
                    : currentPath;
                signIn(undefined, { callbackUrl: targetUrl });
              }}
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
