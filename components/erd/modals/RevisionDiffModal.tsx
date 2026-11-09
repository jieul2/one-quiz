"use client";

import React from "react";
import { X, RotateCcw } from "lucide-react";
import { RevisionSnapshot } from "../types";

interface RevisionDiffModalProps {
  revision: RevisionSnapshot | null;
  onRollback: (rev: RevisionSnapshot) => void;
  onClose: () => void;
}

export function RevisionDiffModal({
  revision,
  onRollback,
  onClose,
}: RevisionDiffModalProps) {
  if (!revision) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-xl w-full shadow-2xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-primary text-on-primary">
              v{revision.version}
            </span>
            <h3 className="ui-card-title text-on-surface font-bold truncate">스냅샷 상세 검토</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1">
          <p className="font-bold text-on-surface">{revision.message}</p>
          <p className="text-on-surface-variant">
            기록 일시: {new Date(revision.createdAt).toLocaleString()} · 작성자:{" "}
            {revision.authorEmail}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
          <div className="font-bold text-primary">
            포함된 테이블 ({revision.snapshot?.tables?.length || 0}개):
          </div>
          <div className="grid grid-cols-2 gap-2">
            {revision.snapshot?.tables?.map((t) => (
              <div
                key={t.id}
                className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/60"
              >
                <span className="font-bold text-on-surface block">{t.name}</span>
                <span className="text-[11px] text-on-surface-variant font-mono">
                  컬럼 {t.fields?.length || 0}개 {t.comment ? `· ${t.comment}` : ""}
                </span>
              </div>
            ))}
          </div>

          <div className="font-bold text-primary pt-2">
            기능 명세 ({revision.snapshot?.functionalSpecs?.length || 0}개):
          </div>
          <div className="space-y-1">
            {revision.snapshot?.functionalSpecs?.map((f) => (
              <div
                key={f.id}
                className="p-2 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-center justify-between"
              >
                <span className="font-medium text-on-surface">
                  [{f.module}] {f.title}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
          <button
            type="button"
            onClick={() => {
              onClose();
              onRollback(revision);
            }}
            className="ui-button px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>이 버전으로 복원하기</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="ui-button px-4 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container text-xs text-on-surface cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
