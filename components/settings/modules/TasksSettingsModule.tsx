"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { SwitchToggle } from "../common/SwitchToggle";
import { useSettings } from "../SettingsContext";
import { toast } from "@/lib/toast";

export function TasksSettingsModule() {
  const { markSaved } = useSettings();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
        <CheckCircle2 size={15} className="text-primary" />
        <h2 className="ui-card-title text-on-surface">할일 보드 설정</h2>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-container-low border border-outline-variant">
          <div>
            <p className="ui-card-title text-on-surface">완료 보드 기본 숨김</p>
            <p className="ui-caption text-on-surface-variant font-light">
              할일 페이지 접속 시 완료된 항목 칸을 기본으로 숨깁니다.
            </p>
          </div>
          <SwitchToggle
            checked={true}
            onChange={() => {
              markSaved();
              toast.success("완료 보드 기본 표시 설정이 저장되었습니다.");
            }}
          />
        </div>
      </div>
    </div>
  );
}
