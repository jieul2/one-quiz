"use client";

import React, { useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { CalendarEvent, getEventColorStyles, getLocalDateKey, getEventTimeDisplay } from "./calendarTypes";

interface CalendarDayModalProps {
  date: Date;
  events: CalendarEvent[];
  anchorRect?: DOMRect | null;
  isDark?: boolean;
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddNewEvent: (date: Date) => void;
}

export function CalendarDayModal({
  date,
  events,
  anchorRect,
  isDark = false,
  onClose,
  onSelectEvent,
  onAddNewEvent,
}: CalendarDayModalProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const titleStr = `${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // 다중일(기간) 일정과 단일/시간제 일정 분류 (사진3 레이아웃)
  const multiDayEvents = events.filter((e) => {
    const startStr = getLocalDateKey(e.startDate);
    const endStr = getLocalDateKey(e.endDate);
    return startStr !== endStr;
  });

  const singleDayEvents = events.filter((e) => {
    const startStr = getLocalDateKey(e.startDate);
    const endStr = getLocalDateKey(e.endDate);
    return startStr === endStr;
  });

  // 팝오버 위치 계산 (앵커 셀 기준)
  let popoverStyle: React.CSSProperties = {};
  if (anchorRect && typeof window !== "undefined") {
    const popoverWidth = 310;
    const padding = 12;

    // 수평 위치: 앵커 셀의 중앙 기준
    let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    if (left < padding) left = padding;
    if (left + popoverWidth > window.innerWidth - padding) {
      left = window.innerWidth - popoverWidth - padding;
    }

    // 수직 위치: 셀 상단 또는 하단
    let top = anchorRect.top;
    if (top + 380 > window.innerHeight - padding) {
      top = Math.max(padding, window.innerHeight - 400);
    }

    popoverStyle = {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      zIndex: 60,
    };
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/10 dark:bg-black/25 sm:bg-transparent flex items-center justify-center sm:block"
    >
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="w-[90vw] max-w-[320px] bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-md text-on-surface space-y-3 animate-in fade-in zoom-in-95 duration-100 select-none"
      >
        {/* 상단 헤더: 날짜 + X 닫기 버튼 (테마 색상 Primary 반영) */}
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <h3 className="font-bold text-sm tracking-tight text-primary">{titleStr}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
            title="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* 메인 리스트 컨테이너 */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
          {events.length === 0 ? (
            <div className="py-8 text-center text-sm text-on-surface-variant font-light">
              등록된 일정이 없습니다.
            </div>
          ) : (
            <>
              {/* 1. 상단 다중일 기간 바 (모던 악센트 필 스타일) */}
              {multiDayEvents.map((evt) => {
                const styles = getEventColorStyles(evt.color, isDark);
                const endFormatted = evt?.endDate ? String(evt.endDate).slice(5, 10).replace("-", "/") : "";
                const { isAllDay, timeText } = getEventTimeDisplay(evt, true);

                return (
                  <div
                    key={evt._id || evt.title}
                    onClick={() => onSelectEvent(evt)}
                    style={{
                      backgroundColor: styles.bgRgba,
                      borderColor: styles.borderRgba,
                      color: styles.textColor,
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border text-xs sm:text-sm font-semibold cursor-pointer hover:brightness-105 transition-colors shadow-2xs"
                    title={`${evt.title} 편집`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 shrink-0">
                        {isAllDay ? "종일" : timeText}
                      </span>
                      <span className="truncate leading-none">{evt.title}</span>
                    </div>
                    <span className="text-xs font-mono opacity-80 shrink-0 ml-2">
                      ~ {endFormatted}
                    </span>
                  </div>
                );
              })}

              {/* 2. 단일 / 시간별 일정 목록 */}
              <div className="space-y-1.5 pt-1">
                {singleDayEvents.map((evt) => {
                  const styles = getEventColorStyles(evt.color, isDark);
                  const { isAllDay, timeText } = getEventTimeDisplay(evt, true);

                  return (
                    <div
                      key={evt._id || evt.title}
                      onClick={() => onSelectEvent(evt)}
                      className="group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl hover:bg-surface-container-low border border-transparent hover:border-outline-variant/60 cursor-pointer text-sm transition-all"
                      title={`${evt.title} 편집`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* 불릿 도트 */}
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: styles.dotColor }}
                        />

                        {/* 제목 */}
                        <span
                          className={`truncate text-on-surface group-hover:text-primary font-medium leading-none ${
                            evt.isCompleted ? "line-through opacity-50" : ""
                          }`}
                        >
                          {evt.title}
                        </span>
                      </div>

                      {/* 시간 / 종일 뱃지 */}
                      {isAllDay ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                          종일
                        </span>
                      ) : (
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-container text-on-surface shrink-0">
                          {timeText}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* 하단 새 일정 추가 버튼 (테마 색상 Primary 반영) */}
        <div className="pt-2 border-t border-outline-variant">
          <button
            onClick={() => onAddNewEvent(date)}
            className="w-full py-2 bg-primary hover:opacity-90 text-on-primary font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>이 날짜에 새 일정 추가</span>
          </button>
        </div>
      </div>
    </div>
  );
}
