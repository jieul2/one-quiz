"use client";

import React, { useState } from "react";
import { X, Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { CalendarEvent, DEFAULT_CATEGORIES, getLocalDateKey, formatDateKey, getLocalTimeStr } from "./calendarTypes";
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
  const defaultDateStr = initialDate ? formatDateKey(initialDate) : formatDateKey(new Date());

  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [startDate, setStartDate] = useState(
    event?.startDate ? getLocalDateKey(event.startDate) : defaultDateStr
  );
  const [startTime, setStartTime] = useState(
    event && !event.allDay ? getLocalTimeStr(event.startDate) || "09:00" : "09:00"
  );
  const [endDate, setEndDate] = useState(
    event?.endDate ? getLocalDateKey(event.endDate) : defaultDateStr
  );
  const [endTime, setEndTime] = useState(
    event && !event.allDay ? getLocalTimeStr(event.endDate) || "10:00" : "10:00"
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
      const payloadStartDate = allDay
        ? new Date(`${startDate}T00:00:00`).toISOString()
        : new Date(`${startDate}T${startTime}:00`).toISOString();
      const payloadEndDate = allDay
        ? new Date(`${endDate}T23:59:59`).toISOString()
        : new Date(`${endDate}T${endTime}:00`).toISOString();

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
            <CalendarIcon size={18} className="text-primary" />
            <h3 className="font-semibold text-base text-on-surface">
              {event ? "일정 수정" : "새 일정 추가"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
          {/* 일정 제목 */}
          <div>
            <label className="block font-medium text-on-surface mb-1 text-sm">
              일정 제목 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 정보처리기사 실기 원서접수"
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-md text-sm text-on-surface focus:outline-none focus:border-primary font-normal"
              required
              autoFocus
            />
          </div>

          {/* 일정 일시 및 종일 체크박스 설정 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-medium text-on-surface text-xs">일정 일시</label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20 accent-primary cursor-pointer transition-all"
                />
                <span
                  className={`text-xs font-semibold transition-colors ${
                    allDay ? "text-primary" : "text-on-surface-variant group-hover:text-on-surface"
                  }`}
                >
                  종일
                </span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-medium">
                  시작일
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-sm font-mono text-on-surface focus:outline-none focus:border-primary"
                  required
                />
                {!allDay && (
                  <div className="mt-1.5">
                    <label className="block text-[11px] text-on-surface-variant mb-0.5 font-medium">
                      시작 시간
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-sm font-mono text-on-surface focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] text-on-surface-variant mb-1 font-medium">
                  종료일
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-sm font-mono text-on-surface focus:outline-none focus:border-primary"
                  required
                />
                {!allDay && (
                  <div className="mt-1.5">
                    <label className="block text-[11px] text-on-surface-variant mb-0.5 font-medium">
                      종료 시간
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full p-2 bg-surface-container-low border border-outline-variant rounded-md text-sm font-mono text-on-surface focus:outline-none focus:border-primary"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 카테고리 및 색상 칩 (연한 파스텔 톤) */}
          <div>
            <label className="block font-medium text-on-surface mb-1.5 text-sm">카테고리 색상</label>
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all cursor-pointer ${
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
            <label className="block font-medium text-on-surface mb-1 text-sm">상세 내용 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="장소, 준비물, 메모 등을 입력하세요."
              rows={2}
              className="w-full p-2.5 bg-surface-container-low border border-outline-variant rounded-md text-sm text-on-surface focus:outline-none focus:border-primary font-light resize-none"
            />
          </div>

          {/* 액션 버튼군 */}
          <div className="flex items-center gap-2 pt-2 border-t border-outline-variant">
            {event?._id && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="p-2.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors cursor-pointer"
                title="일정 삭제"
              >
                <Trash2 size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2 bg-surface-container-low hover:bg-surface-container rounded-md font-medium text-sm cursor-pointer transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-primary hover:opacity-90 text-on-primary font-semibold rounded-md text-sm cursor-pointer transition-opacity"
            >
              {isSubmitting ? "저장 중..." : event ? "수정 완료" : "일정 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
