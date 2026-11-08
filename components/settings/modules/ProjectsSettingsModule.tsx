"use client";

import React from "react";
import { FolderGit2 } from "lucide-react";

export function ProjectsSettingsModule() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
        <FolderGit2 size={15} className="text-primary" />
        <h2 className="ui-card-title text-on-surface">프로젝트 로드맵 설정</h2>
      </div>
      <p className="ui-body text-on-surface-variant">
        간트 차트 타임라인 기본 줌 레벨과 팀원 댓글 알림을 설정합니다.
      </p>
    </div>
  );
}
