"use client";

import React, { useState } from "react";
import {
  PenTool,
  Highlighter,
  Eraser,
  Minus,
  ArrowRight,
  Square,
  Circle,
  Type,
  Hand,
  Undo2,
  Redo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Palette,
  ChevronDown,
} from "lucide-react";
import {
  DrawTool,
  BgPattern,
  PRESET_COLORS,
  STROKE_WIDTHS,
  BG_PATTERNS,
} from "./types";

interface DrawingToolbarProps {
  tool: DrawTool;
  color: string;
  strokeWidth: number;
  isFilled: boolean;
  bgPattern: BgPattern;
  zoomLevel: number;
  canUndo: boolean;
  canRedo: boolean;
  customColor: string;
  onSelectTool: (t: DrawTool) => void;
  onSelectColor: (c: string) => void;
  onSelectStrokeWidth: (w: number) => void;
  onToggleFilled: () => void;
  onSelectBgPattern: (p: BgPattern) => void;
  onCustomColorChange: (c: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export function DrawingToolbar({
  tool,
  color,
  strokeWidth,
  isFilled,
  bgPattern,
  zoomLevel,
  canUndo,
  canRedo,
  customColor,
  onSelectTool,
  onSelectColor,
  onSelectStrokeWidth,
  onToggleFilled,
  onSelectBgPattern,
  onCustomColorChange,
  onUndo,
  onRedo,
  onClear,
  onZoomIn,
  onZoomOut,
  onResetView,
}: DrawingToolbarProps) {
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isPatternMenuOpen, setIsPatternMenuOpen] = useState(false);

  const tools: { id: DrawTool; label: string; icon: React.ElementType }[] = [
    { id: "pen", label: "펜", icon: PenTool },
    { id: "highlighter", label: "형광펜", icon: Highlighter },
    { id: "eraser", label: "지우개", icon: Eraser },
    { id: "line", label: "직선", icon: Minus },
    { id: "arrow", label: "화살표", icon: ArrowRight },
    { id: "rect", label: "사각형", icon: Square },
    { id: "circle", label: "원", icon: Circle },
    { id: "text", label: "텍스트", icon: Type },
    { id: "hand", label: "화면 이동 (잡기)", icon: Hand },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xs">
      {/* 1. 기본 그리기 도구 모음 */}
      <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant/60 rounded-xl p-1">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`p-2 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-on-primary shadow-xs font-bold"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
              title={t.label}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      {/* 2. 굵기 조절 */}
      <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant/60 rounded-xl p-1">
        {STROKE_WIDTHS.map((s) => (
          <button
            key={s.value}
            onClick={() => onSelectStrokeWidth(s.value)}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              strokeWidth === s.value
                ? "bg-primary text-on-primary font-bold shadow-2xs"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
            }`}
            title={`선 굵기: ${s.label}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* 3. 도형 채우기 토글 (사각형, 원) */}
      {(tool === "rect" || tool === "circle") && (
        <button
          onClick={onToggleFilled}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
            isFilled
              ? "bg-primary/10 border-primary text-primary"
              : "bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {isFilled ? "채우기 켜짐" : "채우기 꺼짐"}
        </button>
      )}

      {/* 4. 색상 팔레트 드롭다운 */}
      <div className="relative">
        <button
          onClick={() => setIsColorMenuOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <div
            className="w-4 h-4 rounded-full border border-outline-variant shadow-2xs"
            style={{ backgroundColor: color }}
          />
          <Palette size={13} className="text-on-surface-variant" />
          <ChevronDown size={11} className="text-on-surface-variant" />
        </button>

        {isColorMenuOpen && (
          <div className="absolute left-0 mt-1.5 w-52 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-2.5 z-30 animate-in fade-in zoom-in-95">
            <div className="text-[11px] font-bold text-on-surface-variant mb-2">프리셋 색상</div>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectColor(c.hex);
                    setIsColorMenuOpen(false);
                  }}
                  className="w-8 h-8 rounded-lg border border-outline-variant/70 transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>

            <div className="text-[11px] font-bold text-on-surface-variant mb-1.5">커스텀 색상</div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => {
                  onCustomColorChange(e.target.value);
                  onSelectColor(e.target.value);
                }}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="font-mono text-xs text-on-surface uppercase font-medium">
                {customColor}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 5. 배경 패턴 선택 드롭다운 */}
      <div className="relative">
        <button
          onClick={() => setIsPatternMenuOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-low border border-outline-variant/60 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span>{BG_PATTERNS.find((p) => p.id === bgPattern)?.label || "배경"}</span>
          <ChevronDown size={11} className="text-on-surface-variant" />
        </button>

        {isPatternMenuOpen && (
          <div className="absolute left-0 mt-1.5 w-44 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl p-1.5 z-30 animate-in fade-in zoom-in-95">
            {BG_PATTERNS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onSelectBgPattern(p.id);
                  setIsPatternMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex flex-col cursor-pointer transition-colors ${
                  bgPattern === p.id
                    ? "bg-primary text-on-primary font-bold"
                    : "hover:bg-surface-container text-on-surface"
                }`}
              >
                <span>{p.label}</span>
                <span
                  className={`text-[10px] ${
                    bgPattern === p.id ? "text-on-primary/80" : "text-on-surface-variant"
                  }`}
                >
                  {p.desc}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 6. 우측 실행 취소, 다시 실행, 화면 줌 & 리셋 */}
      <div className="flex items-center gap-1.5 ml-auto flex-wrap">
        {/* 실행 취소 / 다시 실행 / 지우기 */}
        <div className="flex items-center gap-0.5 bg-surface-container-low border border-outline-variant/60 rounded-xl p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="실행 취소 (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="다시 실행 (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>
          <button
            onClick={onClear}
            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="캔버스 전체 지우기"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* 화면 줌 및 리셋 */}
        <div className="flex items-center gap-0.5 bg-surface-container-low border border-outline-variant/60 rounded-xl p-0.5">
          <button
            onClick={onZoomOut}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="화면 축소"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] font-mono font-bold px-1 text-on-surface">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="화면 확대"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={onResetView}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="화면 위치 및 크기 리셋"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
