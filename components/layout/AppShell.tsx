"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { ThemeModal } from "@/components/theme/ThemeModal";
import { Menu } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // 1. 24개 테마 선택 모달 상태
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // 2. 사이드바 반응형 상태 (모바일 열림 여부, 데스크톱/태블릿 축소 여부)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const savedCollapsed = localStorage.getItem("onequiz_sidebar_collapsed");
      if (savedCollapsed !== null) {
        return savedCollapsed === "true";
      }
      return window.innerWidth < 1024;
    }
    return false;
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("onequiz_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col font-sans transition-colors duration-200">
      {/* 1. 반응형 사이드바 (모바일 드로어 / 태블릿 아이콘 / 데스크톱 접기·열기) */}
      <Sidebar
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* 2. 모바일 전용 플로팅 메뉴 버튼 (모바일 화면에서 사이드바가 닫혀있을 때 원터치로 열기) */}
      <div className="fixed top-4 left-4 z-40 md:hidden">
        <button
          onClick={() => setIsMobileNavOpen(true)}
          className="p-2.5 bg-surface-container-lowest/90 backdrop-blur-md border border-outline-variant rounded-2xl shadow-md text-on-surface hover:text-primary transition-all cursor-pointer"
          title="메뉴 열기"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* 3. 메인 컨텐츠 영역 (별도의 상단 헤더 없이 상단부터 시원하게 시작) */}
      <div
        className={`min-h-screen transition-all duration-300 ${
          /* 좌측 사이드바 반응형 오프셋 */
          isSidebarCollapsed ? "md:pl-[72px]" : "md:pl-60"
        }`}
      >
        <main className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
          {children}
        </main>
      </div>

      {/* 4. 24개 테마 선택 모달 */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </div>
  );
}
