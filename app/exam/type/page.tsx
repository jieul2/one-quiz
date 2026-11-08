"use client";

import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Loader2 } from "lucide-react";

function ExamTypeRedirectContent() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/exam/subject");
  }, [router]);

  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <Loader2 size={24} className="animate-spin text-primary" />
      <p className="text-sm">통합 과목 및 회차 선택 페이지로 이동 중...</p>
    </div>
  );
}

export default function ExamTypeSelectionPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <ExamTypeRedirectContent />
      </Suspense>
    </AppShell>
  );
}
