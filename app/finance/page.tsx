"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { FinanceView } from "@/components/finance/FinanceView";

export default function FinancePage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-on-surface-variant text-sm">
            스마트 가계부 로딩 중...
          </div>
        }
      >
        <FinanceView />
      </Suspense>
    </AppShell>
  );
}
