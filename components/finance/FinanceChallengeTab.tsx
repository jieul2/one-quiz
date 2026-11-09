"use client";

import { useMemo } from "react";
import { FinanceTransaction } from "./types";
import {
  Trophy,
  Flame,
  Sprout,
  TreeDeciduous,
  Award,
  CheckCircle2,
  Calendar,
  Sparkles,
  Zap,
} from "lucide-react";

interface Props {
  transactions: FinanceTransaction[];
  monthKey: string;
}

export function FinanceChallengeTab({ transactions, monthKey }: Props) {
  const [year, month] = useMemo(() => {
    const parts = monthKey.split("-").map(Number);
    return [parts[0] || 2026, parts[1] || 11];
  }, [monthKey]);

  // 이번 달 일자별 지출 내역
  const { noSpendDays, totalExpenseDays, totalDaysInMonth } = useMemo(() => {
    const lastDay = new Date(year, month, 0).getDate();
    const expenseDaysSet = new Set<number>();

    transactions.forEach((tx) => {
      if (tx.type === "expense" && tx.amount > 0) {
        const d = parseInt(tx.date.slice(8, 10), 10);
        if (!isNaN(d)) expenseDaysSet.add(d);
      }
    });

    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() + 1 === month;
    const currentMaxDay = isCurrentMonth ? today.getDate() : lastDay;

    let noSpendCount = 0;
    for (let day = 1; day <= currentMaxDay; day++) {
      if (!expenseDaysSet.has(day)) {
        noSpendCount++;
      }
    }

    return {
      noSpendDays: noSpendCount,
      totalExpenseDays: expenseDaysSet.size,
      totalDaysInMonth: lastDay,
    };
  }, [transactions, year, month]);

  // 캐릭터/식물 성장 레벨 계산 (0~100점)
  const growthRate = Math.min(
    100,
    Math.round((noSpendDays / Math.max(1, totalDaysInMonth / 2)) * 100)
  );

  const plantLevel = useMemo(() => {
    if (growthRate >= 80) {
      return {
        name: "황금 열매 나무",
        icon: "🌳",
        stage: "최종 4단계",
        desc: "최고의 절약 마스터! 자산이 무럭무럭 풍성하게 자라나고 있습니다.",
      };
    } else if (growthRate >= 50) {
      return {
        name: "활짝 핀 꽃",
        icon: "🌸",
        stage: "3단계",
        desc: "불필요한 지출을 훌륭히 방어하고 있습니다. 목표 달성이 코앞이에요!",
      };
    } else if (growthRate >= 20) {
      return {
        name: "파릇파릇 새싹",
        icon: "🌱",
        stage: "2단계",
        desc: "무지출 챌린지가 순조롭게 성장하고 있습니다. 꾸준함이 비결이에요!",
      };
    } else {
      return {
        name: "꿈틀꿈틀 씨앗",
        icon: "🌰",
        stage: "1단계",
        desc: "첫 무지출 성공을 달성하면 씨앗에서 싹이 돋아납니다!",
      };
    }
  }, [growthRate]);

  return (
    <div className="space-y-5">
      {/* 1. 상단 무지출 챌린지 요약 배너 */}
      <div className="bg-gradient-to-r from-emerald-500/15 via-surface-container-lowest to-surface-container-lowest border border-emerald-500/25 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Flame size={26} className="text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="ui-card-title text-base font-bold text-on-surface">
                {month}월 무지출 챌린지 (No-Spend Challenge)
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono font-bold shadow-xs">
                {noSpendDays}일 달성
              </span>
            </div>
            <p className="ui-caption text-xs text-on-surface-variant mt-1">
              하루 동안 지출을 0원으로 방어하여 절약 습관을 길러보세요!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[11px] text-on-surface-variant">이번 달 지출 발생일</span>
            <div className="text-sm font-bold font-mono text-on-surface">
              {totalExpenseDays}일 / {totalDaysInMonth}일
            </div>
          </div>
        </div>
      </div>

      {/* 2. 자산 성장 식물/캐릭터 키우기 위젯 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sprout size={18} />
            </div>
            <div>
              <h3 className="ui-card-title text-base font-bold text-on-surface">
                나의 자산 성장 캐릭터
              </h3>
              <p className="ui-caption text-xs text-on-surface-variant">
                무지출 달성일과 저축 목표에 따라 식물이 진화합니다
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-primary font-mono">
            {plantLevel.stage}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-surface-container-low border border-outline-variant/60">
          <div className="text-6xl sm:text-7xl select-none animate-bounce">
            {plantLevel.icon}
          </div>

          <div className="space-y-2 flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-lg font-black text-on-surface">
                {plantLevel.name}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                성장률 {growthRate}%
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {plantLevel.desc}
            </p>

            {/* 게이지 바 */}
            <div className="space-y-1 pt-1">
              <div className="w-full h-3 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-500"
                  style={{ width: `${growthRate}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-on-surface-variant">
                <span>씨앗 (0%)</span>
                <span>새싹 (20%)</span>
                <span>꽃 (50%)</span>
                <span>황금나무 (80%+)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 챌린지 업적 배지 카드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-outline-variant">
          <Award size={18} className="text-amber-500" />
          <h3 className="ui-card-title text-base font-bold text-on-surface">
            절약 마스터 배지 컬렉션
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              noSpendDays >= 3
                ? "bg-emerald-500/10 border-emerald-500/30 text-on-surface"
                : "bg-surface-container-low/50 border-outline-variant/40 opacity-50 text-on-surface-variant"
            }`}
          >
            <div className="text-2xl">🥉</div>
            <div>
              <div className="font-bold text-xs text-on-surface">작은 절약의 시작</div>
              <div className="text-[11px] text-on-surface-variant">무지출 3일 달성</div>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              noSpendDays >= 7
                ? "bg-primary/10 border-primary/30 text-on-surface"
                : "bg-surface-container-low/50 border-outline-variant/40 opacity-50 text-on-surface-variant"
            }`}
          >
            <div className="text-2xl">🥈</div>
            <div>
              <div className="font-bold text-xs text-on-surface">일주일 세이빙 챔피언</div>
              <div className="text-[11px] text-on-surface-variant">무지출 7일 달성</div>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 ${
              noSpendDays >= 14
                ? "bg-amber-500/10 border-amber-500/30 text-on-surface"
                : "bg-surface-container-low/50 border-outline-variant/40 opacity-50 text-on-surface-variant"
            }`}
          >
            <div className="text-2xl">🥇</div>
            <div>
              <div className="font-bold text-xs text-on-surface">전설의 자산 수호자</div>
              <div className="text-[11px] text-on-surface-variant">무지출 14일 달성</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
