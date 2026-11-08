"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsModuleView } from "@/components/settings/SettingsModuleView";
import { Loader2 } from "lucide-react";

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  // 레거시 쿼리스트링(?tab=...) 하위 호환 매핑
  const moduleName =
    tab === "admin-settings"
      ? "system"
      : tab === "admin-accounts"
      ? "accounts"
      : tab === "admin-logs"
      ? "logs"
      : tab === "admin-feedback"
      ? "feedback"
      : tab === "admin-questions"
      ? "questions"
      : tab === "admin-categories"
      ? "categories"
      : tab === "admin-database"
      ? "database"
      : tab || "overview";

  return <SettingsModuleView moduleName={moduleName} />;
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-on-surface">
          <Loader2 size={28} className="animate-spin text-primary" />
          <span className="ui-caption">설정 로딩 중...</span>
        </div>
      }
    >
      <AppShell>
        <SettingsPageContent />
      </AppShell>
    </Suspense>
  );
}
