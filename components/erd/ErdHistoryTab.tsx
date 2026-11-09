"use client";

import React from "react";
import { History, Eye, RotateCcw } from "lucide-react";
import { RevisionSnapshot } from "./types";

interface ErdHistoryTabProps {
  revisions: RevisionSnapshot[];
  onSelectRevisionForDiff: (rev: RevisionSnapshot) => void;
  onRollback: (rev: RevisionSnapshot) => void;
}

export function ErdHistoryTab({
  revisions,
  onSelectRevisionForDiff,
  onRollback,
}: ErdHistoryTabProps) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          <History size={18} className="text-primary" />
          <h2 className="ui-section-title">형상관리 커밋 타임라인 ({revisions.length}건)</h2>
        </div>
        <p className="ui-caption text-on-surface-variant font-light">
          각 리비전 스냅샷으로 1클릭 복원(Rollback)하거나 차이점을 조회할 수 있습니다.
        </p>
      </div>

      {revisions.length === 0 ? (
        <div className="py-12 text-center text-on-surface-variant space-y-2">
          <History size={32} className="mx-auto opacity-40 text-primary" />
          <p className="font-semibold text-sm">아직 커밋된 버전 스냅샷이 없습니다.</p>
          <p className="ui-caption">상단의 &apos;버전 커밋&apos; 버튼을 눌러 첫 번째 버전 스냅샷을 기록해 보세요.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-outline-variant/80 ml-4 space-y-6 pl-6 my-4">
          {revisions.map((rev, idx) => (
            <div key={idx} className="relative group">
              {/* 타임라인 노드 아이콘 */}
              <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-surface-container-lowest border-2 border-primary group-hover:scale-125 transition-transform" />

              <div className="bg-surface-container-low border border-outline-variant/80 rounded-xl p-4 shadow-2xs space-y-2 hover:border-primary/60 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary text-on-primary shadow-xs">
                      v{rev.version}
                    </span>
                    <span className="font-bold text-sm text-on-surface">{rev.message}</span>
                  </div>

                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => onSelectRevisionForDiff(rev)}
                      className="px-2.5 py-1 rounded-lg border border-outline-variant hover:bg-surface-container text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye size={12} />
                      <span>내용 검토</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRollback(rev)}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="이 버전 상태로 전체 복원"
                    >
                      <RotateCcw size={12} />
                      <span>이 버전으로 복원</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-on-surface-variant font-mono pt-1 border-t border-outline-variant/40">
                  <span>작성자: {rev.authorEmail}</span>
                  <span>·</span>
                  <span>
                    일시: {new Date(rev.createdAt).toLocaleDateString()}{" "}
                    {new Date(rev.createdAt).toLocaleTimeString()}
                  </span>
                  <span>·</span>
                  <span className="text-primary font-semibold">
                    스냅샷: 테이블 {rev.snapshot?.tables?.length || 0}개 · 기능{" "}
                    {rev.snapshot?.functionalSpecs?.length || 0}개 · API{" "}
                    {rev.snapshot?.apiSpecs?.length || 0}개
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
