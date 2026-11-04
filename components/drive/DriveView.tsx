"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  FileText,
  Table,
  PenTool,
  Plus,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { toast } from "@/lib/toast";

interface DriveDoc {
  id: string;
  name: string;
  type: "text" | "sheet" | "draw";
  updatedAt: string;
  size: string;
}

const DEFAULT_DOCS: DriveDoc[] = [];

export function DriveView() {
  const { data: session } = useSession();
  const [docs, setDocs] = useState<DriveDoc[]>(DEFAULT_DOCS);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>("");

  const markSaved = useCallback(() => {
    const now = new Date();
    setSavedTimeStr(
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    );
    setSaveStatus("saved");
  }, []);

  // 1. DB 또는 localStorage 로드
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (session?.user?.email) {
        try {
          const res = await fetch("/api/drive");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && isMounted) {
              setDocs(
                data.map((d: { id?: string; _id?: string; name: string; type?: "text" | "sheet" | "draw"; updatedAt?: string; size?: string }) => ({
                  id: d.id || d._id || String(Date.now()),
                  name: d.name,
                  type: d.type || "text",
                  updatedAt: d.updatedAt ? String(d.updatedAt).slice(0, 10) : "2026-11-04",
                  size: d.size || "12 KB",
                }))
              );
              markSaved();
              return;
            }
          }
        } catch (e) {
          console.warn("Drive DB fetch failed, falling back to localStorage", e);
        }
      }

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("onequiz_drive_docs");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && isMounted) {
              setDocs(parsed);
              markSaved();
              return;
            }
          } catch {}
        }
      }

      if (isMounted) {
        setDocs([]);
        markSaved();
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [session, markSaved]);

  const persistDocs = useCallback(
    async (items: DriveDoc[]) => {
      setSaveStatus("saving");
      setDocs(items);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("onequiz_drive_docs", JSON.stringify(items));
        } catch {}
      }

      if (session?.user?.email) {
        try {
          const res = await fetch("/api/drive", {
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
    },
    [session, markSaved]
  );

  const handleCreateDoc = async (type: "text" | "sheet" | "draw") => {
    const typeNames = { text: "텍스트 문서", sheet: "스프레드시트", draw: "캔버스 다이어그램" };
    const name = prompt(`새 ${typeNames[type]} 이름을 입력하세요:`, `새 문서 ${docs.length + 1}`);
    if (!name || !name.trim()) return;

    const newDoc: DriveDoc = {
      id: Date.now().toString(),
      name: name.includes(".")
        ? name.trim()
        : `${name.trim()}.${type === "text" ? "docx" : type === "sheet" ? "xlsx" : "draw"}`,
      type,
      updatedAt: new Date().toISOString().slice(0, 10),
      size: "12 KB",
    };

    const updated = [newDoc, ...docs];
    await persistDocs(updated);
    setShowCreateMenu(false);
    toast.success("새 문서가 생성되었습니다.");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 문서를 삭제하시겠습니까?")) return;
    const updated = docs.filter((d) => d.id !== id);
    await persistDocs(updated);
    toast.info("문서가 삭제되었습니다.");
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "sheet":
        return <Table className="w-5 h-5 text-emerald-500" />;
      case "draw":
        return <PenTool className="w-5 h-5 text-rose-500" />;
      default:
        return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-lg text-on-surface">
      {/* 1. 플랫 헤더 표준 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">드라이브</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono text-[11px] font-semibold">
            {docs.length}개
          </span>
        </div>

        <div className="flex items-center gap-2 relative">
          {session?.user ? (
            <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container-low text-on-surface-variant text-xs font-mono border border-outline-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>게스트 모드</span>
            </div>
          )}

          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-on-primary text-xs font-semibold hover:opacity-90 shadow-xs cursor-pointer transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>문서 생성</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showCreateMenu && (
            <div className="absolute right-0 top-10 w-44 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl z-20 p-1 flex flex-col gap-0.5">
              <button
                onClick={() => handleCreateDoc("text")}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface-container text-xs text-on-surface text-left cursor-pointer transition-colors"
              >
                <FileText className="w-4 h-4 text-primary" />
                <span>새 텍스트 문서</span>
              </button>
              <button
                onClick={() => handleCreateDoc("sheet")}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface-container text-xs text-on-surface text-left cursor-pointer transition-colors"
              >
                <Table className="w-4 h-4 text-emerald-500" />
                <span>새 스프레드시트</span>
              </button>
              <button
                onClick={() => handleCreateDoc("draw")}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-surface-container text-xs text-on-surface text-left cursor-pointer transition-colors"
              >
                <PenTool className="w-4 h-4 text-rose-500" />
                <span>새 캔버스/그리기</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Docs List */}
      <div className="flex flex-col gap-2">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest/50">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant mb-3">
              <FileText className="w-5 h-5 text-on-surface-variant" />
            </div>
            <p className="text-sm font-semibold text-on-surface">보관된 문서가 없습니다</p>
            <p className="text-xs text-on-surface-variant mt-1 mb-4">
              문서 생성 버튼을 눌러 새 텍스트 문서, 스프레드시트, 캔버스를 만들어보세요.
            </p>
            <button
              onClick={() => setShowCreateMenu(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>문서 생성</span>
            </button>
          </div>
        ) : (
          docs.map((doc) => (
            <div
              key={doc.id}
              className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant hover:border-primary/50 hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant">
                  {getTypeIcon(doc.type)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                    {doc.name}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono">
                    <span>{doc.updatedAt}</span>
                    <span>•</span>
                    <span>{doc.size}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-on-surface-variant hover:text-red-500 rounded-md transition-all cursor-pointer"
                  title="문서 삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
