"use client";

import React, { useEffect, useRef } from "react";
import { X, Plus } from "lucide-react";
import { CalendarEvent, getEventColorStyles } from "./calendarTypes";

interface CalendarDayModalProps {
  date: Date;
  events: CalendarEvent[];
  anchorRect?: DOMRect | null;
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddNewEvent: (date: Date) => void;
}

export function CalendarDayModal({
  date,
  events,
  anchorRect,
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
    const startStr = e.startDate.slice(0, 10);
    const endStr = e.endDate.slice(0, 10);
    return startStr !== endStr;
  });

  const singleDayEvents = events.filter((e) => {
    const startStr = e.startDate.slice(0, 10);
    const endStr = e.endDate.slice(0, 10);
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center sm:block">
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="w-[90vw] max-w-[320px] bg-surface-container-lowest border border-outline-variant hover:border-primary/40 ring-1 ring-primary/15 rounded-2xl p-4 shadow-xl text-on-surface space-y-3 animate-in fade-in zoom-in-95 duration-150 select-none"
      >
        {/* 상단 헤더: 날짜 + X 닫기 버튼 (테마 색상 Primary 반영) */}
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
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
              {/* 1. 상단 다중일 기간 바 */}
              {multiDayEvents.map((evt) => {
                const styles = getEventColorStyles(evt.color, true);
                const endFormatted = evt.endDate ? evt.endDate.slice(5, 10).replace("-", "/") : "";

                return (
                  <div
                    key={evt._id || evt.title}
                    onClick={() => onSelectEvent(evt)}
                    style={{
                      backgroundColor: styles.bgRgba,
                      borderColor: styles.borderRgba,
                      color: styles.textColor,
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-semibold cursor-pointer hover:brightness-115 transition-all shadow-xs"
                    title={`${evt.title} 편집`}
                  >
                    <span className="truncate flex-1 leading-none">{evt.title}</span>
                    <span className="text-xs font-mono opacity-80 shrink-0 ml-2">
                      ~ {endFormatted}
                    </span>
                  </div>
                );
              })}

              {/* 2. 단일 / 시간별 일정 목록 */}
              <div className="space-y-1 pt-1">
                {singleDayEvents.map((evt) => {
                  const styles = getEventColorStyles(evt.color, true);
                  const timeStr =
                    !evt.allDay && evt.startDate.includes("T")
                      ? evt.startDate.slice(11, 16)
                      : null;

                  return (
                    <div
                      key={evt._id || evt.title}
                      onClick={() => onSelectEvent(evt)}
                      className="group flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-surface-container-low cursor-pointer text-sm transition-colors"
                      title={`${evt.title} 편집`}
                    >
                      {/* 불릿 도트 */}
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: styles.dotColor }}
                      />

                      {/* 시간 */}
                      {timeStr && (
                        <span className="font-mono text-xs text-on-surface-variant shrink-0 font-light">
                          {timeStr}
                        </span>
                      )}

                      {/* 제목 */}
                      <span
                        className={`truncate text-on-surface group-hover:text-primary leading-none ${
                          evt.isCompleted ? "line-through opacity-50" : ""
                        }`}
                      >
                        {evt.title}
                      </span>
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
