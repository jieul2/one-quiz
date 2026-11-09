"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ErdView } from "@/components/erd/ErdView";
import { Loader2 } from "lucide-react";

export default function ErdPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-on-surface-variant">
            <Loader2 size={24} className="animate-spin text-primary" />
            <span className="text-sm">ERD 및 프로젝트 명세서 로딩 중...</span>
          </div>
        }
      >
        <ErdView />
      </Suspense>
    </AppShell>
  );
}
