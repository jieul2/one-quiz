"use client";

import { useState, useMemo } from "react";
import { FinanceAsset, AssetType } from "./types";
import {
  Wallet,
  PiggyBank,
  ShieldCheck,
  CreditCard,
  Building,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  Calculator,
  X,
  Info,
} from "lucide-react";

interface Props {
  assets: FinanceAsset[];
  onAddAsset: (data: Partial<FinanceAsset>) => Promise<void>;
  onUpdateAsset: (id: string, data: Partial<FinanceAsset>) => Promise<void>;
  onDeleteAsset: (id: string) => Promise<void>;
}

export function FinanceAssetsTab({
  assets,
  onAddAsset,
  onUpdateAsset,
  onDeleteAsset,
}: Props) {
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<FinanceAsset | null>(null);

  // 폼 상태
  const [formType, setFormType] = useState<AssetType>("savings");
  const [formName, setFormName] = useState("");
  const [formInstitution, setFormInstitution] = useState("");
  const [formCurrentBalance, setFormCurrentBalance] = useState("");
  const [formInterestRate, setFormInterestRate] = useState("");
  const [formMonthlyPayment, setFormMonthlyPayment] = useState("");
  const [formMaturityDate, setFormMaturityDate] = useState("");
  const [formMemo, setFormMemo] = useState("");

  // ================= 대출 상환 시뮬레이터 상태 =================
  const [simLoanAmount, setSimLoanAmount] = useState<number>(50000000); // 5천만원
  const [simInterestRate, setSimInterestRate] = useState<number>(4.5); // 4.5%
  const [simPeriodMonths, setSimPeriodMonths] = useState<number>(36); // 3년(36개월)
  const [simRepayMethod, setSimRepayMethod] = useState<"equal_principal_interest" | "equal_principal">("equal_principal_interest");

  // 대출 시뮬레이션 계산
  const simResult = useMemo(() => {
    const P = simLoanAmount;
    const r = simInterestRate / 100 / 12; // 월 이자율
    const n = simPeriodMonths;

    if (P <= 0 || n <= 0) {
      return { monthlyPayment: 0, totalPayment: 0, totalInterest: 0 };
    }

    if (simRepayMethod === "equal_principal_interest") {
      // 원리금 균등상환: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
      if (r === 0) {
        const pmt = Math.round(P / n);
        return { monthlyPayment: pmt, totalPayment: P, totalInterest: 0 };
      }
      const pmt = Math.round((P * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1));
      const total = pmt * n;
      const interest = total - P;
      return { monthlyPayment: pmt, totalPayment: total, totalInterest: interest };
    } else {
      // 원금 균등상환: 첫달 = P/n + P*r, 마지막달 = P/n + (P/n)*r
      const principalPerMonth = P / n;
      const firstMonthPayment = Math.round(principalPerMonth + P * r);
      // 총이자 = r * P * (n+1) / 2
      const totalInterest = Math.round((r * P * (n + 1)) / 2);
      const total = P + totalInterest;
      return { monthlyPayment: firstMonthPayment, totalPayment: total, totalInterest };
    }
  }, [simLoanAmount, simInterestRate, simPeriodMonths, simRepayMethod]);

  // 총자산 및 부채, 순자산 계산
  const { totalSavings, totalInsurance, totalRealEstate, totalLoans, netWorth } = useMemo(() => {
    let savings = 0;
    let insurance = 0;
    let realEstate = 0;
    let loans = 0;

    assets.forEach((a) => {
      const bal = a.currentBalance || 0;
      if (a.type === "savings") savings += bal;
      else if (a.type === "insurance") insurance += bal;
      else if (a.type === "real_estate") realEstate += bal;
      else if (a.type === "loan") loans += bal;
    });

    const net = savings + realEstate + insurance - loans;
    return {
      totalSavings: savings,
      totalInsurance: insurance,
      totalRealEstate: realEstate,
      totalLoans: loans,
      netWorth: net,
    };
  }, [assets]);

  // 자산 추가 모달 열기
  const handleOpenAdd = (type: AssetType = "savings") => {
    setEditingAsset(null);
    setFormType(type);
    setFormName("");
    setFormInstitution("");
    setFormCurrentBalance("");
    setFormInterestRate("");
    setFormMonthlyPayment("");
    setFormMaturityDate("");
    setFormMemo("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: FinanceAsset) => {
    setEditingAsset(a);
    setFormType(a.type);
    setFormName(a.name);
    setFormInstitution(a.institution || "");
    setFormCurrentBalance(String(a.currentBalance));
    setFormInterestRate(a.interestRate ? String(a.interestRate) : "");
    setFormMonthlyPayment(a.monthlyPayment ? String(a.monthlyPayment) : "");
    setFormMaturityDate(a.maturityDate ? a.maturityDate.slice(0, 10) : "");
    setFormMemo(a.memo || "");
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const balNum = Number(formCurrentBalance);
    if (!formName.trim() || isNaN(balNum) || balNum < 0) {
      alert("올바른 자산명과 금액을 입력해주세요.");
      return;
    }

    const payload: Partial<FinanceAsset> = {
      type: formType,
      name: formName.trim(),
      institution: formInstitution.trim(),
      currentBalance: balNum,
      interestRate: formInterestRate ? Number(formInterestRate) : undefined,
      monthlyPayment: formMonthlyPayment ? Number(formMonthlyPayment) : undefined,
      maturityDate: formMaturityDate || undefined,
      memo: formMemo.trim(),
    };

    if (editingAsset?._id) {
      await onUpdateAsset(editingAsset._id, payload);
    } else {
      await onAddAsset(payload);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* 1. 상단 순자산 (Net Worth) 총괄 대시보드 카드 */}
      <div className="bg-gradient-to-br from-primary/15 via-surface-container-lowest to-surface-container-lowest border border-primary/20 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <TrendingUp size={15} />
              <span>종합 순자산 (Net Worth Tracker)</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-on-surface mt-1">
              ₩{netWorth.toLocaleString()}
            </div>
            <p className="ui-caption text-xs text-on-surface-variant mt-1">
              (저축·예적금 + 부동산 + 보험) - (대출 및 총부채)
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAdd("savings")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm hover:opacity-95 shadow-xs cursor-pointer transition-transform active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>새 자산 / 부채 등록</span>
          </button>
        </div>

        {/* 4분할 자산 구성 메트릭 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-outline-variant/50 text-xs">
          <div className="bg-surface-container-low/80 p-3 rounded-xl border border-outline-variant/40">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <PiggyBank size={14} className="text-emerald-500" />
              <span>저축 / 예적금</span>
            </div>
            <div className="font-mono font-bold text-sm text-on-surface mt-1">
              ₩{totalSavings.toLocaleString()}
            </div>
          </div>

          <div className="bg-surface-container-low/80 p-3 rounded-xl border border-outline-variant/40">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <Building size={14} className="text-sky-500" />
              <span>부동산 자산</span>
            </div>
            <div className="font-mono font-bold text-sm text-on-surface mt-1">
              ₩{totalRealEstate.toLocaleString()}
            </div>
          </div>

          <div className="bg-surface-container-low/80 p-3 rounded-xl border border-outline-variant/40">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <ShieldCheck size={14} className="text-indigo-500" />
              <span>보험 보장자산</span>
            </div>
            <div className="font-mono font-bold text-sm text-on-surface mt-1">
              ₩{totalInsurance.toLocaleString()}
            </div>
          </div>

          <div className="bg-surface-container-low/80 p-3 rounded-xl border border-outline-variant/40">
            <div className="flex items-center gap-1.5 text-on-surface-variant">
              <CreditCard size={14} className="text-rose-500" />
              <span>대출 / 총부채</span>
            </div>
            <div className="font-mono font-bold text-sm text-rose-500 mt-1">
              -₩{totalLoans.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 대출 상환 시뮬레이터 (핵심 차별화 인터랙티브 계산기) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="ui-card-title text-base font-bold text-on-surface">
                대출 상환 시뮬레이터
              </h3>
              <p className="ui-caption text-xs text-on-surface-variant">
                원리금 균등 vs 원금 균등 방식에 따른 월 상환액과 총 이자를 실시간으로 시각화합니다
              </p>
            </div>
          </div>

          {/* 상환 방식 선택 */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/60 text-xs">
            <button
              type="button"
              onClick={() => setSimRepayMethod("equal_principal_interest")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                simRepayMethod === "equal_principal_interest"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              원리금 균등
            </button>
            <button
              type="button"
              onClick={() => setSimRepayMethod("equal_principal")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                simRepayMethod === "equal_principal"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              원금 균등
            </button>
          </div>
        </div>

        {/* 시뮬레이터 인풋 3개 슬라이더/인풋 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5 bg-surface-container-low/60 p-3.5 rounded-xl border border-outline-variant/40">
            <label className="font-semibold text-on-surface-variant flex justify-between">
              <span>대출 원금</span>
              <span className="font-mono text-primary font-bold">
                {(simLoanAmount / 10000).toLocaleString()}만원
              </span>
            </label>
            <input
              type="range"
              min={1000000}
              max={500000000}
              step={1000000}
              value={simLoanAmount}
              onChange={(e) => setSimLoanAmount(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 bg-surface-container-low/60 p-3.5 rounded-xl border border-outline-variant/40">
            <label className="font-semibold text-on-surface-variant flex justify-between">
              <span>연 이자율 (%)</span>
              <span className="font-mono text-primary font-bold">
                {simInterestRate.toFixed(1)}%
              </span>
            </label>
            <input
              type="range"
              min={1}
              max={15}
              step={0.1}
              value={simInterestRate}
              onChange={(e) => setSimInterestRate(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 bg-surface-container-low/60 p-3.5 rounded-xl border border-outline-variant/40">
            <label className="font-semibold text-on-surface-variant flex justify-between">
              <span>대출 기간 (개월)</span>
              <span className="font-mono text-primary font-bold">
                {simPeriodMonths}개월 ({Math.floor(simPeriodMonths / 12)}년)
              </span>
            </label>
            <input
              type="range"
              min={6}
              max={360}
              step={6}
              value={simPeriodMonths}
              onChange={(e) => setSimPeriodMonths(Number(e.target.value))}
              className="w-full accent-primary cursor-pointer"
            />
          </div>
        </div>

        {/* 시뮬레이션 결과 리포트 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center">
          <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60">
            <span className="text-xs text-on-surface-variant font-medium">
              {simRepayMethod === "equal_principal_interest" ? "매월 상환액" : "첫 달 상환액"}
            </span>
            <div className="text-lg font-black font-mono text-primary mt-0.5">
              ₩{simResult.monthlyPayment.toLocaleString()}
            </div>
          </div>

          <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60">
            <span className="text-xs text-on-surface-variant font-medium">
              총 발생 이자
            </span>
            <div className="text-lg font-black font-mono text-rose-500 mt-0.5">
              ₩{simResult.totalInterest.toLocaleString()}
            </div>
          </div>

          <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/60">
            <span className="text-xs text-on-surface-variant font-medium">
              총 상환 원리금
            </span>
            <div className="text-lg font-black font-mono text-on-surface mt-0.5">
              ₩{simResult.totalPayment.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 3. 등록된 자산 / 부채 리스트 목록 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <h3 className="ui-card-title text-base font-bold text-on-surface">
            보유 자산 및 부채 목록 ({assets.length}개)
          </h3>
          <button
            type="button"
            onClick={() => handleOpenAdd("savings")}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Plus size={13} />
            <span>자산 추가</span>
          </button>
        </div>

        {assets.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Wallet className="w-10 h-10 text-on-surface-variant/40 mx-auto" />
            <p className="ui-card-title text-sm text-on-surface-variant">
              등록된 자산이 없습니다.
            </p>
            <p className="ui-caption text-xs text-on-surface-variant/70">
              저축, 예적금, 보험, 대출 등을 등록하여 한눈에 순자산 흐름을 관리해보세요.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assets.map((a) => {
              const isLoan = a.type === "loan";
              const isSavings = a.type === "savings";
              const isInsurance = a.type === "insurance";

              return (
                <div
                  key={a._id}
                  className="p-3.5 rounded-xl bg-surface-container-low/70 border border-outline-variant/60 hover:border-primary/40 transition-colors flex items-start justify-between gap-3 group"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLoan
                          ? "bg-rose-500/10 text-rose-500"
                          : isSavings
                          ? "bg-emerald-500/10 text-emerald-500"
                          : isInsurance
                          ? "bg-indigo-500/10 text-indigo-500"
                          : "bg-sky-500/10 text-sky-500"
                      }`}
                    >
                      {isLoan ? (
                        <CreditCard size={18} />
                      ) : isSavings ? (
                        <PiggyBank size={18} />
                      ) : isInsurance ? (
                        <ShieldCheck size={18} />
                      ) : (
                        <Building size={18} />
                      )}
                    </div>

                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-on-surface truncate">
                          {a.name}
                        </span>
                        {a.institution && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-container text-on-surface-variant font-medium">
                            {a.institution}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                        {a.interestRate !== undefined && (
                          <span>금리: {a.interestRate}%</span>
                        )}
                        {a.monthlyPayment !== undefined && (
                          <span>월납: ₩{a.monthlyPayment.toLocaleString()}</span>
                        )}
                      </div>

                      {a.memo && (
                        <p className="text-[11px] text-on-surface-variant/80 italic truncate">
                          {a.memo}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-mono font-bold text-sm sm:text-base ${
                        isLoan ? "text-rose-500" : "text-on-surface"
                      }`}
                    >
                      {isLoan ? "-" : ""}₩{a.currentBalance.toLocaleString()}
                    </div>

                    <div className="flex items-center justify-end gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(a)}
                        className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        title="수정"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`"${a.name}" 항목을 삭제하시겠습니까?`)) {
                            onDeleteAsset(a._id);
                          }
                        }}
                        className="p-1 rounded text-on-surface-variant hover:text-rose-500 transition-colors cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= 4. 자산 / 부채 추가 & 수정 모달 ================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h3 className="ui-card-title text-base font-bold text-on-surface">
                {editingAsset ? "자산 / 부채 수정" : "새 자산 / 부채 등록"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs sm:text-sm">
              {/* 유형 선택 */}
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { id: "savings", label: "저축/예적금" },
                    { id: "real_estate", label: "부동산" },
                    { id: "insurance", label: "보험" },
                    { id: "loan", label: "대출/부채" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFormType(t.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      formType === t.id
                        ? "bg-primary text-on-primary border-primary shadow-xs"
                        : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* 자산명 */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  자산 / 대출명 *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="예: 청년도약계좌, 전세자금대출, 아파트 매매"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>

              {/* 금융기관 / 회사 */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  금융기관 / 기관명
                </label>
                <input
                  type="text"
                  value={formInstitution}
                  onChange={(e) => setFormInstitution(e.target.value)}
                  placeholder="예: 카카오뱅크, 국민은행, 삼성생명"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>

              {/* 현재 잔액 / 평가액 / 대출잔액 */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  현재 평가액 / 잔액 (원) *
                </label>
                <input
                  type="number"
                  required
                  value={formCurrentBalance}
                  onChange={(e) => setFormCurrentBalance(e.target.value)}
                  placeholder="예: 15000000"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-mono text-base font-bold text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>

              {/* 금리 및 월납입액 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    금리 (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formInterestRate}
                    onChange={(e) => setFormInterestRate(e.target.value)}
                    placeholder="예: 4.5"
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-mono text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    월 상환/납입액 (원)
                  </label>
                  <input
                    type="number"
                    value={formMonthlyPayment}
                    onChange={(e) => setFormMonthlyPayment(e.target.value)}
                    placeholder="예: 300000"
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-mono text-on-surface focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              {/* 만기일 */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  만기일 (선택)
                </label>
                <input
                  type="date"
                  value={formMaturityDate}
                  onChange={(e) => setFormMaturityDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-mono text-on-surface focus:outline-hidden focus:border-primary cursor-pointer"
                />
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  메모 (보장범위 등)
                </label>
                <textarea
                  value={formMemo}
                  onChange={(e) => setFormMemo(e.target.value)}
                  rows={2}
                  placeholder="실손 의료비 1억원 보장, 암진단금 3천만원 등"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary text-xs"
                />
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold hover:opacity-95 shadow-xs transition-opacity cursor-pointer active:scale-[0.98]"
                >
                  {editingAsset ? "변경사항 저장" : "등록하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
