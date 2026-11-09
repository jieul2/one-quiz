"use client";

import React from "react";
import { GitBranch, X } from "lucide-react";

interface CommitModalProps {
  isOpen: boolean;
  version: string;
  message: string;
  tableCount: number;
  relationCount: number;
  functionalSpecsCount: number;
  apiSpecsCount: number;
  onVersionChange: (v: string) => void;
  onMessageChange: (m: string) => void;
  onCommit: () => void;
  onClose: () => void;
}

export function CommitModal({
  isOpen,
  version,
  message,
  tableCount,
  relationCount,
  functionalSpecsCount,
  apiSpecsCount,
  onVersionChange,
  onMessageChange,
  onCommit,
  onClose,
}: CommitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full shadow-2xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-primary" />
            <h3 className="ui-card-title text-on-surface font-bold">새 버전 스냅샷 커밋</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-on-surface-variant font-semibold mb-1">버전 태그</label>
            <input
              type="text"
              value={version}
              onChange={(e) => onVersionChange(e.target.value)}
              placeholder="예: 1.1.0, 2.0.0-rc1"
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-on-surface-variant font-semibold mb-1">
              커밋 메시지 (변경 내역)
            </label>
            <textarea
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              rows={3}
              placeholder="예: 스케치 그림판 및 일기 연동 스키마 추가, 기출문제 풀이 이력 분리"
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary leading-relaxed"
            />
          </div>

          <div className="p-3 bg-surface-container-low rounded-xl text-on-surface-variant space-y-1">
            <p className="font-semibold text-primary">스냅샷 포함 대상:</p>
            <p>• ERD 엔티티 테이블 {tableCount}개 및 관계 {relationCount}개</p>
            <p>• 시스템 아키텍처 개요 및 기능 명세서 {functionalSpecsCount}개</p>
            <p>• API 엔드포인트 명세서 {apiSpecsCount}개</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            className="ui-button px-3.5 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-xs text-on-surface cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onCommit}
            className="ui-button px-4 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold cursor-pointer"
          >
            커밋 기록하기
          </button>
        </div>
      </div>
    </div>
  );
}
