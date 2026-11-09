"use client";

import React from "react";
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  FolderGit2,
  GitBranch,
  Download,
  Sparkles,
  TableProperties,
  FileText,
  History,
} from "lucide-react";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { ErdTab } from "./types";

interface ErdHeaderProps {
  projectTitle: string;
  projectVersion: string;
  projectDescription?: string;
  tableCount: number;
  relationCount: number;
  projectsCount: number;
  revisionsCount: number;
  activeTab: ErdTab;
  saveStatus: SaveStatus;
  savedTimeStr: string | null;
  onBackToList: () => void;
  onOpenProjectListModal: () => void;
  onOpenNewProjectModal: () => void;
  onOpenCommitModal: () => void;
  onOpenExportModal: () => void;
  onLoadSampleTemplate: () => void;
  onChangeTab: (tab: ErdTab) => void;
}

export function ErdHeader({
  projectTitle,
  projectVersion,
  projectDescription,
  tableCount,
  relationCount,
  projectsCount,
  revisionsCount,
  activeTab,
  saveStatus,
  savedTimeStr,
  onBackToList,
  onOpenProjectListModal,
  onOpenNewProjectModal,
  onOpenCommitModal,
  onOpenExportModal,
  onLoadSampleTemplate,
  onChangeTab,
}: ErdHeaderProps) {
  return (
    <div className="space-y-3 pb-3 border-b border-outline-variant">
      {/* ================= 최상단 플랫 헤더 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* 프로젝트 타이틀 및 버전 메타 (목록으로 돌아가기 버튼 포함) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface transition-colors cursor-pointer mr-1 shadow-xs shrink-0"
            title="프로젝트 목록으로 돌아가기"
          >
            <ArrowLeft size={14} className="text-primary" />
            <span>프로젝트 목록</span>
          </button>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={onOpenProjectListModal}
                className="flex items-center gap-1.5 text-left ui-page-title text-on-surface hover:text-primary transition-colors cursor-pointer group"
                title="프로젝트 목록 열기 및 전환"
              >
                <span>{projectTitle}</span>
                <ChevronDown
                  size={18}
                  className="text-on-surface-variant group-hover:text-primary transition-colors shrink-0"
                />
              </button>

              <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-mono font-bold">
                v{projectVersion}
              </span>
              <span className="ui-badge px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-medium">
                테이블 {tableCount}개 · 관계 {relationCount}개
              </span>
            </div>
            <p className="ui-page-subtitle">
              {projectDescription ||
                "개인 및 팀 맞춤형 데이터베이스 ERD 시각화, 설계 명세서 및 형상관리 버전 스냅샷"}
            </p>
          </div>
        </div>

        {/* 액션 버튼군 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Rule 51: 너비 고정 저장 인디케이터 (w-[118px]) */}
          <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />

          {/* 새 프로젝트 생성 버튼 */}
          <button
            type="button"
            onClick={onOpenNewProjectModal}
            className="ui-button px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1.5 transition-colors font-medium shadow-xs"
            title="새로운 프로젝트 명세서 생성"
          >
            <Plus size={15} />
            <span>새 프로젝트</span>
          </button>

          {/* 프로젝트 목록 관리 버튼 */}
          <button
            type="button"
            onClick={onOpenProjectListModal}
            className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors"
            title="프로젝트 목록 열기"
          >
            <FolderGit2 size={15} />
            <span>프로젝트 ({projectsCount})</span>
          </button>

          {/* 형상관리 버전 커밋 버튼 */}
          <button
            type="button"
            onClick={onOpenCommitModal}
            className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors font-medium"
            title="현재 스키마 및 명세서를 새로운 버전 스냅샷으로 커밋"
          >
            <GitBranch size={15} />
            <span>버전 커밋</span>
          </button>

          {/* 코드 및 스키마 내보내기 버튼 */}
          <button
            type="button"
            onClick={onOpenExportModal}
            className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors"
          >
            <Download size={15} />
            <span>내보내기</span>
          </button>

          {/* 스타터 샘플 로드 버튼 */}
          <button
            type="button"
            onClick={onLoadSampleTemplate}
            className="ui-button px-3 py-1.5 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface flex items-center gap-1.5 transition-colors"
            title="기본 샘플 엔티티(User, Post, Comment) 불러오기"
          >
            <Sparkles size={15} className="text-amber-500" />
            <span className="hidden sm:inline">스타터 샘플</span>
          </button>
        </div>
      </div>

      {/* ================= 탭 네비게이션 툴바 ================= */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/60">
          <button
            type="button"
            onClick={() => onChangeTab("erd")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "erd"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <TableProperties size={14} />
            <span>인터랙티브 ERD</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab("specs")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "specs"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <FileText size={14} />
            <span>프로젝트 명세서</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab("history")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
          >
            <History size={14} />
            <span>형상관리 이력 ({revisionsCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
