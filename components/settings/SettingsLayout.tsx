"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Users,
  Terminal,
  SlidersHorizontal,
  MessageSquareText,
  Database,
  ArrowRight,
  Tag,
  HardDrive,
} from "lucide-react";
import { GoogleMarkIcon } from "./common/GoogleMarkIcon";
import { SaveStatusIndicator } from "@/components/common/SaveStatusIndicator";
import { useSettings } from "./SettingsContext";

interface SettingsLayoutProps {
  activeModule: string;
  children: React.ReactNode;
}

export function SettingsLayout({ activeModule, children }: SettingsLayoutProps) {
  const { data: session } = useSession();
  const { saveStatus, savedTimeStr } = useSettings();

  const isAdmin = session?.user?.role === "admin";

  // 관리자 대기 중인 피드백 카운트
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadPendingCount() {
      if (!isAdmin) return;
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
    loadPendingCount();
    return () => {
      ignore = true;
    };
  }, [isAdmin]);

  // 1. 일반 서비스 탭 목록
  const navTabs = [
    { id: "overview", label: "개요", href: "/settings/overview", hasGoogle: false },
    { id: "calendar", label: "캘린더", href: "/settings/calendar", hasGoogle: true },
    { id: "notes", label: "노트", href: "/settings/notes", hasGoogle: false },
    { id: "tasks", label: "할일", href: "/settings/tasks", hasGoogle: false },
    { id: "drive", label: "드라이브", href: "/settings/drive", hasGoogle: true },
    { id: "bookmarks", label: "북마크", href: "/settings/bookmarks", hasGoogle: false },
    { id: "contacts", label: "연락처", href: "/settings/contacts", hasGoogle: true },
  ];

  // 2. 워크스페이스 탭 목록
  const subNavTabs = [
    { id: "mindmap", label: "마인드맵", href: "/settings/mindmap" },
    { id: "projects", label: "프로젝트", href: "/settings/projects" },
    { id: "chat", label: "채팅", href: "/settings/chat" },
  ];

  // 3. 관리자 전용 탭 목록
  const adminTabs = [
    { id: "categories", label: "카테고리관리", href: "/settings/categories", icon: Tag },
    { id: "questions", label: "문항관리", href: "/settings/questions", icon: Database },
    { id: "database", label: "DB관리", href: "/settings/database", icon: HardDrive },
    { id: "accounts", label: "계정관리", href: "/settings/accounts", icon: Users },
    { id: "logs", label: "감사로그", href: "/settings/logs", icon: Terminal },
    { id: "system", label: "운영설정", href: "/settings/system", icon: SlidersHorizontal },
    { id: "feedback", label: "피드백접수함", href: "/settings/feedback", icon: MessageSquareText },
  ];

  // 상단 소제목 계산
  const getSubTitle = (mod: string) => {
    switch (mod) {
      case "overview":
        return "원퀴즈 계정 연동 및 기본 설정";
      case "calendar":
        return "캘린더 및 일정 동기화 설정";
      case "notes":
        return "지식노트 및 일기 회고 설정";
      case "tasks":
        return "할일 보드 및 일정 관리 설정";
      case "drive":
        return "클라우드 드라이브 스토리지 연동";
      case "bookmarks":
        return "즐겨찾기 및 학습 북마크 관리";
      case "contacts":
        return "팀원 주소록 및 연락처 연동";
      case "mindmap":
        return "마인드맵 캔버스 및 레이아웃 설정";
      case "projects":
        return "프로젝트 간트 로드맵 설정";
      case "chat":
        return "그룹 스터디 채팅 환경 설정";
      case "categories":
        return "커뮤니티·블로그·캔버스 전역 카테고리 CRUD 관리";
      case "questions":
        return "기출문제 문항 및 시험 과목 관리";
      case "database":
        return "MongoDB 전체 스키마 데이터 CRUD 및 컬렉션 관리";
      case "accounts":
        return "전체 사용자 계정 및 권한 관리";
      case "logs":
        return "보안 및 시스템 감사 로그 모니터링";
      case "system":
        return "시스템 운영 정책 및 공지 배너 제어";
      case "feedback":
        return "사용자 피드백 접수 및 답변 관리";
      default:
        return "원퀴즈 서비스 설정";
    }
  };

  // 모듈 키 정규화
  const currentKey = activeModule === "admin-settings" ? "system" :
    activeModule === "admin-categories" ? "categories" :
    activeModule === "admin-accounts" ? "accounts" :
    activeModule === "admin-logs" ? "logs" :
    activeModule === "admin-feedback" ? "feedback" :
    activeModule === "admin-questions" ? "questions" :
    activeModule === "admin-database" ? "database" :
    activeModule;

  return (
    <div className="w-full space-y-4">
      {/* ================= 1. 최상단 플랫 헤더 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <h1 className="ui-page-title text-on-surface">설정</h1>
          <span className="ui-page-subtitle block mt-0.5">
            {getSubTitle(currentKey)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 저장 상태 인디케이터 (실시간 동기화) */}
          <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />
        </div>
      </div>

      {/* ================= 2열 구조 (좌측 사이드 탭 + 우측 컨텐츠) ================= */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* ================= 좌측 세로 탭 메뉴 ================= */}
        <div className="md:col-span-3 space-y-0.5 bg-surface-container-lowest p-1.5 rounded-lg border border-outline-variant select-none">
          {/* 1. 일반 서비스 탭 */}
          {navTabs.map((tab) => {
            const isActive = currentKey === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md ui-body transition-colors cursor-pointer ${
                  isActive
                    ? "bg-surface-container text-on-surface font-semibold"
                    : "text-on-surface-variant font-light hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <span>{tab.label}</span>
                {tab.hasGoogle && <GoogleMarkIcon />}
              </Link>
            );
          })}

          <div className="h-px bg-outline-variant my-1.5 mx-1" />

          {/* 2. 워크스페이스 탭 */}
          {subNavTabs.map((tab) => {
            const isActive = currentKey === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md ui-body transition-colors cursor-pointer ${
                  isActive
                    ? "bg-surface-container text-on-surface font-semibold"
                    : "text-on-surface-variant font-light hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <span>{tab.label}</span>
              </Link>
            );
          })}

          {/* 🌟 3. 관리자 전용 섹션 (관리자 권한 보유 시에만 노출) */}
          {isAdmin && (
            <>
              <div className="h-px bg-outline-variant my-2 mx-1" />
              <div className="px-3 py-1.5 text-primary flex items-center justify-between">
                <span className="ui-caption font-bold">관리자 설정</span>
                <span className="ui-badge px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  ADMIN
                </span>
              </div>

              {adminTabs.map((tab) => {
                const isActive = currentKey === tab.id;
                const Icon = tab.icon;

                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md ui-body transition-colors cursor-pointer group ${
                      isActive
                        ? "bg-surface-container text-on-surface font-semibold"
                        : "text-on-surface-variant font-light hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        size={14}
                        className={isActive ? "text-primary" : "text-on-surface-variant"}
                      />
                      <span>{tab.label}</span>
                    </div>

                    {tab.id === "questions" ? (
                      <ArrowRight
                        size={13}
                        className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                      />
                    ) : tab.id === "feedback" && pendingFeedbackCount > 0 ? (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-error text-white font-mono">
                        {pendingFeedbackCount}
                      </span>
                    ) : (
                      isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* ================= 우측 상세 설정 컨텐츠 패널 ================= */}
        <div className="md:col-span-9 space-y-3.5">{children}</div>
      </div>
    </div>
  );
}
