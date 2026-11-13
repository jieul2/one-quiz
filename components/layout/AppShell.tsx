"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Sidebar, SidebarMode } from "./Sidebar";
import { ThemeModal } from "@/components/theme/ThemeModal";
import { FeedbackModal } from "@/components/feedback/FeedbackModal";
import { Menu, PanelLeft, PanelLeftOpen } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

// 🌟 클라이언트 전역 캐시 및 하이드레이션 상태 관리
// 1) hasAppHydrated: 최초 SSR 하이드레이션 일치 검증 통과 여부
// 2) cachedSidebarMode: 페이지 간 이동(라우팅) 시 사이드바 모드가 "full"로 커졌다가 "icon"으로 줄어드는 깜빡임/시각적 지터 100% 방지
let hasAppHydrated = false;
let cachedSidebarMode: SidebarMode = "full";
if (typeof window !== "undefined") {
  try {
    const savedMode = localStorage.getItem("onequiz_sidebar_mode");
    if (savedMode === "hidden" || savedMode === "icon" || savedMode === "full") {
      cachedSidebarMode = savedMode;
    } else if (localStorage.getItem("onequiz_sidebar_collapsed") === "true") {
      cachedSidebarMode = "icon";
    }
  } catch {}
}

export function AppShell({ children }: AppShellProps) {
  // 1. 24개 테마 선택 모달 상태
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // 2. 사이드바 반응형 상태 (3단계 모드: "hidden"(아예 없음) | "icon"(아이콘만) | "full"(아이콘+글씨))
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // 최초 하이드레이션 시점(!hasAppHydrated)에는 SSR pre-render 결과("full")와 100% 일치시켜 Hydration Mismatch 방지
  // 이미 하이드레이션이 완료된 이후의 페이지 라우팅(CSR) 시점에는 cachedSidebarMode로 즉시 초기화하여 깜빡임/지터 방지
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    if (!hasAppHydrated) {
      return "full";
    }
    return cachedSidebarMode;
  });

  // 최초 SSR 마운트 직후 "full" -> "icon" 동기화 시 300ms 애니메이션이 동작하지 않도록 마운트 완료 후 트랜지션 활성화
  const [enableTransitions, setEnableTransitions] = useState(() => hasAppHydrated);

  // 초기 마운트 시 로컬스토리지 최신 설정 동기화
  useEffect(() => {
    hasAppHydrated = true;
    try {
      const savedMode = localStorage.getItem("onequiz_sidebar_mode");
      if (savedMode === "hidden" || savedMode === "icon" || savedMode === "full") {
        cachedSidebarMode = savedMode;
        setSidebarMode(savedMode);
      }
    } catch {}

    const timer = setTimeout(() => {
      setEnableTransitions(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // 🌟 전역 드래그 시작 시 기존 텍스트 선택(드래그) 영역 자동 해제 (잔상 방지)
  useEffect(() => {
    const handleGlobalDragStart = () => {
      if (typeof window !== "undefined") {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          sel.removeAllRanges();
        }
      }
    };

    window.addEventListener("dragstart", handleGlobalDragStart, { capture: true });
    return () => {
      window.removeEventListener("dragstart", handleGlobalDragStart, { capture: true });
    };
  }, []);

  const handleChangeSidebarMode = (mode: SidebarMode) => {
    cachedSidebarMode = mode;
    setSidebarMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_sidebar_mode", mode);
      localStorage.setItem("onequiz_sidebar_collapsed", String(mode === "icon"));
    }
  };

  const handleCycleSidebarMode = () => {
    setSidebarMode((prev) => {
      const next: SidebarMode =
        prev === "full" ? "icon" : prev === "icon" ? "hidden" : "full";
      cachedSidebarMode = next;
      if (typeof window !== "undefined") {
        localStorage.setItem("onequiz_sidebar_mode", next);
        localStorage.setItem("onequiz_sidebar_collapsed", String(next === "icon"));
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans transition-colors duration-200">
      {/* 1. 반응형 사이드바 (3단계: 완전 숨김 / 아이콘만 / 아이콘+글씨) */}
      <Suspense fallback={null}>
        <Sidebar
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
          mode={sidebarMode}
          onChangeMode={handleChangeSidebarMode}
          onCycleMode={handleCycleSidebarMode}
          isMobileOpen={isMobileNavOpen}
          onCloseMobile={() => setIsMobileNavOpen(false)}
          enableTransitions={enableTransitions}
        />
      </Suspense>

      {/* 2. 모바일 전용 하단 플로팅 메뉴 버튼 (헤더 제목 가림 원천 차단 & 한손 엄지 조작 편의성 극대화) */}
      {!isMobileNavOpen && (
        <div
          className="fixed left-4 z-40 md:hidden pointer-events-auto"
          style={{ bottom: "max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))" }}
        >
          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xs text-on-surface hover:text-primary active:scale-98 transition-all cursor-pointer"
            title="사이드바 메뉴 열기"
          >
            <Menu size={18} className="text-primary shrink-0" />
            <span className="text-xs font-bold text-on-surface">메뉴</span>
          </button>
        </div>
      )}

      {/* 2-1. PC 데스크톱에서 사이드바가 아예 없을 때(hidden) 즉시 꺼낼 수 있는 플로팅 토글러 */}
      {sidebarMode === "hidden" && (
        <div className="fixed top-3.5 left-3.5 z-40 hidden md:flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant rounded-xl p-1 shadow-xs transition-colors hover:border-primary/50">
          <button
            onClick={() => handleChangeSidebarMode("icon")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium cursor-pointer transition-colors"
            title="아이콘 모드로 사이드바 열기"
          >
            <PanelLeft size={15} className="text-primary" />
            <span className="text-xs">아이콘만</span>
          </button>
          <button
            onClick={() => handleChangeSidebarMode("full")}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium cursor-pointer transition-colors"
            title="전체 사이드바 펼치기 (아이콘+글씨)"
          >
            <PanelLeftOpen size={15} className="text-primary" />
            <span className="text-xs">전체 열기</span>
          </button>
        </div>
      )}

      {/* 3. 메인 컨텐츠 영역 (네브바 제외한 남은 공간을 100% 쾌적하게 활용하도록 유동적 레이아웃 적용) */}
      <div
        className={`min-h-screen ${enableTransitions ? "transition-all duration-300" : ""} w-full ${
          /* 3단계 사이드바 반응형 오프셋 */
          sidebarMode === "hidden"
            ? "md:pl-0"
            : sidebarMode === "icon"
            ? "md:pl-[72px]"
            : "md:pl-60"
        }`}
      >
        <main className="p-3.5 sm:p-6 md:p-8 w-full flex flex-col gap-4 sm:gap-6 transition-all duration-200">
          {children}
        </main>
      </div>

      {/* 4. 24개 테마 선택 모달 */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* 5. 전역 플로팅 피드백 & 버그 제보 모달 */}
      <FeedbackModal />
    </div>
  );
}
