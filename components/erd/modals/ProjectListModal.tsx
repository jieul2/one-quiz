"use client";

import React from "react";
import { FolderGit2, X, Plus, Trash2 } from "lucide-react";
import { ProjectSummary } from "../types";

interface ProjectListModalProps {
  isOpen: boolean;
  projectsList: ProjectSummary[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onDeleteProject: (id: string, title: string) => void;
  onOpenNewProjectModal: () => void;
  onClose: () => void;
}

export function ProjectListModal({
  isOpen,
  projectsList,
  currentProjectId,
  onSelectProject,
  onDeleteProject,
  onOpenNewProjectModal,
  onClose,
}: ProjectListModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-lg w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <FolderGit2 size={18} className="text-primary" />
            <h3 className="ui-card-title text-base font-bold text-on-surface">
              데이터베이스 프로젝트 목록 ({projectsList.length}개)
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

        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {projectsList.length === 0 ? (
            <div className="py-8 text-center text-xs text-on-surface-variant">
              등록된 프로젝트가 없습니다.
            </div>
          ) : (
            projectsList.map((p) => {
              const isCurrent = p._id === currentProjectId;
              return (
                <div
                  key={p._id}
                  onClick={() => onSelectProject(p._id)}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isCurrent
                      ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                      : "bg-surface-container-low border-outline-variant/60 hover:bg-surface-container hover:border-primary/40"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-on-surface truncate">
                        {p.title}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-container text-primary font-bold">
                        v{p.version}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-on-primary font-bold shadow-2xs">
                          현재 작업 중
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-on-surface-variant truncate mt-0.5">
                        {p.description}
                      </p>
                    )}
                    <div className="text-[11px] text-on-surface-variant/70 font-mono mt-1">
                      테이블 {p.tableCount}개 · 리비전 {p.revisionCount}개 · 최근 수정:{" "}
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(p._id, p.title);
                    }}
                    className="p-2 rounded-lg text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                    title="프로젝트 삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewProjectModal();
            }}
            className="ui-button px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>+ 새 프로젝트 개설</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="ui-button px-4 py-2 rounded-xl border border-outline-variant hover:bg-surface-container text-xs text-on-surface cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
