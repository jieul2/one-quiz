"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  FinanceTransaction,
  FinanceCategory,
  TransactionType,
} from "./types";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "./defaultCategories";
import {
  Search,
  Filter,
  Plus,
  Receipt,
  Tag,
  Calendar as CalendarIcon,
  Trash2,
  Edit2,
  Sparkles,
  Camera,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Eye,
  Check,
} from "lucide-react";

interface Props {
  transactions: FinanceTransaction[];
  monthKey: string;
  scope: "personal" | "group";
  onAddTransaction: (data: Partial<FinanceTransaction>) => Promise<void>;
  onUpdateTransaction: (id: string, data: Partial<FinanceTransaction>) => Promise<void>;
  onDeleteTransaction: (id: string) => Promise<void>;
}

export function FinanceTransactionsTab({
  transactions,
  monthKey,
  scope,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
}: Props) {
  // 필터 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [recurringFilter, setRecurringFilter] = useState<"all" | "fixed" | "variable">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [zoomReceiptUrl, setZoomReceiptUrl] = useState<string | null>(null);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // 폼 입력 상태
  const [formType, setFormType] = useState<TransactionType>("expense");
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formCategory, setFormCategory] = useState("식비");
  const [formDate, setFormDate] = useState(`${monthKey}-15`);
  const [formIsFixed, setFormIsFixed] = useState(false);
  const [formPaymentMethod, setFormPaymentMethod] = useState("신용카드");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [formReceiptUrl, setFormReceiptUrl] = useState("");

  // 전체 태그 집합 추출
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    transactions.forEach((tx) => {
      if (Array.isArray(tx.tags)) {
        tx.tags.forEach((t: string) => tagSet.add(t));
      }
    });
    return Array.from(tagSet);
  }, [transactions]);

  // 카테고리 목록
  const currentCategories: FinanceCategory[] =
    formType === "income" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;

  // 필터링된 트랜잭션 목록
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (recurringFilter === "fixed" && !tx.isFixed) return false;
      if (recurringFilter === "variable" && tx.isFixed) return false;
      if (selectedCategory !== "all" && tx.category !== selectedCategory) return false;
      if (selectedTag && (!Array.isArray(tx.tags) || !tx.tags.includes(selectedTag))) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = tx.title.toLowerCase().includes(q);
        const matchCat = tx.category.toLowerCase().includes(q);
        const matchMemo = tx.memo?.toLowerCase().includes(q);
        const matchTag = tx.tags?.some((t: string) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchCat && !matchMemo && !matchTag) return false;
      }
      return true;
    });
  }, [transactions, typeFilter, recurringFilter, selectedCategory, selectedTag, searchQuery]);

  // 모달 열기 핸들러
  const handleOpenAdd = () => {
    setEditingTx(null);
    setFormType("expense");
    setFormTitle("");
    setFormAmount("");
    setFormCategory("식비");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormIsFixed(false);
    setFormPaymentMethod("신용카드");
    setFormTags(["식비"]);
    setFormMemo("");
    setFormReceiptUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setFormTitle(tx.title);
    setFormAmount(String(tx.amount));
    setFormCategory(tx.category);
    setFormDate(tx.date.slice(0, 10));
    setFormIsFixed(Boolean(tx.isFixed));
    setFormPaymentMethod(tx.paymentMethod || "신용카드");
    setFormTags(Array.isArray(tx.tags) ? tx.tags : []);
    setFormMemo(tx.memo || "");
    setFormReceiptUrl(tx.receiptImage || "");
    setIsModalOpen(true);
  };

  // 태그 추가
  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (trimmed && !formTags.includes(trimmed)) {
      setFormTags([...formTags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormTags(formTags.filter((t) => t !== tag));
  };

  // 저장 제출
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(formAmount);
    if (!formTitle.trim() || isNaN(amountNum) || amountNum <= 0) {
      alert("올바른 내용과 금액을 입력해주세요.");
      return;
    }

    const payload: Partial<FinanceTransaction> = {
      type: formType,
      title: formTitle.trim(),
      amount: amountNum,
      category: formCategory,
      date: formDate,
      isFixed: formIsFixed,
      paymentMethod: formPaymentMethod,
      tags: formTags,
      memo: formMemo.trim(),
      receiptImage: formReceiptUrl,
      scope,
    };

    if (editingTx?._id) {
      await onUpdateTransaction(editingTx._id, payload);
    } else {
      await onAddTransaction(payload);
    }
    setIsModalOpen(false);
  };

  // 영수증 OCR 시뮬레이션 추출 트리거
  const handleRunOcr = async (receiptType: "cafe" | "mart" | "fuel" | "restaurant") => {
    setIsOcrProcessing(true);
    try {
      const res = await fetch("/api/finance/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptType }),
      });
      if (res.ok) {
        const result = await res.json();
        const ocr = result.ocrResult;
        setFormTitle(ocr.merchant || "영수증 지출");
        setFormAmount(String(ocr.totalAmount || 0));
        setFormDate(ocr.date || new Date().toISOString().slice(0, 10));
        setFormCategory(ocr.category || "식비");
        setFormTags(ocr.tags || ["영수증인식"]);
        setFormType("expense");
        setFormPaymentMethod("카드");
        setFormMemo(`[AI OCR 자동분석] 품목: ${ocr.items?.map((it: { name: string }) => it.name).join(", ")}`);
        setFormReceiptUrl(
          receiptType === "cafe"
            ? "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=500&auto=format&fit=crop&q=80"
            : "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&auto=format&fit=crop&q=80"
        );
        setIsOcrModalOpen(false);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error(err);
      alert("OCR 영수증 분석 중 오류가 발생했습니다.");
    } finally {
      setIsOcrProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. 상단 컨트롤 바 (검색 + 구분 필터 + 영수증 OCR + 새 내역 등록) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* 검색창 */}
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="내역, 카테고리, 메모, #태그 검색..."
              className="w-full pl-9 pr-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-hidden focus:border-primary font-medium"
            />
          </div>

          {/* 액션 버튼 그룹 */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsOcrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all font-bold text-xs cursor-pointer shadow-2xs"
              title="영수증 사진을 분석하여 자동 입력합니다"
            >
              <Camera size={14} />
              <span>영수증 AI OCR 인식</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm hover:opacity-95 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Plus size={15} />
              <span>내역 추가</span>
            </button>
          </div>
        </div>

        {/* 2차 필터 바 (유형 + 고정비 여부 + #태그 칩) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/50 text-xs">
          {/* 유형 탭 버튼 */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/60">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                typeFilter === "all"
                  ? "bg-surface-container-lowest text-on-surface shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              전체
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("expense")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                typeFilter === "expense"
                  ? "bg-rose-500 text-white shadow-xs"
                  : "text-rose-500 hover:bg-rose-500/10"
              }`}
            >
              지출만
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("income")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                typeFilter === "income"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-emerald-500 hover:bg-emerald-500/10"
              }`}
            >
              수입만
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("transfer")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                typeFilter === "transfer"
                  ? "bg-sky-500 text-white shadow-xs"
                  : "text-sky-500 hover:bg-sky-500/10"
              }`}
            >
              이체
            </button>
          </div>

          {/* 고정비 vs 변동비 필터 */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/60">
            <button
              type="button"
              onClick={() => setRecurringFilter("all")}
              className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                recurringFilter === "all"
                  ? "bg-surface-container-lowest text-on-surface shadow-xs"
                  : "text-on-surface-variant"
              }`}
            >
              모든 지출
            </button>
            <button
              type="button"
              onClick={() => setRecurringFilter("fixed")}
              className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                recurringFilter === "fixed"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant"
              }`}
            >
              정기 고정비
            </button>
            <button
              type="button"
              onClick={() => setRecurringFilter("variable")}
              className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                recurringFilter === "variable"
                  ? "bg-primary text-on-primary shadow-xs"
                  : "text-on-surface-variant"
              }`}
            >
              변동 지출
            </button>
          </div>

          {/* 태그 필터 칩 */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
              <span className="text-[11px] text-on-surface-variant flex items-center gap-1 shrink-0">
                <Tag size={11} /> 태그:
              </span>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-bold hover:bg-rose-500/20 text-[11px] shrink-0 cursor-pointer"
                >
                  초기화 ✕
                </button>
              )}
              {allTags.slice(0, 8).map((tg) => (
                <button
                  key={tg}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tg ? null : tg)}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono shrink-0 cursor-pointer transition-colors ${
                    selectedTag === tg
                      ? "bg-primary text-on-primary font-bold shadow-2xs"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  #{tg}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. 트랜잭션 목록 리스트 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
          <div className="flex items-center gap-2">
            <h3 className="ui-card-title text-base font-bold text-on-surface">
              {monthKey}월 가계 내역
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
              총 {filteredTransactions.length}건
            </span>
          </div>
          <span className="text-xs text-on-surface-variant font-mono">
            최신 등록순 정렬
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Receipt className="w-10 h-10 text-on-surface-variant/40 mx-auto" />
            <p className="ui-card-title text-sm text-on-surface-variant">
              등록된 가계 내역이 없습니다.
            </p>
            <p className="ui-caption text-xs text-on-surface-variant/70">
              상단의 [내역 추가] 또는 [영수증 AI OCR 인식] 버튼을 눌러 첫 지출을 기록해보세요!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/30 space-y-0.5">
            {filteredTransactions.map((tx) => {
              const isExpense = tx.type === "expense";
              const isIncome = tx.type === "income";
              const isTransfer = tx.type === "transfer";

              return (
                <div
                  key={tx._id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl hover:bg-surface-container-low transition-colors group"
                >
                  {/* 좌측: 아이콘 + 제목 + 카테고리 + 태그 + 날짜 */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    {/* 유형 뱃지 아이콘 */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isExpense
                          ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          : isIncome
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : "bg-sky-500/10 text-sky-500 border border-sky-500/20"
                      }`}
                    >
                      {isExpense ? (
                        <ArrowUpRight size={17} />
                      ) : isIncome ? (
                        <ArrowDownLeft size={17} />
                      ) : (
                        <RefreshCw size={15} />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-on-surface truncate">
                          {tx.title}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-container font-medium text-on-surface-variant">
                          {tx.category}
                        </span>
                        {tx.isFixed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                            고정비
                          </span>
                        )}
                        {tx.receiptImage && (
                          <button
                            type="button"
                            onClick={() => setZoomReceiptUrl(tx.receiptImage || null)}
                            className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold hover:bg-amber-500/20 cursor-pointer"
                            title="영수증 사진 확대 보기"
                          >
                            <Receipt size={11} /> 영수증
                          </button>
                        )}
                      </div>

                      {/* 날짜, 결제수단, #태그 칩 */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                        <span className="font-mono text-[11px]">
                          {tx.date.slice(0, 10)}
                        </span>
                        <span>·</span>
                        <span>{tx.paymentMethod || "카드"}</span>
                        {Array.isArray(tx.tags) && tx.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {tx.tags.map((t: string) => (
                              <span
                                key={t}
                                className="text-[10px] font-mono text-primary bg-primary/5 px-1.5 py-0.2 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                        {tx.memo && (
                          <span className="text-[11px] text-on-surface-variant/70 italic truncate max-w-xs">
                            ({tx.memo})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 우측: 금액 (+/-) 및 수정/삭제 액션 */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0">
                    <div className="text-right">
                      <div
                        className={`text-base font-extrabold font-mono ${
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

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(tx)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                        title="수정"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`"${tx.title}" 내역을 삭제하시겠습니까?`)) {
                            onDeleteTransaction(tx._id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= 3. 영수증 사진 확대 줌 모달 ================= */}
      {zoomReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomReceiptUrl(null)}
        >
          <div
            className="relative max-w-lg w-full bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <span className="ui-card-title text-sm font-bold flex items-center gap-1.5 text-on-surface">
                <Receipt size={16} className="text-primary" /> 첨부된 영수증 원본 사진
              </span>
              <button
                type="button"
                onClick={() => setZoomReceiptUrl(null)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center">
              <Image
                src={zoomReceiptUrl}
                alt="영수증"
                fill
                sizes="(max-width: 640px) 100vw, 500px"
                className="object-contain"
              />
            </div>
            <div className="text-center text-xs text-on-surface-variant">
              ※ 클릭하여 닫을 수 있습니다.
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. 영수증 AI OCR 스캔 선택 모달 ================= */}
      {isOcrModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsOcrModalOpen(false)}
        >
          <div
            className="max-w-md w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="ui-card-title text-sm font-bold text-on-surface">
                    영수증 사진 자동 OCR 분석
                  </h3>
                  <p className="ui-caption text-xs text-on-surface-variant">
                    영수증 이미지에서 일시, 가맹점, 품목, 금액을 즉시 추출합니다
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOcrModalOpen(false)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-on-surface">
                스마트 영수증 샘플 시나리오를 선택하세요:
              </p>

              <button
                type="button"
                disabled={isOcrProcessing}
                onClick={() => handleRunOcr("cafe")}
                className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant hover:border-primary/50 text-left flex items-center justify-between group transition-all cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                    ☕ 스타벅스 강남점 (커피 & 디저트)
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    아이스 아메리카노 + 케이크 (₩12,300)
                  </div>
                </div>
                <span className="text-xs font-bold text-primary">스캔하기 →</span>
              </button>

              <button
                type="button"
                disabled={isOcrProcessing}
                onClick={() => handleRunOcr("mart")}
                className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant hover:border-primary/50 text-left flex items-center justify-between group transition-all cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                    🛒 이마트 역삼점 (장보기 생필품)
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    우유, 시리얼, 야채, 세제 (₩45,800)
                  </div>
                </div>
                <span className="text-xs font-bold text-primary">스캔하기 →</span>
              </button>

              <button
                type="button"
                disabled={isOcrProcessing}
                onClick={() => handleRunOcr("restaurant")}
                className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant hover:border-primary/50 text-left flex items-center justify-between group transition-all cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                    🍽️ 맛있는 삼겹살 (저녁 외식)
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    삼겹살 2인분 + 된장찌개 (₩38,000)
                  </div>
                </div>
                <span className="text-xs font-bold text-primary">스캔하기 →</span>
              </button>

              <button
                type="button"
                disabled={isOcrProcessing}
                onClick={() => handleRunOcr("fuel")}
                className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant hover:border-primary/50 text-left flex items-center justify-between group transition-all cursor-pointer"
              >
                <div>
                  <div className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                    ⛽ GS칼텍스 셀프주유소 (교통비)
                  </div>
                  <div className="text-[11px] text-on-surface-variant">
                    휘발유 42L (₩70,000)
                  </div>
                </div>
                <span className="text-xs font-bold text-primary">스캔하기 →</span>
              </button>
            </div>

            {isOcrProcessing && (
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center text-xs font-bold text-primary animate-pulse">
                🔍 영수증 이미지 분석 및 항목 파싱 중...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= 5. 트랜잭션 추가 / 수정 모달 ================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="max-w-lg w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h3 className="ui-card-title text-base font-bold text-on-surface">
                {editingTx ? "가계 내역 수정" : "새 가계 내역 등록"}
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
              {/* 구분 선택 (지출 / 수입 / 이체) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormType("expense")}
                  className={`py-2 rounded-xl font-bold transition-all cursor-pointer border ${
                    formType === "expense"
                      ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                      : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  지출
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("income")}
                  className={`py-2 rounded-xl font-bold transition-all cursor-pointer border ${
                    formType === "income"
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                      : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  수입
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("transfer")}
                  className={`py-2 rounded-xl font-bold transition-all cursor-pointer border ${
                    formType === "transfer"
                      ? "bg-sky-500 text-white border-sky-500 shadow-xs"
                      : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  이체
                </button>
              </div>

              {/* 금액 입력 */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  금액 (원) *
                </label>
                <input
                  type="number"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="예: 25000"
                  className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-base font-extrabold font-mono text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>

              {/* 제목 (사용처) */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  내용 (사용처/상호명) *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="예: 점심 돈까스, 넷플릭스 구독료"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary"
                />
              </div>

              {/* 카테고리 & 날짜 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    카테고리 *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary cursor-pointer"
                  >
                    {currentCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    날짜 *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary font-mono cursor-pointer"
                  />
                </div>
              </div>

              {/* 정기결제(고정비) 여부 & 결제수단 */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                    결제 수단
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary cursor-pointer"
                  >
                    <option value="신용카드">신용카드</option>
                    <option value="체크카드">체크카드</option>
                    <option value="계좌이체">계좌이체</option>
                    <option value="현금">현금</option>
                    <option value="간편결제">간편결제 (페이)</option>
                  </select>
                </div>

                <div className="pt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="fixed_check"
                    checked={formIsFixed}
                    onChange={(e) => setFormIsFixed(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label
                    htmlFor="fixed_check"
                    className="text-xs font-semibold text-on-surface select-none cursor-pointer"
                  >
                    정기결제(고정비)로 등록
                  </label>
                </div>
              </div>

              {/* #태그 시스템 */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  #태그 (엔터로 추가)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="예: 식비, 데이트, 내돈내산"
                    className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-surface-container-high text-on-surface rounded-xl hover:bg-surface-container font-semibold cursor-pointer"
                  >
                    추가
                  </button>
                </div>

                {formTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formTags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-mono text-xs font-semibold"
                      >
                        #{t}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-rose-500 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 영수증 이미지 URL */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  영수증 사진 URL (선택)
                </label>
                <input
                  type="url"
                  value={formReceiptUrl}
                  onChange={(e) => setFormReceiptUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary font-mono text-xs"
                />
              </div>

              {/* 메모 */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                  상세 메모
                </label>
                <textarea
                  value={formMemo}
                  onChange={(e) => setFormMemo(e.target.value)}
                  rows={2}
                  placeholder="추가 지출 관련 메모나 품목 기록"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary text-xs"
                />
              </div>

              {/* 제출 버튼 */}
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
                  {editingTx ? "변경사항 저장" : "등록하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
