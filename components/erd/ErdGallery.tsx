"use client";

import React from "react";
import { Database, Plus, Search, Trash2 } from "lucide-react";
import { ProjectSummary } from "./types";

interface ErdGalleryProps {
  projectsList: ProjectSummary[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectProject: (id: string) => void;
  onOpenNewProjectModal: () => void;
  onDeleteProject: (id: string, title: string) => void;
}

export function ErdGallery({
  projectsList,
  searchQuery,
  onSearchChange,
  onSelectProject,
  onOpenNewProjectModal,
  onDeleteProject,
}: ErdGalleryProps) {
  const filteredProjects = projectsList.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full space-y-6 pb-12 animate-fade-in select-none">
      {/* 상단 표준 페이지 헤더 (Rule 52 & Rule 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="ui-page-title flex items-center gap-2">
              ERD &amp; 설계 명세서
              <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                {projectsList.length}개 프로젝트
              </span>
            </h1>
            <p className="ui-page-subtitle">
              프로젝트별 데이터베이스 ERD 다이어그램, 아키텍처 및 API 명세 형상관리
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenNewProjectModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>새 프로젝트 개설</span>
        </button>
      </div>

      {/* 검색창 */}
      <div className="flex justify-end">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            placeholder="프로젝트 제목 및 설명 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary font-medium"
          />
        </div>
      </div>

      {/* 프로젝트 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5 w-full">
        {/* 새 프로젝트 개설 점선 카드 */}
        <div
          onClick={onOpenNewProjectModal}
          className="group min-h-[190px] border-2 border-dashed border-outline-variant hover:border-primary rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all hover:bg-surface-container-low/50"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={24} />
          </div>
          <div>
            <div className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
              새 프로젝트 개설하기
            </div>
            <p className="ui-caption text-on-surface-variant mt-0.5">
              엔티티 ERD 및 API 명세서를 자유롭게 설계할 새 워크스페이스
            </p>
          </div>
        </div>

        {/* 프로젝트 카드 목록 */}
        {filteredProjects.map((p) => (
          <div
            key={p._id}
            onClick={() => onSelectProject(p._id)}
            className="group relative bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant hover:border-primary/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer min-h-[190px]"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="ui-badge text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                    v{p.version}
                  </span>
                  <span className="ui-badge text-[10px] px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium">
                    테이블 {p.tableCount}개
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(p._id, p.title);
                  }}
                  className="p-1.5 rounded-lg text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                  title="프로젝트 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <h3 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                {p.title}
              </h3>
              <p className="ui-caption text-on-surface-variant line-clamp-2 mt-1">
                {p.description || "설명이 등록되지 않은 데이터베이스 설계 프로젝트입니다."}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant/60 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
              <span>리비전 {p.revisionCount}회</span>
              <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
