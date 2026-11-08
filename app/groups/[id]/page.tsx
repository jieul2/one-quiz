"use client";

import React, { Suspense } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { GroupDetailView } from "@/components/groups/GroupDetailView";
import { Loader2 } from "lucide-react";

function GroupDetailContent() {
  const params = useParams();
  const id = (params?.id as string) || "";

  return <GroupDetailView groupId={id} />;
}

export default function GroupDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-on-surface">
          <Loader2 size={28} className="animate-spin text-primary" />
          <span className="ui-caption">스터디룸 로딩 중...</span>
        </div>
      }
    >
      <AppShell>
        <GroupDetailContent />
      </AppShell>
    </Suspense>
  );
}
