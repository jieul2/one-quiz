"use client";

import React from "react";
import { X } from "lucide-react";
import { ErdTable } from "../types";

interface TableModalProps {
  isOpen: boolean;
  editingTable: ErdTable | null;
  name: string;
  comment: string;
  color: string;
  onNameChange: (v: string) => void;
  onCommentChange: (v: string) => void;
  onColorChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function TableModal({
  isOpen,
  editingTable,
  name,
  comment,
  color,
  onNameChange,
  onCommentChange,
  onColorChange,
  onSave,
  onClose,
}: TableModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-sm w-full shadow-2xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <h3 className="ui-card-title text-on-surface font-bold">
            {editingTable ? "테이블 정보 수정" : "새 엔티티 테이블 추가"}
          </h3>
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
            <label className="block text-on-surface-variant font-semibold mb-1">
              테이블명 (PascalCase)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="예: User, Payment, Article"
              autoFocus
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-mono focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-on-surface-variant font-semibold mb-1">설명 및 코멘트</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="예: 회원 및 인증 프로필 관리"
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-on-surface-variant font-semibold mb-1">카드 테마 색상</label>
            <div className="flex items-center gap-2">
              {["primary", "blue", "purple", "emerald", "rose", "amber"].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onColorChange(col)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    color === col
                      ? "scale-110 border-on-surface ring-2 ring-primary/40"
                      : "border-transparent"
                  }`}
                  style={{
                    backgroundColor:
                      col === "primary"
                        ? "var(--primary)"
                        : col === "blue"
                        ? "#3b82f6"
                        : col === "purple"
                        ? "#a855f7"
                        : col === "emerald"
                        ? "#10b981"
                        : col === "rose"
                        ? "#f43f5e"
                        : "#f59e0b",
                  }}
                />
              ))}
            </div>
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
            onClick={onSave}
            className="ui-button px-4 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold cursor-pointer"
          >
            {editingTable ? "수정 완료" : "테이블 생성"}
          </button>
        </div>
      </div>
    </div>
  );
}
