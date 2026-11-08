"use client";

import React, { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { GroupListView } from "@/components/groups/GroupListView";
import { Loader2 } from "lucide-react";

export default function GroupsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-on-surface">
          <Loader2 size={28} className="animate-spin text-primary" />
          <span className="ui-caption">스터디 그룹 로딩 중...</span>
        </div>
      }
    >
      <AppShell>
        <GroupListView />
      </AppShell>
    </Suspense>
  );
}
