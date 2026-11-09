"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FinanceTransaction,
  FinanceBudget,
  FinanceAsset,
} from "./types";
import { FinanceOverviewTab } from "./FinanceOverviewTab";
import { FinanceTransactionsTab } from "./FinanceTransactionsTab";
import { FinanceCalendarTab } from "./FinanceCalendarTab";
import { FinanceAssetsTab } from "./FinanceAssetsTab";
import { FinanceGroupTab } from "./FinanceGroupTab";
import { FinanceChallengeTab } from "./FinanceChallengeTab";
import {
  LayoutDashboard,
  Receipt,
  Calendar,
  Wallet,
  Users,
  Trophy,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Plus,
  X,
  Sparkles,
} from "lucide-react";

export function FinanceView() {
  // 현재 년월 키 (기본값: 로컬 현재 시각 기준 "YYYY-MM")
  const [monthKey, setMonthKey] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // 개인 vs 그룹 가계부 스위칭
  const [scope, setScope] = useState<"personal" | "group">("personal");

  // 활성 탭
  const [activeTab, setActiveTab] = useState<
    "overview" | "transactions" | "calendar" | "assets" | "group" | "challenge"
  >("overview");

  // 데이터 상태
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [budget, setBudget] = useState<FinanceBudget | null>(null);
  const [assets, setAssets] = useState<FinanceAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 예산 설정 모달 상태
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>("1500000");

  // 1. 트랜잭션 데이터 로드
  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/finance/transactions?monthKey=${monthKey}&scope=${scope}`
      );
      if (res.ok) {
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load transactions", err);
    }
  }, [monthKey, scope]);

  // 2. 예산 데이터 로드
  const fetchBudgets = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/budgets?monthKey=${monthKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.monthKey) {
          setBudget(data);
          setBudgetInput(String(data.totalBudget || 1500000));
        }
      }
    } catch (err) {
      console.error("Failed to load budgets", err);
    }
  }, [monthKey]);

  // 3. 자산 데이터 로드
  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/finance/assets");
      if (res.ok) {
        const data = await res.json();
        setAssets(Array.isArray(data.assets) ? data.assets : []);
      }
    } catch (err) {
      console.error("Failed to load assets", err);
    }
  }, []);

  // 전체 데이터 초기화 & 월 변경 시 재조회
  useEffect(() => {
    let ignore = false;
    async function loadAll() {
      setIsLoading(true);
      await Promise.all([fetchTransactions(), fetchBudgets(), fetchAssets()]);
      if (!ignore) setIsLoading(false);
    }
    loadAll();
    return () => {
      ignore = true;
    };
  }, [fetchTransactions, fetchBudgets, fetchAssets]);

  // 월 전환 핸들러 (< 이전달, > 다음달)
  const handlePrevMonth = () => {
    const [y, m] = monthKey.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setMonthKey(
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const handleNextMonth = () => {
    const [y, m] = monthKey.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    setMonthKey(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`
    );
  };

  // 트랜잭션 CRUD
  const handleAddTransaction = async (data: Partial<FinanceTransaction>) => {
    try {
      const res = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTransaction = async (
    id: string,
    data: Partial<FinanceTransaction>
  ) => {
    try {
      const res = await fetch(`/api/finance/transactions?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/finance/transactions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTransactions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 자산 CRUD
  const handleAddAsset = async (data: Partial<FinanceAsset>) => {
    try {
      const res = await fetch("/api/finance/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchAssets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAsset = async (id: string, data: Partial<FinanceAsset>) => {
    try {
      const res = await fetch(`/api/finance/assets?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        fetchAssets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const res = await fetch(`/api/finance/assets?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAssets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 예산 저장
  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(budgetInput);
    if (isNaN(val) || val < 0) {
      alert("올바른 예산 금액을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthKey,
          totalBudget: val,
        }),
      });
      if (res.ok) {
        setIsBudgetModalOpen(false);
        fetchBudgets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-12">
      {/* 1. 상단 표준 페이지 헤더 (Rule 52 준수) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="ui-page-title text-on-surface">
              스마트 가계부
            </h1>
            {/* 개인 vs 그룹 토글 뱃지 */}
            <button
              type="button"
              onClick={() => setScope(scope === "personal" ? "group" : "personal")}
              className={`ui-badge text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition-all cursor-pointer ${
                scope === "group"
                  ? "bg-primary text-on-primary shadow-2xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
              title="개인 ↔ 그룹 가계부 전환"
            >
              {scope === "group" ? <Users size={12} /> : null}
              <span>{scope === "group" ? "공유 가계부" : "개인 가계부"}</span>
            </button>
          </div>
          <p className="ui-page-subtitle">
            수입·지출 자동 집계, 영수증 AI OCR, 예산 관리 및 순자산 트래커
          </p>
        </div>

        {/* 월 변경 컨트롤 & 액션 버튼 */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap sm:flex-wrap py-1 shrink-0">
          {/* 년월 선택기 */}
          <div className="flex items-center bg-surface-container-low border border-outline-variant rounded-xl p-1 gap-1 shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
              title="이전 달"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-mono font-bold text-xs sm:text-sm px-2 text-on-surface shrink-0 whitespace-nowrap">
              {monthKey}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
              title="다음 달"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 예산 설정 버튼 */}
          <button
            type="button"
            onClick={() => setIsBudgetModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface font-semibold text-xs hover:bg-surface-container transition-colors cursor-pointer shadow-2xs shrink-0 whitespace-nowrap"
            title="이번 달 목표 예산 설정"
          >
            <SlidersHorizontal size={14} className="shrink-0" />
            <span>예산 설정</span>
          </button>
        </div>
      </div>

      {/* 2. 6대 탭 내비게이션 바 */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 bg-surface-container-low border border-outline-variant rounded-2xl text-xs sm:text-sm font-semibold select-none scrollbar-none no-scrollbar flex-nowrap max-w-full">
        {(
          [
            { id: "overview", label: "대시보드 개요", icon: LayoutDashboard },
            { id: "transactions", label: "거래 내역", icon: Receipt },
            { id: "calendar", label: "캘린더 뷰", icon: Calendar },
            { id: "assets", label: "자산 & 대출", icon: Wallet },
            { id: "group", label: "공유 & 정산", icon: Users },
            { id: "challenge", label: "무지출 챌린지", icon: Trophy },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="shrink-0 whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. 탭별 메인 컨텐츠 */}
      {isLoading ? (
        <div className="py-24 text-center text-xs text-on-surface-variant flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>가계부 데이터를 불러오는 중...</span>
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <FinanceOverviewTab
              transactions={transactions}
              budget={budget}
              currentMonthKey={monthKey}
              onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
              onSelectCategoryFilter={(cat) => {
                setActiveTab("transactions");
              }}
            />
          )}

          {activeTab === "transactions" && (
            <FinanceTransactionsTab
              transactions={transactions}
              monthKey={monthKey}
              scope={scope}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === "calendar" && (
            <FinanceCalendarTab
              transactions={transactions}
              monthKey={monthKey}
              onSelectDateAdd={(dateStr) => {
                setActiveTab("transactions");
              }}
            />
          )}

          {activeTab === "assets" && (
            <FinanceAssetsTab
              assets={assets}
              onAddAsset={handleAddAsset}
              onUpdateAsset={handleUpdateAsset}
              onDeleteAsset={handleDeleteAsset}
            />
          )}

          {activeTab === "group" && (
            <FinanceGroupTab
              scope={scope}
              onToggleScope={(newScope) => setScope(newScope)}
            />
          )}

          {activeTab === "challenge" && (
            <FinanceChallengeTab
              transactions={transactions}
              monthKey={monthKey}
            />
          )}
        </>
      )}

      {/* ================= 4. 월간 예산 설정 모달 ================= */}
      {isBudgetModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsBudgetModalOpen(false)}
        >
          <div
            className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <SlidersHorizontal size={16} />
                </div>
                <h3 className="ui-card-title text-base font-bold text-on-surface">
                  {monthKey}월 목표 예산 설정
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  이번 달 총 지출 목표 예산 (원)
                </label>
                <input
                  type="number"
                  required
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="예: 1500000"
                  className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl font-mono text-base font-black text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>

              <p className="ui-caption text-xs text-on-surface-variant/80 leading-relaxed">
                ※ 설정한 예산을 기준으로 50%, 80%, 100% 도달 시 시각적 게이지 및
                초과 지출 경고 뱃지가 자동으로 표시됩니다.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:opacity-95 shadow-xs transition-opacity cursor-pointer active:scale-[0.98]"
                >
                  예산 저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
