"use client";

import React from "react";
import { Plus, X } from "lucide-react";

interface NewProjectModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  template: "blank" | "sample";
  onTitleChange: (t: string) => void;
  onDescriptionChange: (d: string) => void;
  onTemplateChange: (tpl: "blank" | "sample") => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function NewProjectModal({
  isOpen,
  title,
  description,
  template,
  onTitleChange,
  onDescriptionChange,
  onTemplateChange,
  onSubmit,
  onClose,
}: NewProjectModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-primary" />
            <h3 className="ui-card-title text-base font-bold text-on-surface">
              새 프로젝트 ERD &amp; 명세서 생성
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              프로젝트 이름 *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="예: 이커머스 백엔드, 스터디 일정 관리 플랫폼"
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              프로젝트 개요 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={2}
              placeholder="데이터베이스 설계 목적 및 도메인 설명"
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
              시작 템플릿 선택
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => onTemplateChange("blank")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  template === "blank"
                    ? "bg-primary/10 border-primary ring-1 ring-primary/40 text-on-surface"
                    : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <div className="font-bold text-on-surface">⬜ 빈 캔버스 (추천)</div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  테이블 0개, 백지 상태에서 자유롭게 설계
                </div>
              </button>

              <button
                type="button"
                onClick={() => onTemplateChange("sample")}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  template === "sample"
                    ? "bg-primary/10 border-primary ring-1 ring-primary/40 text-on-surface"
                    : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <div className="font-bold text-on-surface">📦 기본 스타터 샘플</div>
                <div className="text-[11px] text-on-surface-variant mt-0.5">
                  User, Post, Comment 3개 기본 테이블 &amp; 관계
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
            <button
              type="button"
              onClick={onClose}
              className="ui-button px-3.5 py-2 rounded-xl border border-outline-variant hover:bg-surface-container text-xs text-on-surface cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="ui-button px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-bold shadow-xs cursor-pointer active:scale-[0.98]"
            >
              프로젝트 개설하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
