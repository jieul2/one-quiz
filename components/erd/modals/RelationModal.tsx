"use client";

import React from "react";
import { Link2, X } from "lucide-react";
import { ErdTable } from "../types";

interface RelationModalProps {
  isOpen: boolean;
  tables: ErdTable[];
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
  relType: "1:1" | "1:N" | "N:M";
  comment: string;
  onFromTableChange: (tblId: string) => void;
  onFromFieldChange: (fldId: string) => void;
  onToTableChange: (tblId: string) => void;
  onToFieldChange: (fldId: string) => void;
  onRelTypeChange: (type: "1:1" | "1:N" | "N:M") => void;
  onCommentChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function RelationModal({
  isOpen,
  tables,
  fromTable,
  fromField,
  toTable,
  toField,
  relType,
  comment,
  onFromTableChange,
  onFromFieldChange,
  onToTableChange,
  onToFieldChange,
  onRelTypeChange,
  onCommentChange,
  onSave,
  onClose,
}: RelationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full shadow-2xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-primary" />
            <h3 className="ui-card-title text-on-surface font-bold">외래키(FK) 엔티티 관계 연결</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* 출발 테이블 & 컬럼 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-on-surface-variant font-semibold mb-1">
                출발 (기준) 테이블
              </label>
              <select
                value={fromTable}
                onChange={(e) => onFromTableChange(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-medium focus:outline-none"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-on-surface-variant font-semibold mb-1">
                출발 컬럼 (PK/FK)
              </label>
              <select
                value={fromField}
                onChange={(e) => onFromFieldChange(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-medium focus:outline-none"
              >
                {tables
                  .find((t) => t.id === fromTable)
                  ?.fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* 대상 테이블 & 컬럼 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-on-surface-variant font-semibold mb-1">
                대상 (Foreign) 테이블
              </label>
              <select
                value={toTable}
                onChange={(e) => onToTableChange(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-medium focus:outline-none"
              >
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-on-surface-variant font-semibold mb-1">
                대상 외래키 컬럼
              </label>
              <select
                value={toField}
                onChange={(e) => onToFieldChange(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface font-medium focus:outline-none"
              >
                {tables
                  .find((t) => t.id === toTable)
                  ?.fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.type})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* 관계 차수 */}
          <div>
            <label className="block text-on-surface-variant font-semibold mb-1">
              관계 차수 (Cardinality)
            </label>
            <div className="flex items-center gap-2">
              {(["1:1", "1:N", "N:M"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onRelTypeChange(type)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer ${
                    relType === type
                      ? "bg-primary text-on-primary border-primary shadow-xs"
                      : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:bg-surface-container"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-on-surface-variant font-semibold mb-1">관계 설명</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="예: 1명의 사용자가 여러 개의 일기 작성"
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low text-on-surface focus:outline-none focus:border-primary"
            />
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
            관계 연결하기
          </button>
        </div>
      </div>
    </div>
  );
}
