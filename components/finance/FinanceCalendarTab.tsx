"use client";

import { useState, useMemo } from "react";
import { FinanceTransaction } from "./types";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
} from "lucide-react";

interface Props {
  transactions: FinanceTransaction[];
  monthKey: string;
  onSelectDateAdd?: (dateStr: string) => void;
}

export function FinanceCalendarTab({
  transactions,
  monthKey,
  onSelectDateAdd,
}: Props) {
  // 기준 년월
  const [year, month] = useMemo(() => {
    const parts = monthKey.split("-").map(Number);
    return [parts[0] || 2026, parts[1] || 11];
  }, [monthKey]);

  // 선택된 날짜 (상세 팝오버용)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 날짜별 수입, 지출, 트랜잭션 집계 맵
  const dailyStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { income: number; expense: number; items: FinanceTransaction[] }
    >();

    transactions.forEach((tx) => {
      const dateKey = tx.date.slice(0, 10);
      const existing = map.get(dateKey) || { income: 0, expense: 0, items: [] };
      if (tx.type === "expense") {
        existing.expense += tx.amount;
      } else if (tx.type === "income") {
        existing.income += tx.amount;
      }
      existing.items.push(tx);
      map.set(dateKey, existing);
    });

    return map;
  }, [transactions]);

  // 달력 그리드 계산 (해당 월 1일의 요일 ~ 말일까지)
  const calendarCells = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDayOfWeek = firstDay.getDay(); // 0(일) ~ 6(토)
    const totalDays = lastDay.getDate();

    const cells: Array<{
      dateKey: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSunday: boolean;
      isSaturday: boolean;
      stats?: { income: number; expense: number; items: FinanceTransaction[] };
    }> = [];

    // 이전 달 빈칸 채우기
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      const prevM = month - 1 === 0 ? 12 : month - 1;
      const prevY = month - 1 === 0 ? year - 1 : year;
      const dateKey = `${prevY}-${String(prevM).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
      cells.push({
        dateKey,
        dayNum: dNum,
        isCurrentMonth: false,
        isToday: false,
        isSunday: cells.length % 7 === 0,
        isSaturday: cells.length % 7 === 6,
        stats: dailyStatsMap.get(dateKey),
      });
    }

    // 이번 달 날짜 채우기
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    for (let d = 1; d <= totalDays; d++) {
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const colIdx = cells.length % 7;
      cells.push({
        dateKey,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateKey === todayStr,
        isSunday: colIdx === 0,
        isSaturday: colIdx === 6,
        stats: dailyStatsMap.get(dateKey),
      });
    }

    // 다음 달 날짜로 7의 배수 맞추기
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      const dateKey = `${nextY}-${String(nextM).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
      const colIdx = cells.length % 7;
      cells.push({
        dateKey,
        dayNum: nextDay,
        isCurrentMonth: false,
        isToday: false,
        isSunday: colIdx === 0,
        isSaturday: colIdx === 6,
        stats: dailyStatsMap.get(dateKey),
      });
      nextDay++;
    }

    return cells;
  }, [year, month, dailyStatsMap]);

  // 선택된 날짜의 상세 내역
  const selectedStats = selectedDate ? dailyStatsMap.get(selectedDate) : null;

  return (
    <div className="space-y-4">
      {/* 캘린더 메인 컨테이너 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-primary" />
            <h3 className="ui-card-title text-base font-bold text-on-surface">
              {year}년 {month}월 가계 캘린더
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-on-surface-variant font-medium">수입(+)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-on-surface-variant font-medium">지출(-)</span>
            </div>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 text-center text-xs font-bold py-1.5 border-b border-outline-variant/60">
          <span className="text-rose-500">일</span>
          <span className="text-on-surface-variant">월</span>
          <span className="text-on-surface-variant">화</span>
          <span className="text-on-surface-variant">수</span>
          <span className="text-on-surface-variant">목</span>
          <span className="text-on-surface-variant">금</span>
          <span className="text-blue-500">토</span>
        </div>

        {/* 캘린더 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {calendarCells.map((cell) => {
            const hasIncome = Boolean(cell.stats && cell.stats.income > 0);
            const hasExpense = Boolean(cell.stats && cell.stats.expense > 0);
            const isSelected = selectedDate === cell.dateKey;

            return (
              <div
                key={cell.dateKey}
                onClick={() => setSelectedDate(cell.dateKey)}
                className={`min-h-[75px] sm:min-h-[90px] p-1.5 rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : cell.isCurrentMonth
                    ? "bg-surface-container-low/60 border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container-low"
                    : "bg-surface-container-lowest/40 border-outline-variant/20 opacity-40 hover:opacity-80"
                }`}
              >
                {/* 상단 날짜 숫자 */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-lg text-xs font-bold leading-none ${
                      cell.isToday
                        ? "bg-primary text-on-primary font-black shadow-xs"
                        : cell.isSunday
                        ? "text-rose-500"
                        : cell.isSaturday
                        ? "text-blue-500"
                        : "text-on-surface"
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {cell.stats && cell.stats.items.length > 0 && (
                    <span className="text-[10px] text-on-surface-variant/70 font-mono hidden sm:inline">
                      {cell.stats.items.length}건
                    </span>
                  )}
                </div>

                {/* 하단 수입 / 지출 합계 배지 */}
                <div className="space-y-0.5 text-right font-mono text-[10px] sm:text-[11px] leading-tight">
                  {hasIncome && (
                    <div className="text-emerald-500 font-bold truncate">
                      +{cell.stats!.income >= 1000000
                        ? `${(cell.stats!.income / 10000).toFixed(0)}만`
                        : `${cell.stats!.income.toLocaleString()}`}
                    </div>
                  )}
                  {hasExpense && (
                    <div className="text-rose-500 font-bold truncate">
                      -{cell.stats!.expense >= 1000000
                        ? `${(cell.stats!.expense / 10000).toFixed(0)}만`
                        : `${cell.stats!.expense.toLocaleString()}`}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 날짜 선택 시 노출되는 일자별 상세 팝오버 패널 */}
      {selectedDate && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
              <h4 className="ui-card-title text-sm sm:text-base font-bold text-on-surface">
                {selectedDate} 가계 상세
              </h4>
              {selectedStats && (
                <span className="text-xs text-on-surface-variant font-mono">
                  (총 {selectedStats.items.length}건)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onSelectDateAdd && (
                <button
                  type="button"
                  onClick={() => onSelectDateAdd(selectedDate)}
                  className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold text-xs hover:bg-primary/20 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>이 날짜에 추가</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!selectedStats || selectedStats.items.length === 0 ? (
            <div className="py-6 text-center text-xs text-on-surface-variant">
              이 날짜에 등록된 지출/수입 내역이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/30 space-y-1">
              {selectedStats.items.map((tx) => {
                const isExpense = tx.type === "expense";
                const isIncome = tx.type === "income";

                return (
                  <div
                    key={tx._id}
                    className="py-2.5 px-2 flex items-center justify-between gap-3 text-xs sm:text-sm hover:bg-surface-container-low rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isExpense
                            ? "bg-rose-500/10 text-rose-500"
                            : isIncome
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-sky-500/10 text-sky-500"
                        }`}
                      >
                        {isExpense ? (
                          <ArrowUpRight size={14} />
                        ) : isIncome ? (
                          <ArrowDownLeft size={14} />
                        ) : (
                          "↔"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-on-surface truncate">
                          {tx.title}
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded bg-surface-container">
                            {tx.category}
                          </span>
                          <span>{tx.paymentMethod || "카드"}</span>
                          {tx.isFixed && (
                            <span className="text-primary font-semibold">
                              (정기 고정비)
                            </span>
                          )}
                          {tx.receiptImage && (
                            <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                              <Receipt size={10} /> 영수증첨부
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`font-mono font-bold text-sm sm:text-base shrink-0 ${
                        isExpense
                          ? "text-rose-500"
                          : isIncome
                          ? "text-emerald-500"
                          : "text-sky-500"
                      }`}
                    >
                      {isExpense ? "-" : isIncome ? "+" : ""}₩{tx.amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
