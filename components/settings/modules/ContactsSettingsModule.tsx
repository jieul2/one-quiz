"use client";

import React from "react";
import { Users } from "lucide-react";

export function ContactsSettingsModule() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
        <Users size={15} className="text-primary" />
        <h2 className="ui-card-title text-on-surface">연락처 동기화</h2>
      </div>
      <p className="ui-body text-on-surface-variant">
        스터디 팀원들을 로드맵에 초대하기 위한 주소록을 연동합니다.
      </p>
    </div>
  );
}
