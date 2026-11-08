"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Tag,
  Loader2,
  MessageSquareText,
  BookOpen,
  StickyNote,
  Calendar,
  Folder,
  X,
  Check,
} from "lucide-react";
import { CategoryType } from "@/models/Category";
import { toast } from "@/lib/toast";
import { SwitchToggle } from "../common/SwitchToggle";

interface CategoryData {
  _id: string;
  type: CategoryType;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  order: number;
  isActive: boolean;
  isDefault?: boolean;
  createdAt: string;
}

const CATEGORY_TABS: { type: CategoryType; label: string; icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
  { type: "board", label: "커뮤니티 광장", icon: MessageSquareText },
  { type: "blog", label: "인사이트 블로그", icon: BookOpen },
  { type: "canvas", label: "아이디어 캔버스", icon: StickyNote },
  { type: "calendar", label: "캘린더 일정", icon: Calendar },
  { type: "note", label: "지식노트", icon: Folder },
];

const PRESET_COLORS = [
  { id: "primary", label: "기본 파랑", bg: "bg-primary/15 text-primary border-primary/30" },
  { id: "emerald", label: "에메랄드 초록", bg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  { id: "amber", label: "앰버 주황", bg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  { id: "rose", label: "로즈 빨강", bg: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30" },
  { id: "violet", label: "바이올렛 보라", bg: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" },
  { id: "sky", label: "스카이 하늘", bg: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30" },
  { id: "slate", label: "슬레이트 그레이", bg: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30" },
];

export function AdminCategoriesModule() {
  const [selectedType, setSelectedType] = useState<CategoryType>("board");
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formColor, setFormColor] = useState("primary");
  const [formOrder, setFormOrder] = useState(0);
  const [formIsActive, setFormIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshCategories = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // 🌟 카테고리 로드 (React 19 Hooks 규칙 준수: effect 내부에서 동기적 setState 호출 방지)
  useEffect(() => {
    let ignore = false;
    async function fetchCategories() {
      try {
        const res = await fetch(`/api/categories?type=${selectedType}&includeInactive=true`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setCategories(data.categories || []);
        }
      } catch {
        if (!ignore) toast.error("카테고리 목록을 불러오지 못했습니다.");
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    fetchCategories();
    return () => {
      ignore = true;
    };
  }, [selectedType, refreshTrigger]);

  // 모달 열기 (추가 모드)
  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormName("");
    setFormDescription("");
    setFormColor("primary");
    setFormOrder(categories.length + 1);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  // 모달 열기 (수정 모드)
  const handleOpenEditModal = (cat: CategoryData) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormColor(cat.color || "primary");
    setFormOrder(cat.order);
    setFormIsActive(cat.isActive);
    setIsModalOpen(true);
  };

  // 폼 제출 (생성 또는 수정)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("카테고리 이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        // 수정
        const res = await fetch(`/api/categories/${editingCategory._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDescription.trim(),
            color: formColor,
            order: Number(formOrder),
            isActive: formIsActive,
          }),
        });

        if (res.ok) {
          toast.success("카테고리가 수정되었습니다.");
          setIsModalOpen(false);
          refreshCategories();
        } else {
          const err = await res.json();
          toast.error(err.error || "수정에 실패했습니다.");
        }
      } else {
        // 신규 추가
        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: selectedType,
            name: formName.trim(),
            description: formDescription.trim(),
            color: formColor,
            order: Number(formOrder),
          }),
        });

        if (res.ok) {
          toast.success("새 카테고리가 등록되었습니다.");
          setIsModalOpen(false);
          refreshCategories();
        } else {
          const err = await res.json();
          toast.error(err.error || "등록에 실패했습니다.");
        }
      }
    } catch {
      toast.error("서버 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 활성/비활성 상태 즉시 토글
  const handleToggleActive = async (cat: CategoryData) => {
    try {
      const newActive = !cat.isActive;
      setCategories((prev) =>
        prev.map((c) => (c._id === cat._id ? { ...c, isActive: newActive } : c))
      );

      const res = await fetch(`/api/categories/${cat._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newActive }),
      });

      if (res.ok) {
        toast.success(`'${cat.name}' 카테고리가 ${newActive ? "활성화" : "비활성화"}되었습니다.`);
      } else {
        refreshCategories();
        toast.error("상태 변경에 실패했습니다.");
      }
    } catch {
      refreshCategories();
      toast.error("네트워크 오류");
    }
  };

  // 카테고리 삭제
  const handleDelete = async (cat: CategoryData) => {
    if (!confirm(`정말로 '${cat.name}' 카테고리를 삭제하시겠습니까?\n해당 카테고리로 작성된 글이 있을 수 있습니다.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${cat._id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(`'${cat.name}' 카테고리가 삭제되었습니다.`);
        setCategories((prev) => prev.filter((c) => c._id !== cat._id));
      } else {
        toast.error("삭제에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류");
    }
  };

  // 기본값 복원 (초기화)
  const handleResetDefaults = async () => {
    const currentTabObj = CATEGORY_TABS.find((t) => t.type === selectedType);
    if (!confirm(`'${currentTabObj?.label}'의 모든 카테고리를 시스템 기본값으로 복원하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/reset?type=${selectedType}`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("기본 카테고리가 성공적으로 복원되었습니다.");
        refreshCategories();
      } else {
        toast.error("기본값 복원에 실패했습니다.");
      }
    } catch {
      toast.error("서버 통신 오류");
    }
  };

  const getColorClass = (colorId?: string) => {
    const found = PRESET_COLORS.find((p) => p.id === colorId);
    return found ? found.bg : PRESET_COLORS[0].bg;
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* 1. 상단 타이틀 & 주요 액션 바 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant">
        <div>
          <h2 className="ui-page-title flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            카테고리 관리 (Category Manager)
          </h2>
          <p className="ui-page-subtitle mt-0.5">
            커뮤니티 광장, 인사이트 블로그, 아이디어 캔버스 등 플랫폼 전반의 카테고리를 실시간 CRUD 관리합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface ui-button transition-colors cursor-pointer text-xs font-semibold"
            title="현재 탭의 카테고리를 시스템 기본값으로 복원"
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">기본값 복원</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary ui-button hover:opacity-90 transition-opacity shadow-xs cursor-pointer text-xs font-bold"
          >
            <Plus size={15} />
            <span>새 카테고리 추가</span>
          </button>
        </div>
      </div>

      {/* 2. 대상 서비스 탭 스위처 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedType === tab.type;
          return (
            <button
              key={tab.type}
              onClick={() => setSelectedType(tab.type)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                isSelected
                  ? "bg-primary text-on-primary border-primary shadow-xs"
                  : "bg-surface-container-low hover:bg-surface-container border-outline-variant text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {isSelected && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-surface-container-lowest text-primary text-[10px] font-mono leading-none">
                  {categories.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. 카테고리 목록 그리드 / 카드 뷰 */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-center text-on-surface-variant">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ui-caption font-medium">카테고리 목록을 불러오는 중...</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-outline-variant rounded-2xl p-6 bg-surface-container-lowest">
          <Tag className="w-10 h-10 text-on-surface-variant/40 mx-auto mb-2" />
          <h3 className="ui-card-title text-on-surface">등록된 카테고리가 없습니다</h3>
          <p className="ui-caption text-on-surface-variant mt-1 mb-4">
            새로운 카테고리를 직접 추가하거나, 시스템 기본값으로 복원해보세요.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-1.5 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high text-xs font-bold cursor-pointer"
            >
              기본값 복원하기
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
            >
              새 카테고리 추가
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div
                key={cat._id}
                className={`bg-surface-container-lowest border rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs transition-all ${
                  cat.isActive
                    ? "border-outline-variant hover:border-primary/50"
                    : "border-outline-variant/40 opacity-60 bg-surface-container-low/40"
                }`}
              >
                {/* 상단 뱃지 & 이름 & 액션 */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`ui-badge px-2.5 py-1 rounded-lg border font-bold text-xs ${getColorClass(
                        cat.color
                      )}`}
                    >
                      {cat.name}
                    </span>
                    <span className="ui-caption text-on-surface-variant font-mono text-[11px]">
                      순서: {cat.order}
                    </span>
                    {!cat.isActive && (
                      <span className="px-2 py-0.5 rounded-md bg-destructive/10 text-destructive text-[10px] font-bold">
                        비공개 (숨김)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(cat)}
                      className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                      title="카테고리 수정"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-destructive transition-colors cursor-pointer"
                      title="카테고리 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* 설명 */}
                <p className="ui-caption text-on-surface-variant line-clamp-2">
                  {cat.description || "등록된 카테고리 설명이 없습니다."}
                </p>

                {/* 하단 활성화 스위치 */}
                <div className="pt-2 border-t border-outline-variant/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    사용자 노출 여부
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-on-surface">
                      {cat.isActive ? "노출 중" : "비노출"}
                    </span>
                    <SwitchToggle
                      checked={cat.isActive}
                      onChange={() => handleToggleActive(cat)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 카테고리 등록 / 수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-2xl space-y-4">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h3 className="ui-card-title text-on-surface flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                {editingCategory ? "카테고리 수정" : "새 카테고리 추가"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 모달 폼 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block ui-caption font-bold text-on-surface mb-1">
                  카테고리 이름 *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 자유, 정보공유, 기술/개발, 프로젝트"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface outline-hidden focus:border-primary font-medium"
                  required
                />
              </div>

              <div>
                <label className="block ui-caption font-bold text-on-surface mb-1">
                  카테고리 설명 (선택)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="카테고리의 용도나 안내 문구를 간단히 작성하세요."
                  className="w-full px-3 py-2 h-20 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface outline-hidden focus:border-primary resize-none leading-relaxed"
                />
              </div>

              {/* 색상 프리셋 선택 */}
              <div>
                <label className="block ui-caption font-bold text-on-surface mb-1.5">
                  뱃지 색상 테마
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map((col) => {
                    const isSelected = formColor === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setFormColor(col.id)}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          col.bg
                        } ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-surface-container-lowest" : "opacity-75 hover:opacity-100"}`}
                      >
                        {isSelected && <Check size={12} />}
                        <span className="text-[11px] truncate">{col.label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 정렬 순서 & 노출 여부 */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block ui-caption font-bold text-on-surface mb-1">
                    정렬 순서 (숫자)
                  </label>
                  <input
                    type="number"
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface outline-hidden focus:border-primary font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block ui-caption font-bold text-on-surface mb-1">
                    즉시 노출 활성화
                  </label>
                  <div className="h-[38px] flex items-center gap-2">
                    <SwitchToggle
                      checked={formIsActive}
                      onChange={() => setFormIsActive(!formIsActive)}
                    />
                    <span className="ui-caption font-semibold">
                      {formIsActive ? "활성화" : "비활성화"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 버튼 액션 */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high ui-button cursor-pointer text-xs font-semibold"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary ui-button hover:opacity-90 disabled:opacity-50 shadow-xs cursor-pointer text-xs font-bold flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> 저장 중...
                    </>
                  ) : editingCategory ? (
                    "수정사항 저장"
                  ) : (
                    "카테고리 등록"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
