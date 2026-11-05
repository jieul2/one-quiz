"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Bookmark, Star, Plus, Trash2, ExternalLink } from "lucide-react";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { toast } from "@/lib/toast";

interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  category: string;
  starred: boolean;
}

const DEFAULT_BOOKMARKS: BookmarkItem[] = [];

export function BookmarksView() {
  const { data: session } = useSession();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(DEFAULT_BOOKMARKS);
  const [selectedCat, setSelectedCat] = useState("전체");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCat, setNewCat] = useState("자격시험");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>("");

  const categories = ["전체", "자격시험", "공식문서", "개발도구", "기타"];

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
          const res = await fetch("/api/bookmarks");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && isMounted) {
              setBookmarks(
                data.map((b: { id?: string; _id?: string; title: string; url: string; category?: string; starred?: boolean }) => ({
                  id: b.id || b._id || String(Date.now()),
                  title: b.title,
                  url: b.url,
                  category: b.category || "자격시험",
                  starred: Boolean(b.starred),
                }))
              );
              markSaved();
              return;
            }
          }
        } catch (e) {
          console.warn("DB load failed, falling back to localStorage", e);
        }
      }

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("onequiz_bookmarks_data");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && isMounted) {
              setBookmarks(parsed);
              markSaved();
              return;
            }
          } catch {}
        }
      }

      if (isMounted) {
        setBookmarks([]);
        markSaved();
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [session, markSaved]);

  const persistBookmarks = useCallback(
    async (items: BookmarkItem[]) => {
      setSaveStatus("saving");
      setBookmarks(items);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("onequiz_bookmarks_data", JSON.stringify(items));
        } catch {}
      }

      if (session?.user?.email) {
        try {
          const res = await fetch("/api/bookmarks", {
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

  const filtered = bookmarks.filter((b) => {
    if (selectedCat === "전체") return true;
    return b.category === selectedCat;
  });

  const toggleStar = async (id: string) => {
    const updated = bookmarks.map((b) => (b.id === id ? { ...b, starred: !b.starred } : b));
    await persistBookmarks(updated);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 북마크를 삭제하시겠습니까?")) return;
    const updated = bookmarks.filter((b) => b.id !== id);
    await persistBookmarks(updated);
    toast.info("북마크가 삭제되었습니다.");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    const newItem: BookmarkItem = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      url: newUrl.startsWith("http") ? newUrl.trim() : `https://${newUrl.trim()}`,
      category: newCat,
      starred: false,
    };
    const updated = [newItem, ...bookmarks];
    await persistBookmarks(updated);
    setNewTitle("");
    setNewUrl("");
    setShowAddModal(false);
    toast.success("새 북마크가 추가되었습니다.");
  };

  return (
    <div className="flex flex-col w-full gap-space-lg text-on-surface">
      {/* 비로그인(게스트) 안내 배너 */}
      {!session?.user && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              <strong>게스트 체험 모드:</strong> 북마크가 브라우저에 임시 저장됩니다. 계정에 영구 저장하려면 로그인하세요.
            </span>
          </div>
        </div>
      )}

      {/* 1. 최상단 헤더 (플랫 헤더 표준) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <h1 className="ui-page-title">북마크</h1>
          <span className="ui-badge px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono">
            {bookmarks.length}개
          </span>
          {!session?.user && (
            <span className="ui-badge px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant">
              로컬 저장
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          {session?.user ? (
            <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low text-on-surface-variant text-xs font-mono border border-outline-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>게스트 모드</span>
            </div>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-on-primary text-sm font-semibold hover:opacity-90 shadow-xs cursor-pointer transition-opacity"
          >
            <Plus className="w-4 h-4" />
            <span>북마크 추가</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all shrink-0 cursor-pointer ${
              selectedCat === cat
                ? "bg-primary text-on-primary shadow-xs"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Bookmarks Grid / Empty State */}
      {filtered.length === 0 ? (
        <div className="py-16 px-4 flex flex-col items-center justify-center text-center gap-3 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Bookmark className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="ui-card-title">등록된 북마크가 없습니다</h3>
            <p className="ui-caption max-w-sm">
              {selectedCat === "전체"
                ? "자주 찾는 학습 사이트나 공식 문서를 북마크에 추가해보세요."
                : `'${selectedCat}' 카테고리에 등록된 북마크가 없습니다.`}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs mt-1"
          >
            <Plus className="w-4 h-4" />
            <span>북마크 추가하기</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant hover:border-primary/50 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-surface-container flex items-center justify-center shrink-0 border border-outline-variant">
                    <Bookmark className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-base font-bold text-on-surface hover:text-primary transition-colors truncate flex items-center gap-1"
                    >
                      <span className="truncate">{b.title}</span>
                      <ExternalLink className="w-4 h-4 text-on-surface-variant shrink-0" />
                    </a>
                    <span className="text-xs text-on-surface-variant truncate font-light font-mono">
                      {b.url}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleStar(b.id)}
                  className={`p-1.5 rounded-md cursor-pointer ${
                    b.starred ? "text-amber-500 fill-amber-500" : "text-on-surface-variant hover:text-amber-500"
                  }`}
                  title="즐겨찾기 토글"
                >
                  <Star className={`w-4 h-4 ${b.starred ? "fill-amber-500 text-amber-500" : ""}`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-outline-variant text-[11px] text-on-surface-variant">
                <span className="px-2 py-0.5 rounded bg-surface-container font-medium">#{b.category}</span>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>삭제</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl p-5 flex flex-col gap-4">
            <span className="text-base font-bold text-on-surface">새 북마크 추가</span>
            <form onSubmit={handleAdd} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">북마크 이름</label>
                <input
                  type="text"
                  required
                  placeholder="예: 큐넷(Q-Net) 국가자격시험"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-surface-container px-3 py-2 rounded-md border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">URL 링크</label>
                <input
                  type="text"
                  required
                  placeholder="예: https://example.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="bg-surface-container px-3 py-2 rounded-md border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface-variant">카테고리</label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="bg-surface-container px-3 py-2 rounded-md border border-outline-variant text-xs text-on-surface focus:outline-hidden focus:border-primary"
                >
                  <option value="자격시험">자격시험</option>
                  <option value="공식문서">공식문서</option>
                  <option value="개발도구">개발도구</option>
                  <option value="기타">기타</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs text-on-surface-variant hover:bg-surface-container cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-md bg-primary text-on-primary font-bold text-xs cursor-pointer shadow-xs"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
