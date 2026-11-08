"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DrawingView } from "@/components/drawing/DrawingView";
import { useMounted } from "@/lib/hooks/useMounted";
import { Loader2 } from "lucide-react";

export default function DrawingPage() {
  const mounted = useMounted();

  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <span className="ui-caption text-on-surface-variant">그림판 로딩 중...</span>
          </div>
        }
      >
        {mounted ? (
          <DrawingView />
        ) : (
          <div className="w-full min-h-[600px] flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <span className="ui-caption text-on-surface-variant">그림판 로딩 중...</span>
          </div>
        )}
      </Suspense>
    </AppShell>
  );
}
