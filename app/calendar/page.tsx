"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";
import { Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useMounted } from "@/lib/hooks/useMounted";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarView } from "@/components/calendar/CalendarView";


export default function CalendarPage() {
  const { data: session, status } = useSession();
  const mounted = useMounted();

  if (!mounted) return null;

  if (status === "loading") {
    return (
      <AppShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center text-on-surface gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-xs font-medium text-on-surface-variant">
            캘린더를 준비하는 중...
          </p>
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 sm:p-8 rounded-lg shadow-xl border border-outline-variant w-full max-w-sm text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Lock size={24} />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-bold text-on-surface">캘린더</h1>
              <p className="text-xs text-on-surface-variant font-light">
                일정을 확인하고 관리하려면 로그인이 필요합니다.
              </p>
            </div>
            <button
              onClick={() => signIn()}
              className="w-full bg-primary hover:opacity-90 text-on-primary font-semibold py-2.5 px-4 rounded-md transition-all text-xs cursor-pointer"
            >
              로그인하기
            </button>
            <div>
              <Link
                href="/"
                className="text-xs text-on-surface-variant hover:text-on-surface font-light transition-colors"
              >
                ← 메인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <CalendarView />
    </AppShell>
  );
}
