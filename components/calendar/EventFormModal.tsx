"use client";

import React, { useState } from "react";
import { X, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { CalendarEvent, DEFAULT_CATEGORIES } from "./calendarTypes";
import { toast } from "@/lib/toast";

interface EventFormModalProps {
  initialDate?: Date;
  event?: CalendarEvent | null;
  onClose: () => void;
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function EventFormModal({
  initialDate,
  event,
  onClose,
  onSave,
  onDelete,
}: EventFormModalProps) {
  const defaultDateStr = initialDate
    ? `${initialDate.getFullYear()}-${String(initialDate.getMonth() + 1).padStart(2, "0")}-${String(initialDate.getDate()).padStart(2, "0")}`
    : new Date().toISOString().slice(0, 10);

  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [startDate, setStartDate] = useState(event?.startDate ? event.startDate.slice(0, 10) : defaultDateStr);
  const [startTime, setStartTime] = useState(
    event && !event.allDay && event.startDate.includes("T") ? event.startDate.slice(11, 16) : "09:00"
  );
  const [endDate, setEndDate] = useState(event?.endDate ? event.endDate.slice(0, 10) : defaultDateStr);
  const [endTime, setEndTime] = useState(
    event && !event.allDay && event.endDate.includes("T") ? event.endDate.slice(11, 16) : "10:00"
  );
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [category, setCategory] = useState(event?.category || "work");
  const [color, setColor] = useState(event?.color || "#d97706");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      toast.warning("종료일은 시작일보다 앞설 수 없습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadStartDate = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`;
      const payloadEndDate = allDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`;

      await onSave({
        ...(event?._id ? { _id: event._id } : {}),
        title: title.trim(),
        description: description.trim(),
        startDate: payloadStartDate,
        endDate: payloadEndDate,
        allDay,
        category,
        color,
      });
      toast.success(event?._id ? "일정이 수정되었습니다." : "새 일정이 등록되었습니다.");
      onClose();
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!event?._id || !onDelete) return;
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    setIsSubmitting(true);
    try {
      await onDelete(event._id);
      toast.success("일정이 삭제되었습니다.");
      onClose();
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 w-full max-w-md shadow-xl space-y-4 text-on-surface">
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-primary" />
            <h3 className="font-semibold text-sm text-on-surface">
              {event ? "일정 수정" : "새 일정 추가"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* 일정 제목 */}
          <div>
            <label className="block font-medium text-on-surface mb-1">
              일정 제목 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 정보처리기사 실기 원서접수"
              className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary font-normal"
              required
              autoFocus
            />
          </div>

          {/* 종일 여부 체크박스 */}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-on-surface">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="accent-primary w-3.5 h-3.5 cursor-pointer"
              />
              <span className="font-medium">종일 일정 (다중 일 기간 선택 가능)</span>
            </label>
          </div>

          {/* 시작일 ~ 종료일 */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-medium text-on-surface mb-1 text-[11px]">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs font-mono"
                required
              />
              {!allDay && (
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full mt-1.5 p-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs font-mono"
                  required
                />
              )}
            </div>

            <div>
              <label className="block font-medium text-on-surface mb-1 text-[11px]">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs font-mono"
                required
              />
              {!allDay && (
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full mt-1.5 p-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs font-mono"
                  required
                />
              )}
            </div>
          </div>

          {/* 카테고리 및 색상 칩 (연한 파스텔 톤) */}
          <div>
            <label className="block font-medium text-on-surface mb-1.5">카테고리 색상</label>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_CATEGORIES.map((cat) => {
                const isSelected = color === cat.color;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategory(cat.id);
                      setColor(cat.color);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 상세 메모 */}
          <div>
            <label className="block font-medium text-on-surface mb-1">상세 내용 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="장소, 준비물, 메모 등을 입력하세요."
              rows={2}
              className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface focus:outline-none focus:border-primary font-light resize-none"
            />
          </div>

          {/* 액션 버튼군 */}
          <div className="flex items-center gap-2 pt-2 border-t border-outline-variant">
            {event?._id && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                title="일정 삭제"
              >
                <Trash2 size={14} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2 bg-surface-container-low hover:bg-surface-container rounded-md font-medium text-xs cursor-pointer transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-primary hover:opacity-90 text-on-primary font-semibold rounded-md text-xs cursor-pointer transition-opacity"
            >
              {isSubmitting ? "저장 중..." : event ? "수정 완료" : "일정 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
