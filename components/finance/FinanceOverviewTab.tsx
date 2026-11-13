"use client";

import React, { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  Zap,
} from "lucide-react";
import { TransactionItem, MonthBudget } from "./types";

interface Props {
  transactions: TransactionItem[];
  budget: MonthBudget | null;
  currentMonthKey: string;
  onOpenBudgetModal: () => void;
  onSelectCategoryFilter: (cat: string) => void;
}

export function FinanceOverviewTab({
  transactions,
  budget,
  currentMonthKey,
  onOpenBudgetModal,
  onSelectCategoryFilter,
}: Props) {
  // 통계 계산
  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    let fixedExpense = 0;
    let variableExpense = 0;
    const catMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.type === "income") {
        income += tx.amount;
      } else if (tx.type === "expense") {
        expense += tx.amount;
        if (tx.isRecurring) {
          fixedExpense += tx.amount;
        } else {
          variableExpense += tx.amount;
        }
        catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
      }
    });

    const net = income - expense;
    const catList = Object.entries(catMap)
      .map(([name, total]) => ({
        name,
        total,
        ratio: expense > 0 ? Math.round((total / expense) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      income,
      expense,
      fixedExpense,
      variableExpense,
      net,
      catList,
    };
  }, [transactions]);

  // 예산 소진율 및 오버 여부 계산
  const totalBudget = budget?.totalBudget || 0;
  const budgetRatio = totalBudget > 0 ? Math.round((stats.expense / totalBudget) * 100) : 0;
  const isOverBudget = totalBudget > 0 && stats.expense > totalBudget;
  const overAmount = isOverBudget ? stats.expense - totalBudget : 0;
  const remainBudget = totalBudget > 0 && !isOverBudget ? totalBudget - stats.expense : 0;

  // 일일 권장 지출액 (당월 잔여일 기준)
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, lastDayOfMonth - today.getDate() + 1);
  const dailyRecommended = remainBudget > 0 ? Math.round(remainBudget / remainingDays) : 0;

  return (
    <div className="w-full space-y-6">
      {/* 1. 상단 핵심 요약 4대 지표 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 총 수입 */}
        <div className="bg-surface-container-lowest border border-outline-variant p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span className="whitespace-nowrap">이번 달 총 수입</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
            +₩{stats.income.toLocaleString()}
          </div>
          <p className="text-[11px] text-on-surface-variant truncate">
            {transactions.filter((t) => t.type === "income").length}건 입금 기록됨
          </p>
        </div>

        {/* 총 지출 */}
        <div className="bg-surface-container-lowest border border-outline-variant p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span className="whitespace-nowrap">이번 달 총 지출</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
              <TrendingDown size={15} />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400 truncate">
            -₩{stats.expense.toLocaleString()}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-[11px] text-on-surface-variant font-mono">
            <span>고정: ₩{stats.fixedExpense.toLocaleString()}</span>
            <span>변동: ₩{stats.variableExpense.toLocaleString()}</span>
          </div>
        </div>

        {/* 순수익 / 잉여금 */}
        <div className="bg-surface-container-lowest border border-outline-variant p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span className="whitespace-nowrap">당월 잔여 잉여금</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Wallet size={15} />
            </div>
          </div>
          <div
            className={`text-base sm:text-2xl font-black font-mono truncate ${
              stats.net >= 0 ? "text-primary" : "text-rose-500"
            }`}
          >
            {stats.net >= 0 ? `+₩${stats.net.toLocaleString()}` : `-₩${Math.abs(stats.net).toLocaleString()}`}
          </div>
          <p className="text-[11px] text-on-surface-variant truncate">
            {stats.net >= 0 ? "저축 및 투자 여력 확보" : "지출이 수입 초과"}
          </p>
        </div>

        {/* 예산 진행률 요약 */}
        <div className="bg-surface-container-lowest border border-outline-variant p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium">
            <span className="whitespace-nowrap">예산 대비 소진율</span>
            <button
              onClick={onOpenBudgetModal}
              className="text-[11px] text-primary hover:underline font-semibold shrink-0 cursor-pointer"
            >
              예산 수정
            </button>
          </div>
          <div className="flex items-baseline gap-1.5 truncate">
            <span
              className={`text-base sm:text-2xl font-black font-mono ${
                isOverBudget ? "text-rose-500" : budgetRatio >= 80 ? "text-amber-500" : "text-primary"
              }`}
            >
              {totalBudget > 0 ? `${budgetRatio}%` : "미설정"}
            </span>
            {totalBudget > 0 && (
              <span className="text-[10px] sm:text-xs text-on-surface-variant font-mono truncate">
                / ₩{totalBudget.toLocaleString()}
              </span>
            )}
          </div>
          {totalBudget > 0 ? (
            <div className="space-y-1">
              <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, budgetRatio)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    isOverBudget ? "bg-rose-500" : budgetRatio >= 80 ? "bg-amber-500" : "bg-primary"
                  }`}
                />
              </div>
              <p className="text-[10px] font-mono text-on-surface-variant text-right">
                {isOverBudget ? `₩${overAmount.toLocaleString()} 초과!` : `₩${remainBudget.toLocaleString()} 남음`}
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-on-surface-variant">예산을 설정하여 과소비를 방지하세요.</p>
          )}
        </div>
      </div>

      {/* 2. 중단: 예산 관리 상세 게이지 & 카테고리별 소비 비중 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 좌측: 예산 심층 모니터링 (5열) */}
        <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
            <div className="flex items-center gap-2">
              <PieChartIcon size={18} className="text-primary" />
              <h3 className="ui-section-title">예산 진행률 & 한도 관리</h3>
            </div>
            {isOverBudget && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center gap-1">
                <AlertTriangle size={12} />
                <span>예산 초과 경고</span>
              </span>
            )}
          </div>

          {totalBudget > 0 ? (
            <div className="space-y-4">
              {/* 대형 진행률 바 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant font-medium">소진 현황</span>
                  <span className="font-mono font-bold text-on-surface">
                    ₩{stats.expense.toLocaleString()} / ₩{totalBudget.toLocaleString()} ({budgetRatio}%)
                  </span>
                </div>
                <div className="w-full h-4 rounded-full bg-surface-container p-0.5 border border-outline-variant/60 overflow-hidden relative">
                  <div
                    style={{ width: `${Math.min(100, budgetRatio)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverBudget
                        ? "bg-rose-500"
                        : budgetRatio >= 80
                        ? "bg-amber-500"
                        : "bg-gradient-to-r from-emerald-500 to-primary"
                    }`}
                  />
                  {/* 50%, 80% 벤치마크 마커 */}
                  <span className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-background/60" title="50% 기준선" />
                  <span className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-background/60" title="80% 경고선" />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-on-surface-variant/70">
                  <span>0%</span>
                  <span>50%</span>
                  <span>80% (주의)</span>
                  <span>100% (한도)</span>
                </div>
              </div>

              {/* 예산 잔여 및 일일 가이드 */}
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">이번 달 남은 기간:</span>
                  <span className="font-mono font-bold text-on-surface">{remainingDays}일 남음</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-on-surface-variant">일일 권장 지출액:</span>
                  <span className="font-mono font-bold text-primary">
                    {isOverBudget ? "지출을 멈추거나 긴축 필요" : `약 ₩${dailyRecommended.toLocaleString()} / 일`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/40">
                  <span className="text-on-surface-variant">초과 / 남은 금액:</span>
                  <span
                    className={`font-mono font-bold ${isOverBudget ? "text-rose-500" : "text-emerald-500"}`}
                  >
                    {isOverBudget ? `-₩${overAmount.toLocaleString()} 초과` : `+₩${remainBudget.toLocaleString()} 남음`}
                  </span>
                </div>
              </div>

              {/* 고정비 vs 변동비 비율 분석 */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-on-surface font-medium">
                    <Repeat size={14} className="text-purple-500" />
                    고정비(정기결제) 비중
                  </span>
                  <span className="font-mono text-on-surface-variant">
                    {stats.expense > 0 ? Math.round((stats.fixedExpense / stats.expense) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden flex">
                  <div
                    style={{
                      width: `${stats.expense > 0 ? (stats.fixedExpense / stats.expense) * 100 : 0}%`,
                    }}
                    className="bg-purple-500 h-full"
                    title="고정비"
                  />
                  <div
                    style={{
                      width: `${stats.expense > 0 ? (stats.variableExpense / stats.expense) * 100 : 0}%`,
                    }}
                    className="bg-blue-500 h-full"
                    title="변동비"
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                    고정비 ₩{stats.fixedExpense.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                    변동비 ₩{stats.variableExpense.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center space-y-3">
              <Wallet size={32} className="mx-auto text-on-surface-variant/50" />
              <div className="ui-card-title text-on-surface font-bold">이번 달 예산이 설정되지 않았습니다</div>
              <p className="ui-caption text-on-surface-variant max-w-xs mx-auto">
                한 달 총 지출 한도를 정해두면 예산 대비 소진율과 초과 경고를 실시간으로 받아볼 수 있습니다.
              </p>
              <button
                onClick={onOpenBudgetModal}
                className="ui-button px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs"
              >
                + 이번 달 예산 설정하기
              </button>
            </div>
          )}
        </div>

        {/* 우측: 카테고리별 지출 비중 랭킹 차트 (7열) */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-primary" />
              <h3 className="ui-section-title">카테고리별 지출 분포 ({stats.catList.length}개 분류)</h3>
            </div>
            <span className="ui-caption text-on-surface-variant font-mono">
              총 ₩{stats.expense.toLocaleString()}
            </span>
          </div>

          {stats.catList.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant ui-caption">
              이번 달 지출 기록이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.catList.map((item, idx) => {
                const colors = [
                  "bg-rose-500",
                  "bg-amber-500",
                  "bg-blue-500",
                  "bg-purple-500",
                  "bg-emerald-500",
                  "bg-violet-500",
                  "bg-teal-500",
                  "bg-slate-500",
                ];
                const barColor = colors[idx % colors.length];

                return (
                  <div
                    key={item.name}
                    onClick={() => onSelectCategoryFilter(item.name)}
                    className="p-2.5 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer space-y-1.5 border border-outline-variant/30"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-semibold text-on-surface">
                        <span className="w-5 text-center font-mono text-[11px] text-on-surface-variant">
                          #{idx + 1}
                        </span>
                        <span>{item.name}</span>
                        <span className="text-[11px] font-mono text-primary font-bold">
                          {item.ratio}%
                        </span>
                      </div>
                      <span className="font-mono font-bold text-on-surface">
                        ₩{item.total.toLocaleString()}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
                      <div
                        style={{ width: `${item.ratio}%` }}
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. 하단: 금융 비서 AI 맞춤 소비 패턴 진단 리포트 */}
      <div className="bg-gradient-to-r from-primary/10 via-surface-container-low to-surface-container-lowest border border-primary/30 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="ui-card-title text-on-surface font-bold flex items-center gap-2">
              <span>금융 비서 AI 소비 패턴 맞춤 진단</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/20 text-primary font-bold">
                Smart Report
              </span>
            </h3>
            <p className="ui-caption text-on-surface-variant font-light">
              실시간 수입·지출 빅데이터와 정기 결제를 분석한 스마트 재정 조언입니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1">
            <span className="text-primary font-bold flex items-center gap-1">
              <Zap size={14} />
              최대 지출 항목 진단
            </span>
            <p className="text-on-surface-variant leading-relaxed">
              {stats.catList[0]
                ? `이번 달 가장 많은 돈이 쓰인 곳은 '${stats.catList[0].name}'(₩${stats.catList[0].total.toLocaleString()}, ${stats.catList[0].ratio}%)입니다.`
                : "지출 내역이 충분히 등록되면 패턴을 자동 분석합니다."}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1">
            <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
              <Repeat size={14} />
              고정비 절약 제안
            </span>
            <p className="text-on-surface-variant leading-relaxed">
              매달 나가는 고정비가 총 ₩{stats.fixedExpense.toLocaleString()}입니다. 미사용 구독 서비스나 통신 요금제를 점검하면 연간 최대 수십만 원을 절약할 수 있습니다.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 size={14} />
              재정 건전성 평가
            </span>
            <p className="text-on-surface-variant leading-relaxed">
              {stats.net >= 0
                ? `수입 대비 지출 통제가 양호합니다. 잉여금 ₩${stats.net.toLocaleString()}을 저축이나 부채 상환으로 배분해 보세요.`
                : "지출이 수입보다 많습니다. 변동비 항목을 점검하고 예산 한도 내에서 지출을 조율하세요."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
