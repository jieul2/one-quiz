"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BoardView } from "@/components/board/BoardView";
import { Loader2 } from "lucide-react";

export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-on-surface">
          <Loader2 size={28} className="animate-spin text-primary" />
          <span className="ui-caption">게시판 로딩 중...</span>
        </div>
      }
    >
      <AppShell>
        <BoardView />
      </AppShell>
    </Suspense>
  );
}
