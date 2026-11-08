"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsModuleView } from "@/components/settings/SettingsModuleView";
import { Loader2 } from "lucide-react";

function SettingsDynamicContent() {
  const params = useParams();
  const moduleParam = (params?.module as string) || "overview";

  return <SettingsModuleView moduleName={moduleParam} />;
}

export default function SettingsDynamicPage() {
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
        <SettingsDynamicContent />
      </AppShell>
    </Suspense>
  );
}
