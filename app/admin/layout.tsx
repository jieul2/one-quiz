"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { AppShell } from "@/components/layout/AppShell";
import {
  ShieldAlert,
  Database,
  Users,
  Terminal,
  Settings,
  User,
  ChevronRight,
  Lock,
} from "lucide-react";
import { useMounted } from "@/lib/hooks/useMounted";


interface AdminNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const mounted = useMounted();

  const adminNav: AdminNavItem[] = [
    { label: "콘솔 개요", href: "/admin", icon: ShieldAlert },
    { label: "문항 관리", href: "/admin/questions", icon: Database },
    { label: "계정 관리", href: "/admin/accounts", icon: Users },
    { label: "감사 로그", href: "/admin/logs", icon: Terminal },
    { label: "운영 설정", href: "/admin/settings", icon: Settings },
  ];

  if (!mounted) return null;

  if (status === "loading") {
    return (
      <AppShell>
        <div className="min-h-[60vh] flex items-center justify-center text-on-surface-variant text-xs font-medium">
          관리자 권한 확인 중...
        </div>
      </AppShell>
    );
  }

  // 1. 로그인하지 않은 경우
  if (!session) {
    return (
      <AppShell>
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">관리자 인증 허브</h2>
              <p className="text-xs text-on-surface-variant font-light mt-1">
                관리자 콘솔에 접근하려면 로그인이 필요합니다.
              </p>
            </div>
            <button
              onClick={() => signIn()}
              className="w-full py-2.5 bg-primary text-on-primary font-bold rounded-md text-xs hover:opacity-90 cursor-pointer"
            >
              로그인 페이지로 이동
            </button>
            <div>
              <Link href="/" className="text-xs text-on-surface-variant hover:text-on-surface">
                ← 홈으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
        <div className="hidden" aria-hidden="true">
          {children}
        </div>
      </AppShell>
    );
  }

  // 2. 관리자 권한이 아닌 경우
  if (session.user?.role !== "admin") {
    return (
      <AppShell>
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-on-surface">접근 권한이 없습니다</h2>
              <p className="text-xs text-on-surface-variant font-light mt-1">
                현재 계정({session.user?.email})은 일반 사용자 권한입니다.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => signOut()}
                className="flex-1 py-2 bg-surface-container-low text-on-surface rounded-md text-xs font-medium hover:bg-surface-container transition-colors"
              >
                로그아웃
              </button>
              <Link
                href="/"
                className="flex-1 py-2 bg-primary text-on-primary rounded-md text-xs font-bold flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                홈으로 가기
              </Link>
            </div>
          </div>
        </div>
        <div className="hidden" aria-hidden="true">
          {children}
        </div>
      </AppShell>
    );
  }

  // 3. 정상 관리자 화면 (settings 페이지와 100% 동일한 2열 구조)
  return (
    <AppShell>
      <div className="w-full space-y-4 text-on-surface select-none">
        {/* 상단 공통 플랫 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight">
                관리자 콘솔
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                Admin
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-light mt-0.5">
              원퀴즈 시스템 및 데이터 관리 허브
            </p>
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface font-medium px-2.5 py-1.5 rounded-md bg-surface-container-low border border-outline-variant w-max transition-colors"
          >
            <User size={13} className="text-primary" />
            <span>개인 설정으로 이동</span>
            <ChevronRight size={12} />
          </Link>
        </div>

        {/* settings 페이지와 동일한 2열 구조 (좌측 사이드 탭 + 우측 컨텐츠) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
          {/* ================= 좌측 세로 관리자 탭 메뉴 ================= */}
          <div className="md:col-span-3 space-y-0.5 bg-surface-container-lowest p-1.5 rounded-lg border border-outline-variant">
            {adminNav.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                    isActive
                      ? "bg-surface-container text-on-surface font-semibold"
                      : "text-on-surface-variant font-light hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={isActive ? "text-primary" : "text-on-surface-variant"} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </Link>
              );
            })}

            <div className="h-px bg-outline-variant my-1.5 mx-1" />

            <Link
              href="/settings"
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs text-on-surface-variant font-light hover:bg-surface-container-low hover:text-on-surface transition-colors"
            >
              <div className="flex items-center gap-2">
                <User size={14} />
                <span>개인 설정</span>
              </div>
            </Link>
          </div>

          {/* ================= 우측 상세 컨텐츠 영역 ================= */}
          <div className="md:col-span-9 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

