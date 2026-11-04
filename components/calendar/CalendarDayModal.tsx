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
        className="w-[90vw] max-w-[320px] bg-[#1a2221] dark:bg-[#1a2221] border border-neutral-700/70 rounded-2xl p-4 shadow-2xl text-neutral-100 space-y-3 animate-in fade-in zoom-in-95 duration-150 select-none"
      >
        {/* 상단 헤더: 날짜 + X 닫기 버튼 (사진3) */}
        <div className="flex items-center justify-between pb-1">
          <h3 className="font-bold text-sm tracking-tight text-white">{titleStr}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
            title="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {/* 메인 리스트 컨테이너 */}
        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
          {events.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-400 font-light">
              등록된 일정이 없습니다.
            </div>
          ) : (
            <>
              {/* 1. 상단 다중일 기간 바 (사진3: [ ㅁㄴㅇ              ~ 10/17 ]) */}
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
                    className="flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer hover:brightness-115 transition-all shadow-xs"
                    title={`${evt.title} 편집`}
                  >
                    <span className="truncate flex-1 leading-none">{evt.title}</span>
                    <span className="text-[11px] font-mono opacity-80 shrink-0 ml-2">
                      ~ {endFormatted}
                    </span>
                  </div>
                );
              })}

              {/* 2. 단일 / 시간별 일정 목록 (사진3: • 09:00 제목) */}
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
                      className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 cursor-pointer text-xs transition-colors"
                      title={`${evt.title} 편집`}
                    >
                      {/* 불릿 도트 (사진3의 •) */}
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: styles.dotColor }}
                      />

                      {/* 시간 (사진3의 09:00) */}
                      {timeStr && (
                        <span className="font-mono text-[11px] text-neutral-400 shrink-0 font-light">
                          {timeStr}
                        </span>
                      )}

                      {/* 제목 */}
                      <span
                        className={`truncate text-neutral-200 group-hover:text-white leading-none ${
                          evt.isCompleted ? "line-through text-neutral-500" : ""
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

        {/* 하단 새 일정 추가 버튼 */}
        <div className="pt-2 border-t border-neutral-700/50">
          <button
            onClick={() => onAddNewEvent(date)}
            className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-neutral-200 hover:text-white font-medium rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-700/50"
          >
            <Plus size={13} />
            <span>이 날짜에 새 일정 추가</span>
          </button>
        </div>
      </div>
    </div>
  );
}
