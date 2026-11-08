"use client";

import React from "react";
import { Folder } from "lucide-react";

export function DriveSettingsModule() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
        <Folder size={15} className="text-primary" />
        <h2 className="ui-card-title text-on-surface">드라이브 스토리지 연동</h2>
      </div>
      <p className="ui-body text-on-surface-variant">
        원퀴즈 전용 폴더에 기출 모의고사 PDF 및 학습 자료를 보관합니다.
      </p>
    </div>
  );
}
