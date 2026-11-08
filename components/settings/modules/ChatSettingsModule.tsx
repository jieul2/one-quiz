"use client";

import React from "react";
import { MessageSquare } from "lucide-react";

export function ChatSettingsModule() {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
        <MessageSquare size={15} className="text-primary" />
        <h2 className="ui-card-title text-on-surface">채팅 설정</h2>
      </div>
      <p className="ui-body text-on-surface-variant">
        메시지 전송 단축키 및 알림음을 설정합니다.
      </p>
    </div>
  );
}
