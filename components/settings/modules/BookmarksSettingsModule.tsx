"use client";

import React from "react";
import { Bookmark } from "lucide-react";

export function BookmarksSettingsModule() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
        <Bookmark size={15} className="text-primary" />
        <h2 className="ui-card-title text-on-surface">북마크 설정</h2>
      </div>
      <p className="ui-body text-on-surface-variant">
        자주 방문하는 학습 링크 및 즐겨찾기 폴더를 관리합니다.
      </p>
    </div>
  );
}
