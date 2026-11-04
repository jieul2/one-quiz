"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardView } from "@/components/dashboard/DashboardView";

export default function HomePage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-on-surface-variant">
            원퀴즈 워크스페이스 로딩 중...
          </div>
        }
      >
        <DashboardView />
      </Suspense>
    </AppShell>
  );
}
