"use client";

import React from "react";
import { Code2, X, Copy, Download } from "lucide-react";
import { ExportFormat } from "../types";

interface ExportModalProps {
  isOpen: boolean;
  format: ExportFormat;
  code: string;
  onFormatChange: (fmt: ExportFormat) => void;
  onCopy: () => void;
  onDownload: () => void;
  onClose: () => void;
}

export function ExportModal({
  isOpen,
  format,
  code,
  onFormatChange,
  onCopy,
  onDownload,
  onClose,
}: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-2xl w-full shadow-2xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <Code2 size={18} className="text-primary" />
            <h3 className="ui-card-title text-on-surface font-bold">ERD &amp; 스키마 코드 내보내기</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* 포맷 탭 선택 */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/60 shrink-0">
          <button
            type="button"
            onClick={() => onFormatChange("mermaid")}
            className={`flex-1 py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              format === "mermaid" ? "bg-primary text-on-primary shadow-xs" : "text-on-surface-variant"
            }`}
          >
            Mermaid erDiagram
          </button>
          <button
            type="button"
            onClick={() => onFormatChange("sql")}
            className={`flex-1 py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              format === "sql" ? "bg-primary text-on-primary shadow-xs" : "text-on-surface-variant"
            }`}
          >
            SQL DDL
          </button>
          <button
            type="button"
            onClick={() => onFormatChange("ts")}
            className={`flex-1 py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              format === "ts" ? "bg-primary text-on-primary shadow-xs" : "text-on-surface-variant"
            }`}
          >
            TypeScript
          </button>
          <button
            type="button"
            onClick={() => onFormatChange("json")}
            className={`flex-1 py-1 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              format === "json" ? "bg-primary text-on-primary shadow-xs" : "text-on-surface-variant"
            }`}
          >
            형상관리 JSON
          </button>
        </div>

        {/* 코드 뷰어 */}
        <div className="flex-1 overflow-hidden relative rounded-xl border border-outline-variant bg-surface-container-low">
          <textarea
            readOnly
            value={code}
            rows={14}
            className="w-full h-full p-4 font-mono text-xs text-on-surface bg-transparent focus:outline-none resize-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
          <button
            type="button"
            onClick={onCopy}
            className="ui-button px-3.5 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-xs text-on-surface flex items-center gap-1.5 cursor-pointer"
          >
            <Copy size={13} />
            <span>클립보드 복사</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="ui-button px-3.5 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-xs text-on-surface cursor-pointer"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="ui-button px-4 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span>파일 다운로드</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
