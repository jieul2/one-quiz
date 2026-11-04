"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
import { THEME_LIST, LIGHT_THEMES, DARK_THEMES, ThemeConfig } from "@/lib/themes/themeList";
import { Palette, X, Sun, Moon, Search, CheckCircle2 } from "lucide-react";

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeModal({ isOpen, onClose }: ThemeModalProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"all" | "light" | "dark">("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredThemes = THEME_LIST.filter((t) => {
    const matchesTab = activeTab === "all" || t.type === activeTab;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-space-md border-b border-outline-variant flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-headline-md text-headline-sm text-on-surface font-bold">
                테마 선택
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                원하는 테마를 선택하면 실시간으로 전체 화면 스타일이 적용됩니다 ({THEME_LIST.length}개 테마 지원)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Tabs Filter */}
        <div className="p-space-md border-b border-outline-variant flex flex-col sm:flex-row gap-space-sm items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all ${
                activeTab === "all"
                  ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              전체 ({THEME_LIST.length})
            </button>
            <button
              onClick={() => setActiveTab("light")}
              className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
                activeTab === "light"
                  ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              라이트 ({LIGHT_THEMES.length})
            </button>
            <button
              onClick={() => setActiveTab("dark")}
              className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all flex items-center gap-1.5 ${
                activeTab === "dark"
                  ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              다크 ({DARK_THEMES.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-on-surface-variant" />
            <input
              type="text"
              placeholder="테마 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container-lowest pl-8 pr-3 py-1.5 rounded-xl border border-outline-variant text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Theme Grid */}
        <div className="p-space-md overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-space-sm max-h-[55vh]">
          {filteredThemes.map((themeItem: ThemeConfig) => {
            const isSelected = currentTheme === themeItem.id;
            return (
              <button
                key={themeItem.id}
                onClick={() => {
                  setTheme(themeItem.id);
                }}
                className={`flex flex-col text-left p-space-sm rounded-2xl border transition-all text-on-surface relative group ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/30 bg-surface-container-low shadow-sm"
                    : "border-outline-variant hover:border-outline hover:bg-surface-container-low/60"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <span className="font-label-md text-label-md font-bold truncate">
                    {themeItem.name}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold uppercase ${
                      themeItem.type === "dark"
                        ? "bg-indigo-950/80 text-indigo-300 border border-indigo-800/40"
                        : "bg-amber-100 text-amber-800 border border-amber-300/40"
                    }`}
                  >
                    {themeItem.type}
                  </span>
                </div>

                <p className="font-caption text-caption text-on-surface-variant line-clamp-1 mb-2">
                  {themeItem.description}
                </p>

                {/* Color preview chips */}
                <div className="flex items-center gap-1.5 mt-auto pt-1">
                  <div
                    className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: themeItem.previewColors.primary }}
                    title="Primary"
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: themeItem.previewColors.secondary }}
                    title="Secondary"
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: themeItem.previewColors.surface }}
                    title="Surface"
                  />
                  <div
                    className="w-5 h-5 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: themeItem.previewColors.background }}
                    title="Background"
                  />
                  {isSelected && (
                    <CheckCircle2 className="w-5 h-5 text-primary ml-auto" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-space-sm px-space-md border-t border-outline-variant flex items-center justify-between bg-surface-container-low/40">
          <span className="font-caption text-caption text-on-surface-variant">
            현재 테마: <strong className="text-on-surface font-semibold">{currentTheme || "light"}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-primary text-on-primary font-label-sm text-label-sm font-semibold hover:opacity-90 transition-opacity"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
