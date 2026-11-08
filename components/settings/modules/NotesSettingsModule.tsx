"use client";

import React from "react";
import { FileText } from "lucide-react";
import { SwitchToggle } from "../common/SwitchToggle";
import { useSettings } from "../SettingsContext";
import { toast } from "@/lib/toast";

export function NotesSettingsModule() {
  const { markSaved } = useSettings();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
        <FileText size={15} className="text-primary" />
        <h2 className="ui-card-title text-on-surface">노트 & 일기 설정</h2>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-container-low border border-outline-variant">
          <div>
            <p className="ui-card-title text-on-surface">학습 일기 하루 1회 알림</p>
            <p className="ui-caption text-on-surface-variant font-light">
              매일 저녁 9시에 오늘의 회고 작성을 알려드립니다.
            </p>
          </div>
          <SwitchToggle
            checked={true}
            onChange={() => {
              markSaved();
              toast.success("일기 알림 설정이 변경되었습니다.");
            }}
          />
        </div>
      </div>
    </div>
  );
}
