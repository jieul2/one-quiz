"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Palette, Maximize } from "lucide-react";

interface HeaderProps {
  onOpenThemeModal: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "대시보드", subtitle: "학습 현황과 일정을 한눈에 확인하세요" },
  "/exam": { title: "기출문제 풀이", subtitle: "자가 학습 및 문제 풀이" },
  "/exam/subject": { title: "과목 선택", subtitle: "응시할 과목을 선택하세요" },
  "/exam/type": { title: "회차 선택", subtitle: "응시할 기출 회차를 선택하세요" },
  "/calendar": { title: "캘린더", subtitle: "개인 일정 및 학습 플랜" },
  "/diary": { title: "일기", subtitle: "오늘 하루의 배움과 회고" },
  "/notes": { title: "노트", subtitle: "나만의 지식 보관함" },
  "/tasks": { title: "할일 관리", subtitle: "오늘의 우선순위 체크리스트" },
  "/drive": { title: "드라이브", subtitle: "문서 및 학습 자료 보관함" },
  "/bookmarks": { title: "북마크", subtitle: "자주 찾는 학습 링크 모음" },
  "/contacts": { title: "연락처", subtitle: "스터디원 및 멘토 연락처" },
  "/mindmap": { title: "마인드맵", subtitle: "생각 정리 및 개념도 구조화" },
  "/ideas": { title: "프로젝트 & 로드맵", subtitle: "스터디 프로젝트 및 기능 아이디어 보드" },
  "/chat": { title: "채팅", subtitle: "스터디원 및 동료와의 1:1 대화" },
  "/admin": { title: "관리자 허브", subtitle: "시스템 설정 및 기출문제 관리" },
};

export function Header({
  onOpenThemeModal,
}: HeaderProps) {
  const pathname = usePathname();

  // Find matching page info
  let pageInfo = PAGE_TITLES[pathname];
  if (!pageInfo) {
    if (pathname.startsWith("/exam")) pageInfo = PAGE_TITLES["/exam"];
    else if (pathname.startsWith("/admin")) pageInfo = PAGE_TITLES["/admin"];
    else pageInfo = { title: "원퀴즈", subtitle: "나혼자 공부하는 플랫폼" };
  }

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-surface/80 backdrop-blur-xl z-30 flex items-center justify-between px-space-lg border-b border-outline-variant shadow-xs">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-space-sm min-w-0">
        <h1 className="font-headline-md text-headline-sm text-on-surface font-bold truncate">
          {pageInfo.title}
        </h1>
        {pageInfo.subtitle && (
          <span className="hidden md:inline-block font-body-sm text-body-sm text-on-surface-variant truncate border-l border-outline-variant pl-space-sm">
            {pageInfo.subtitle}
          </span>
        )}
      </div>

      {/* Right: Actions Toolbar */}
      <div className="flex items-center gap-space-xs shrink-0">
        {/* Theme Palette Button */}
        <button
          type="button"
          onClick={onOpenThemeModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors border border-outline-variant"
          title="테마 변경"
        >
          <Palette className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline font-semibold">테마</span>
        </button>

        {/* Fullscreen Button */}
        <button
          type="button"
          onClick={toggleFullScreen}
          className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          title="전체화면"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
