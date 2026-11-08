"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { SwitchToggle } from "../common/SwitchToggle";
import { useSettings } from "../SettingsContext";
import { toast } from "@/lib/toast";

export function CalendarSettingsModule() {
  const { markSaved } = useSettings();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
        <Calendar size={15} className="text-primary" />
        <h2 className="ui-card-title text-on-surface">캘린더 동기화 설정</h2>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-container-low border border-outline-variant">
          <div>
            <p className="ui-card-title text-on-surface">일정 자동 동기화</p>
            <p className="ui-caption text-on-surface-variant font-light">10분마다 일정을 동기화합니다.</p>
          </div>
          <SwitchToggle
            checked={true}
            onChange={() => {
              markSaved();
              toast.success("자동 동기화 설정이 변경되었습니다.");
            }}
          />
        </div>
      </div>
    </div>
  );
}
