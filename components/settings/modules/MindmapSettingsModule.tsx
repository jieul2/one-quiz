"use client";

import React from "react";
import { Network } from "lucide-react";

export function MindmapSettingsModule() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
        <Network size={15} className="text-primary" />
        <h2 className="ui-card-title text-on-surface">마인드맵 캔버스 설정</h2>
      </div>
      <p className="ui-body text-on-surface-variant">
        개념 정리 마인드맵 노드의 자동 정렬 및 배경 격자를 설정합니다.
      </p>
    </div>
  );
}
