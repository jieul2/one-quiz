"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Network, Plus, ArrowRight, X, Trash2 } from "lucide-react";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { toast } from "@/lib/toast";

interface MindmapItem {
  id: string;
  title: string;
  nodeCount: number;
  lastEdited: string;
  rootNode: string;
  branches: string[];
}

const DEFAULT_MINDMAPS: MindmapItem[] = [];

export function MindmapView() {
  const { data: session } = useSession();
  const [mindmaps, setMindmaps] = useState<MindmapItem[]>(DEFAULT_MINDMAPS);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>("");
  const [activeMindmap, setActiveMindmap] = useState<MindmapItem | null>(null);

  const markSaved = useCallback(() => {
    const now = new Date();
    setSavedTimeStr(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    );
    setSaveStatus("saved");
  }, []);

  // 1. 초기 데이터 로드 (DB 우선, 실패/미인증 시 localStorage)
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (session?.user?.email) {
        try {
          const res = await fetch("/api/mindmap");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              const mapped: MindmapItem[] = data.map(
                (d: {
                  _id?: string;
                  id?: string;
                  title: string;
                  nodeCount?: number;
                  lastEdited?: string;
                  rootNode?: string;
                  branches?: string[];
                }) => ({
                  id: d._id || d.id || String(Date.now()),
                  title: d.title,
                  nodeCount: d.nodeCount || 5,
                  lastEdited: d.lastEdited || new Date().toISOString().slice(0, 10),
                  rootNode: d.rootNode || d.title,
                  branches: d.branches || [],
                })
              );
              if (isMounted) {
                setMindmaps(mapped);
                markSaved();
                return;
              }
            }
          }
        } catch (e) {
          console.warn("Failed to load mindmaps from DB, falling back to localStorage", e);
        }
      }

      // LocalStorage 백업 로드
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("onequiz_mindmaps_items");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (isMounted && Array.isArray(parsed)) {
              setMindmaps(parsed);
              markSaved();
              return;
            }
          } catch {}
        }
      }

      if (isMounted) {
        setMindmaps([]);
        markSaved();
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [session, markSaved]);

  const persistMindmaps = async (items: MindmapItem[]) => {
    setSaveStatus("saving");
    setMindmaps(items);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("onequiz_mindmaps_items", JSON.stringify(items));
      } catch {}
    }

    if (session?.user?.email) {
      try {
        const res = await fetch("/api/mindmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(items),
        });
        if (!res.ok) throw new Error("DB 저장 실패");
        markSaved();
      } catch {
        setSaveStatus("error");
      }
    } else {
      markSaved();
    }
  };

  const handleCreate = async () => {
    const title = prompt("새 마인드맵 주제를 입력하세요:", "새 마인드맵");
    if (!title || !title.trim()) return;

    const newMap: MindmapItem = {
      id: Date.now().toString(),
      title: title.trim(),
      nodeCount: 5,
      lastEdited: new Date().toISOString().slice(0, 10),
      rootNode: title.trim(),
      branches: ["핵심 개념 1", "핵심 개념 2", "세부 기출 유형"],
    };

    const updated = [newMap, ...mindmaps];
    await persistMindmaps(updated);
    setActiveMindmap(newMap);
    toast.success("새 마인드맵이 생성되었습니다.");
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("이 마인드맵을 삭제하시겠습니까?")) return;

    const updated = mindmaps.filter((m) => m.id !== id);
    await persistMindmaps(updated);
    if (activeMindmap?.id === id) {
      setActiveMindmap(null);
    }
    toast.info("마인드맵이 삭제되었습니다.");
  };

  return (
    <div className="flex flex-col w-full gap-space-lg text-on-surface">
      {/* 1. 최상단 헤더 (플랫 헤더 표준) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">마인드맵</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-semibold font-mono">
            {mindmaps.length}개
          </span>
        </div>

        <div className="flex items-center gap-2">
          {session?.user ? (
            <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low text-on-surface-variant text-xs font-mono border border-outline-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>게스트 모드</span>
            </div>
          )}
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>새 마인드맵</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {mindmaps.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Network className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-on-surface">생성된 마인드맵이 없습니다</h3>
            <p className="text-xs text-on-surface-variant font-light max-w-sm">
              우측 상단의 &apos;+ 새 마인드맵&apos; 버튼을 눌러 첫 번째 생각과 핵심 개념 구조도를 그려보세요.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs mt-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 마인드맵 만들기</span>
          </button>
        </div>
      ) : (
        /* Grid of Mindmap Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {mindmaps.map((map) => (
            <div
              key={map.id}
              onClick={() => setActiveMindmap(map)}
              className="group p-4 rounded-lg bg-surface-container-lowest border border-outline-variant hover:border-primary/50 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between min-h-[200px] relative"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                    노드 {map.nodeCount}개
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-on-surface-variant font-mono">{map.lastEdited}</span>
                    <button
                      onClick={(e) => handleDelete(map.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-on-surface-variant hover:text-red-500 rounded transition-all"
                      title="마인드맵 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                  {map.title}
                </h3>

                {/* Visual Branch Preview */}
                <div className="p-2.5 rounded-md bg-surface-container-low border border-outline-variant flex flex-col gap-1 text-[11px]">
                  <div className="font-bold text-primary flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{map.rootNode}</span>
                  </div>
                  <div className="pl-3 border-l border-outline-variant flex flex-col gap-1 text-on-surface-variant font-light">
                    {map.branches.slice(0, 3).map((b, idx) => (
                      <div key={idx} className="truncate">↳ {b}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 text-caption font-semibold text-primary gap-1">
                <span>캔버스 열기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active Mindmap Interactive Canvas Modal */}
      {activeMindmap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-[70vh] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl p-space-lg flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" />
                <span className="font-headline-md font-bold text-on-surface">{activeMindmap.title}</span>
              </div>
              <button
                onClick={() => setActiveMindmap(null)}
                className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulated Node Visualizer */}
            <div className="flex-1 bg-surface-container-low/50 rounded-xl my-space-md border border-outline-variant relative flex items-center justify-center overflow-auto p-8">
              <div className="flex flex-col items-center gap-8">
                {/* Central Root Node */}
                <div className="px-6 py-3 rounded-2xl bg-primary text-on-primary font-bold shadow-md text-center">
                  {activeMindmap.rootNode}
                </div>

                {/* Branches Container */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {activeMindmap.branches.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-surface-container-lowest border border-primary/40 shadow-xs text-center font-body-sm font-semibold text-on-surface"
                    >
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-outline-variant text-caption text-on-surface-variant">
              <span>드래그 또는 휠로 캔버스를 이동할 수 있습니다.</span>
              <button
                onClick={() => setActiveMindmap(null)}
                className="px-4 py-1.5 rounded-xl bg-primary text-on-primary font-bold text-body-sm cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
