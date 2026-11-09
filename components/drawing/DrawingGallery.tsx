"use client";

import React, { useMemo } from "react";
import { PenTool, Plus, Search, Trash2 } from "lucide-react";
import { SavedDrawingMeta, BG_PATTERNS } from "./types";

interface DrawingGalleryProps {
  savedList: SavedDrawingMeta[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectDrawing: (id: string) => void;
  onNewDrawing: () => void;
  onDeleteDrawing: (e: React.MouseEvent, id: string) => void;
}

export function DrawingGallery({
  savedList,
  searchQuery,
  onSearchChange,
  onSelectDrawing,
  onNewDrawing,
  onDeleteDrawing,
}: DrawingGalleryProps) {
  const filteredList = useMemo(() => {
    return savedList.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [savedList, searchQuery]);

  return (
    <div className="w-full space-y-6 pb-12 animate-fade-in select-none">
      {/* 상단 표준 페이지 헤더 (Rule 52) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
            <PenTool className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="ui-page-title flex items-center gap-2">
              스케치 그림판
              <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                {savedList.length}개 스케치
              </span>
            </h1>
            <p className="ui-page-subtitle">
              자유로운 벡터 드로잉, 아이디어 스케치 및 오늘 일기 연동 스케치북
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewDrawing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} />
          <span>새 스케치 시작</span>
        </button>
      </div>

      {/* 검색창 */}
      <div className="flex justify-end">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            placeholder="스케치 제목 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-9 pr-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary font-medium"
          />
        </div>
      </div>

      {/* 스케치 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-5 w-full">
        {/* 새 스케치 시작 점선 카드 */}
        <div
          onClick={onNewDrawing}
          className="group min-h-[220px] border-2 border-dashed border-outline-variant hover:border-primary rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all hover:bg-surface-container-low/50"
        >
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={24} />
          </div>
          <div>
            <div className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors">
              새 스케치 시작하기
            </div>
            <p className="ui-caption text-on-surface-variant mt-0.5">
              백지 캔버스에서 아이디어를 자유롭게 드로잉
            </p>
          </div>
        </div>

        {/* 저장된 스케치 카드들 */}
        {filteredList.map((item) => (
          <div
            key={item._id}
            onClick={() => onSelectDrawing(item._id)}
            className="group relative bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant hover:border-primary/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer min-h-[220px]"
          >
            <div>
              {/* 썸네일 미리보기 영역 */}
              <div className="h-32 rounded-xl bg-surface-container-low overflow-hidden flex items-center justify-center border border-outline-variant/60 relative mb-3">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <PenTool className="w-8 h-8 text-on-surface-variant/40" />
                )}
                <span className="absolute top-2 left-2 ui-badge px-2 py-0.5 rounded-md bg-surface-container/80 backdrop-blur-xs text-[10px] font-mono text-on-surface-variant">
                  {BG_PATTERNS.find((p) => p.id === item.backgroundPattern)?.label || "클린 화이트"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                  {item.title}
                </h3>
                <button
                  type="button"
                  onClick={(e) => onDeleteDrawing(e, item._id)}
                  className="p-1.5 rounded-lg text-on-surface-variant opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
                  title="스케치 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-outline-variant/60 flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
              <span>요소 {item.elementCount || 0}개</span>
              <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
