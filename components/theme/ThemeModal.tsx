"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Palette, X, Sun, Moon, CheckCircle2 } from "lucide-react";

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeModal({ isOpen, onClose }: ThemeModalProps) {
  const { theme: currentTheme, setTheme } = useTheme();

  if (!isOpen) return null;

  const isLight = currentTheme === "light" || !currentTheme;
  const isDark = currentTheme === "dark" || currentTheme === "black";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Palette className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="ui-card-title text-on-surface font-bold">
                사이트 테마 설정
              </h2>
              <p className="ui-caption text-on-surface-variant font-light">
                라이트 및 블랙 2가지 모드 중 원하는 환경을 선택하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* 2 Themes Choice */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* 라이트 모드 */}
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer relative ${
              isLight
                ? "border-primary ring-2 ring-primary/20 bg-primary/[0.04] shadow-xs"
                : "border-outline-variant hover:border-outline hover:bg-surface-container-low/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <Sun className="w-4.5 h-4.5" />
              </div>
              {isLight && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </div>
            <div className="ui-card-title text-on-surface font-bold text-sm">
              라이트 모드
            </div>
            <p className="ui-caption text-on-surface-variant mt-0.5 line-clamp-2">
              차분하고 정돈된 화이트 기반 밝은 화면
            </p>
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-outline-variant/60">
              <span className="w-3.5 h-3.5 rounded-full bg-[#f8fafc] border border-neutral-300" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#ffffff] border border-neutral-300" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#4f46e5]" />
              <span className="text-[11px] text-on-surface-variant ml-auto font-medium">Light</span>
            </div>
          </button>

          {/* 블랙 / 다크 모드 */}
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer relative ${
              isDark
                ? "border-primary ring-2 ring-primary/20 bg-primary/[0.04] shadow-xs"
                : "border-outline-variant hover:border-outline hover:bg-surface-container-low/60"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Moon className="w-4.5 h-4.5" />
              </div>
              {isDark && <CheckCircle2 className="w-5 h-5 text-primary" />}
            </div>
            <div className="ui-card-title text-on-surface font-bold text-sm">
              블랙 / 다크 모드
            </div>
            <p className="ui-caption text-on-surface-variant mt-0.5 line-clamp-2">
              눈의 피로를 덜어주는 깔끔한 딥 다크 화면
            </p>
            <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-outline-variant/60">
              <span className="w-3.5 h-3.5 rounded-full bg-[#0b0f19] border border-neutral-700" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#151d2f] border border-neutral-700" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#6366f1]" />
              <span className="text-[11px] text-on-surface-variant ml-auto font-medium">Dark</span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 px-4 border-t border-outline-variant flex items-center justify-between bg-surface-container-low/40">
          <span className="ui-caption text-on-surface-variant">
            현재 적용: <strong className="text-on-surface font-semibold">{isDark ? "블랙/다크 모드" : "라이트 모드"}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
