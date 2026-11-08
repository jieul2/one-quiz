"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Palette, Maximize } from "lucide-react";

interface HeaderProps {
  onOpenThemeModal: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "대시보드", subtitle: "일정과 주요 업무, 워크스페이스 현황을 한눈에 확인하세요" },
  "/calendar": { title: "캘린더", subtitle: "일정 및 프로젝트 마일스톤 관리" },
  "/tasks": { title: "할일 플래너", subtitle: "오늘의 우선순위 체크리스트" },
  "/diary": { title: "오늘의 일기", subtitle: "하루의 생각과 소중한 일상 기록" },
  "/board": { title: "커뮤니티 광장", subtitle: "자유로운 소통과 토론, 질문 및 정보 공유" },
  "/blog": { title: "인사이트 블로그", subtitle: "기술 아티클과 인사이트 기록" },
  "/chat": { title: "라운지 채팅", subtitle: "실시간 대화와 소통" },
  "/canvas": { title: "아이디어 캔버스", subtitle: "포스트잇과 회의를 위한 자유로운 2D 공간" },
  "/mindmap": { title: "2D 마인드맵", subtitle: "생각 정리 및 브레인스토밍 구조화" },
  "/projects": { title: "프로젝트 로드맵", subtitle: "프로젝트 진행 상황 및 마일스톤 관리" },
  "/ideas": { title: "기능 백로그", subtitle: "아이디어와 백로그 보드" },
  "/running": { title: "러닝(달리기) 기록", subtitle: "달리기 인증 및 AI 러닝 코치 피드백" },
  "/drive": { title: "클라우드 드라이브", subtitle: "문서 및 파일 보관함" },
  "/bookmarks": { title: "웹 북마크", subtitle: "자주 찾는 유용한 웹 링크 모음" },
  "/groups": { title: "스터디 그룹", subtitle: "함께 공부하고 기능을 공유하는 그룹 공간" },
  "/exam": { title: "기출문제 풀이", subtitle: "자가 진단 및 문제 풀이" },
  "/exam/subject": { title: "기출문제 학습 설정", subtitle: "응시할 과목과 기출 회차를 선택하여 맞춤 모의고사를 시작하세요" },
  "/exam/type": { title: "기출문제 회차 선택", subtitle: "과목 및 회차 선택 페이지로 연결됩니다" },
  "/learning": { title: "학습 성장 리포트", subtitle: "180일 활동 잔디와 학습 통계" },
  "/notes": { title: "노트", subtitle: "나만의 지식 보관함" },
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
    else if (pathname.startsWith("/settings")) pageInfo = { title: "환경 설정", subtitle: "개인화 및 시스템 옵션 관리" };
    else pageInfo = { title: "원퀴즈", subtitle: "올인원 통합 워크스페이스" };
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
