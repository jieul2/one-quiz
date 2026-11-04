"use client";

import React from "react";
import { useMounted } from "@/lib/hooks/useMounted";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveStatusIndicatorProps {
  status?: SaveStatus;
  savedAt?: string | Date | null;
  className?: string;
}

export function SaveStatusIndicator({
  status = "saved",
  savedAt,
  className = "",
}: SaveStatusIndicatorProps) {
  const mounted = useMounted();

  const formattedTime = React.useMemo(() => {
    if (!mounted) return "";
    if (!savedAt) {
      const now = new Date();
      return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    }
    if (typeof savedAt === "string") {
      // 이미 "HH:mm" 형태라면 그대로 반환
      if (/^\d{2}:\d{2}$/.test(savedAt)) return savedAt;
      const d = new Date(savedAt);
      if (!isNaN(d.getTime())) {
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
      return savedAt;
    }
    const d = savedAt;
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, [mounted, savedAt]);

  if (status === "saving") {
    return (
      <div
        className={`flex items-center gap-1.5 text-xs text-on-surface-variant font-light px-2 py-0.5 select-none ${className}`}
        title="데이터를 서버에 동기화 중입니다"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
        <span>저장 중...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={`flex items-center gap-1.5 text-xs text-destructive font-light px-2 py-0.5 select-none ${className}`}
        title="저장 중 오류가 발생했습니다"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
        <span>저장 실패</span>
      </div>
    );
  }

  // 기본 "saved" 또는 "idle" (사진1과 100% 동일한 도트 + "저장됨 · HH:mm")
  return (
    <div
      className={`flex items-center gap-1.5 text-xs text-on-surface-variant font-light px-2 py-0.5 select-none ${className}`}
      title={formattedTime ? `마지막 저장 시간: ${formattedTime}` : "서버에 안전하게 보존되었습니다"}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      <span>저장됨{formattedTime ? ` · ${formattedTime}` : ""}</span>
    </div>
  );
}
