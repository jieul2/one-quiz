"use client";

import React, { useState, useEffect } from "react";
import { LayoutGrid, List, Plus, X, ArrowRight } from "lucide-react";

interface ProjectItem {
  _id?: string;
  title: string;
  description: string;
  status: "idea" | "progress" | "completed";
  priority: "urgent" | "high" | "medium" | "low";
  createdAt: string;
  color?: string;
  tags?: string[];
}

const DEFAULT_PROJECTS: ProjectItem[] = [];

export function ProjectsView() {
  const [projects, setProjects] = useState<ProjectItem[]>(DEFAULT_PROJECTS);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState<"urgent" | "high" | "medium" | "low">("medium");
  const [newStatus, setNewStatus] = useState<"idea" | "progress" | "completed">("idea");

  useEffect(() => {
    // Try to load from /api/ideas if authenticated
    async function loadIdeas() {
      try {
        const res = await fetch("/api/ideas");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setProjects(data);
          }
        }
      } catch {}
    }
    loadIdeas();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: ProjectItem = {
      _id: Date.now().toString(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      priority: newPriority,
      status: newStatus,
      createdAt: "2026-11-04",
      color: "#4f46e5",
      tags: ["신규"],
    };

    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          priority: newPriority,
          status: newStatus,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        setProjects([saved, ...projects]);
      } else {
        setProjects([newItem, ...projects]);
      }
    } catch {
      setProjects([newItem, ...projects]);
    }

    setNewTitle("");
    setNewDesc("");
    setShowModal(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">완료됨</span>;
      case "progress":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">진행 중</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant">아이디어</span>;
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Action Bar (라운딩 박스 없이 플랫 헤더) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <h1 className="ui-page-title">
            프로젝트
          </h1>
          <span className="ui-badge px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono">
            {projects.length}개
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center bg-surface-container-low p-0.5 rounded-md border border-outline-variant">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-surface-container text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="그리드 뷰"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-surface-container text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
              title="리스트 뷰"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 rounded-md font-medium text-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 프로젝트</span>
          </button>
        </div>
      </div>

      {/* Projects Grid or List View */}
      {projects.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
            <LayoutGrid className="w-5 h-5 text-on-surface-variant" />
          </div>
          <p className="ui-card-title">등록된 프로젝트가 없습니다</p>
          <p className="ui-caption">
            새 프로젝트를 생성하여 목표와 진행 상황을 체계적으로 관리해보세요.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-3.5 py-1.5 rounded-md font-medium text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 프로젝트</span>
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {projects.map((proj) => (
            <div
              key={proj._id}
              className="group relative bg-surface-container-lowest rounded-2xl border border-outline-variant p-space-lg shadow-xs hover:border-primary/50 hover:shadow-sm transition-all flex flex-col justify-between min-h-[190px]"
            >
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: proj.color || "#4f46e5" }}
                    />
                    {getStatusBadge(proj.status)}
                  </div>
                  <span className="text-[11px] text-on-surface-variant uppercase font-semibold">
                    {proj.priority}
                  </span>
                </div>

                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface group-hover:text-primary transition-colors mt-1">
                  {proj.title}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">
                  {proj.description || "설명이 등록되지 않았습니다."}
                </p>
              </div>

              <div className="flex items-center justify-between pt-space-sm border-t border-outline-variant/60 mt-space-sm text-caption text-on-surface-variant">
                <span>{new Date(proj.createdAt).toLocaleDateString("ko-KR")}</span>
                <span className="font-semibold text-primary flex items-center gap-0.5">
                  자세히 보기 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((proj) => (
            <div
              key={proj._id}
              className="flex items-center justify-between p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-primary/50 transition-all"
            >
              <div className="flex items-center gap-space-md min-w-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: proj.color || "#4f46e5" }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-headline-sm font-bold text-on-surface truncate">
                    {proj.title}
                  </span>
                  <span className="font-body-sm text-on-surface-variant truncate">
                    {proj.description}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-space-md shrink-0">
                {getStatusBadge(proj.status)}
                <span className="text-caption text-on-surface-variant hidden sm:inline">
                  {new Date(proj.createdAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-space-lg flex flex-col gap-space-md">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2">
              <span className="font-headline-sm font-bold text-on-surface">새 프로젝트 생성</span>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">프로젝트 제목</label>
                <input
                  type="text"
                  required
                  placeholder="예: 원퀴즈 모의고사 풀이 세션"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-on-surface-variant">설명 및 계획</label>
                <textarea
                  rows={3}
                  placeholder="프로젝트의 목적과 목표를 작성하세요..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-space-sm">
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">우선순위</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as "urgent" | "high" | "medium" | "low")}
                    className="bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface"
                  >
                    <option value="urgent">긴급 (Urgent)</option>
                    <option value="high">높음 (High)</option>
                    <option value="medium">보통 (Medium)</option>
                    <option value="low">낮음 (Low)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-label-sm text-on-surface-variant">진행 상태</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as "idea" | "progress" | "completed")}
                    className="bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface"
                  >
                    <option value="idea">아이디어</option>
                    <option value="progress">진행 중</option>
                    <option value="completed">완료</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-body-sm text-on-surface-variant hover:bg-surface-container"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-body-sm hover:opacity-90"
                >
                  생성하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
