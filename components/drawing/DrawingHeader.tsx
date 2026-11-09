"use client";

import React from "react";
import {
  ArrowLeft,
  Check,
  Save,
  BookOpen,
  Plus,
  Copy,
  Download,
  Loader2,
  ChevronDown,
  FileImage,
} from "lucide-react";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";

interface DrawingHeaderProps {
  title: string;
  isEditingTitle: boolean;
  tempTitle: string;
  mounted: boolean;
  saveStatus: SaveStatus;
  savedTimeStr: string;
  isSavingCard: boolean;
  isAddingToDiary: boolean;
  isDownloadOpen: boolean;
  onBackToList: () => void;
  onTitleClick: () => void;
  onTempTitleChange: (v: string) => void;
  onTitleSave: () => void;
  onTitleCancel: () => void;
  onSaveAsNewCard: () => void;
  onAddToTodayDiary: () => void;
  onNewDrawing: () => void;
  onCopyClipboard: () => void;
  onToggleDownload: () => void;
  onDownload: (format: "png" | "jpg" | "svg" | "json") => void;
}

export function DrawingHeader({
  title,
  isEditingTitle,
  tempTitle,
  mounted,
  saveStatus,
  savedTimeStr,
  isSavingCard,
  isAddingToDiary,
  isDownloadOpen,
  onBackToList,
  onTitleClick,
  onTempTitleChange,
  onTitleSave,
  onTitleCancel,
  onSaveAsNewCard,
  onAddToTodayDiary,
  onNewDrawing,
  onCopyClipboard,
  onToggleDownload,
  onDownload,
}: DrawingHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
      {/* 타이틀 및 저장 상태 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBackToList}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface transition-colors cursor-pointer mr-1 shadow-xs shrink-0"
          title="스케치 목록으로 돌아가기"
        >
          <ArrowLeft size={14} className="text-primary" />
          <span>스케치 목록</span>
        </button>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => onTempTitleChange(e.target.value)}
                  autoFocus
                  className="ui-section-title px-2 py-0.5 rounded-lg border border-primary bg-surface-container-low text-on-surface focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onTitleSave();
                    } else if (e.key === "Escape") {
                      onTitleCancel();
                    }
                  }}
                />
                <button
                  onClick={onTitleSave}
                  className="p-1 rounded text-primary hover:bg-primary/10"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={onTitleClick}
                className="ui-page-title text-on-surface hover:text-primary transition-colors text-left flex items-center gap-2 group"
                title="클릭하여 제목 수정"
              >
                <span>{mounted ? title : "새로운 스케치"}</span>
                <span className="text-xs text-on-surface-variant font-normal opacity-0 group-hover:opacity-100 transition-opacity">
                  (수정)
                </span>
              </button>
            )}
            <span className="ui-badge bg-primary/10 text-primary border border-primary/20 font-mono px-2 py-0.5 rounded-full">
              Vector Canvas
            </span>
          </div>
          <p className="ui-page-subtitle">
            자유로운 아이디어 스케치, 다이어그램, 수식 필기 및 고해상도 이미지 내보내기 지원
          </p>
        </div>
      </div>

      {/* 액션 버튼군 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Rule 51: 너비 고정 저장 인디케이터 (w-[118px]) */}
        <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />

        {/* 💾 새 카드형 저장 버튼 */}
        <button
          onClick={onSaveAsNewCard}
          disabled={isSavingCard}
          className="ui-button px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1.5 transition-colors font-medium shadow-xs"
          title="현재 스케치를 내 계정의 새 카드로 보관함에 저장"
        >
          {isSavingCard ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          <span>카드형 저장</span>
        </button>

        {/* 📖 오늘 일기에 추가 버튼 */}
        <button
          onClick={onAddToTodayDiary}
          disabled={isAddingToDiary}
          className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors font-medium"
          title="현재 캔버스 그림을 Cloudinary에 업로드하여 오늘 일기에 첨부"
        >
          {isAddingToDiary ? (
            <Loader2 size={15} className="animate-spin text-primary" />
          ) : (
            <BookOpen size={15} className="text-primary" />
          )}
          <span>오늘 일기에 추가</span>
        </button>

        <button
          onClick={onNewDrawing}
          className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors"
        >
          <Plus size={15} />
          <span>새 스케치</span>
        </button>

        <button
          onClick={onCopyClipboard}
          className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors"
          title="클립보드에 이미지 복사"
        >
          <Copy size={15} />
          <span className="hidden sm:inline">복사</span>
        </button>

        {/* 다운로드 드롭다운 */}
        <div className="relative">
          <button
            onClick={onToggleDownload}
            className="ui-button px-3.5 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 flex items-center gap-1.5 font-medium transition-all shadow-xs"
          >
            <Download size={15} />
            <span>내보내기</span>
            <ChevronDown size={13} />
          </button>

          {isDownloadOpen && (
            <div className="absolute right-0 mt-1.5 w-44 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95">
              <button
                onClick={() => onDownload("png")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-surface-container text-on-surface flex items-center gap-2 cursor-pointer font-medium"
              >
                <FileImage size={14} className="text-primary" />
                <span>PNG 고해상도 이미지</span>
              </button>
              <button
                onClick={() => onDownload("jpg")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-surface-container text-on-surface flex items-center gap-2 cursor-pointer font-medium"
              >
                <FileImage size={14} className="text-amber-500" />
                <span>JPG 압축 이미지</span>
              </button>
              <button
                onClick={() => onDownload("svg")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-surface-container text-on-surface flex items-center gap-2 cursor-pointer font-medium"
              >
                <Download size={14} className="text-emerald-500" />
                <span>SVG 벡터 파일</span>
              </button>
              <div className="h-px bg-outline-variant/60 my-1" />
              <button
                onClick={() => onDownload("json")}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-surface-container text-on-surface flex items-center gap-2 cursor-pointer font-medium"
              >
                <Download size={14} className="text-violet-500" />
                <span>JSON 원본 백업</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
