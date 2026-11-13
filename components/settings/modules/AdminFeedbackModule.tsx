"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquareText,
  RefreshCw,
  Star,
  Loader2,
  Inbox,
  Archive,
  CheckCircle2,
  Undo2,
  Search,
  Filter,
  Check,
  Send,
  AlertCircle,
  Clock,
} from "lucide-react";
import { toast } from "@/lib/toast";

export interface FeedbackItem {
  _id: string;
  userEmail: string;
  userName: string;
  type: "bug" | "feature" | "inquiry" | "feedback";
  title: string;
  content: string;
  rating?: number;
  status: "pending" | "in_progress" | "resolved" | "dismissed";
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export function AdminFeedbackModule() {
  // 1. 탭 상태: "active" (접수·진행함) | "completed" (완료 보관함) | "all" (전체)
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "all">("active");

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>("ALL");
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [feedbackReplies, setFeedbackReplies] = useState<Record<string, string>>({});
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState<Record<string, boolean>>({});
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(true);

  // 카운트 요약 상태
  const [counts, setCounts] = useState({
    activeCount: 0,
    completedCount: 0,
    allCount: 0,
    pendingCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
  });

  const fetchFeedbacks = useCallback(async () => {
    setIsLoadingFeedbacks(true);
    try {
      const params = new URLSearchParams();
      params.set("tab", activeTab);
      if (feedbackStatusFilter !== "ALL") params.set("status", feedbackStatusFilter);
      if (feedbackTypeFilter !== "ALL") params.set("type", feedbackTypeFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
        setCounts({
          activeCount: data.activeCount || 0,
          completedCount: data.completedCount || 0,
          allCount: data.allCount || 0,
          pendingCount: data.pendingCount || 0,
          inProgressCount: data.inProgressCount || 0,
          resolvedCount: data.resolvedCount || 0,
        });
      }
    } catch {
      toast.error("피드백 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingFeedbacks(false);
    }
  }, [activeTab, feedbackStatusFilter, feedbackTypeFilter, searchQuery]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        params.set("tab", activeTab);
        if (feedbackStatusFilter !== "ALL") params.set("status", feedbackStatusFilter);
        if (feedbackTypeFilter !== "ALL") params.set("type", feedbackTypeFilter);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const res = await fetch(`/api/feedback?${params.toString()}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setFeedbacks(data.feedbacks || []);
          setCounts({
            activeCount: data.activeCount || 0,
            completedCount: data.completedCount || 0,
            allCount: data.allCount || 0,
            pendingCount: data.pendingCount || 0,
            inProgressCount: data.inProgressCount || 0,
            resolvedCount: data.resolvedCount || 0,
          });
        }
      } catch {
        if (!ignore) toast.error("피드백 목록을 불러오지 못했습니다.");
      } finally {
        if (!ignore) setIsLoadingFeedbacks(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [activeTab, feedbackStatusFilter, feedbackTypeFilter, searchQuery]);

  // 피드백 상태 및 답변 업데이트 (접수함 ↔ 완료 보관함 이동)
  const handleUpdateFeedbackStatus = async (
    id: string,
    newStatus: "pending" | "in_progress" | "resolved" | "dismissed",
    replyText?: string
  ) => {
    setIsUpdatingFeedback((prev) => ({ ...prev, [id]: true }));
    try {
      const targetFb = feedbacks.find((f) => f._id === id);
      const res = await fetch("/api/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: id,
          status: newStatus,
          adminReply: replyText !== undefined ? replyText : feedbackReplies[id],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedItem: FeedbackItem = data.feedback;

        // 접수함에서 완료 처리한 경우: 접수함에서 즉시 제외하여 완료 보관함으로 이동
        if (activeTab === "active" && (newStatus === "resolved" || newStatus === "dismissed")) {
          setFeedbacks((prev) => prev.filter((fb) => fb._id !== id));
          setCounts((prev) => ({
            ...prev,
            activeCount: Math.max(0, prev.activeCount - 1),
            completedCount: prev.completedCount + 1,
            pendingCount: targetFb?.status === "pending" ? Math.max(0, prev.pendingCount - 1) : prev.pendingCount,
            inProgressCount: targetFb?.status === "in_progress" ? Math.max(0, prev.inProgressCount - 1) : prev.inProgressCount,
            resolvedCount: newStatus === "resolved" ? prev.resolvedCount + 1 : prev.resolvedCount,
          }));
          toast.success("해결 완료되어 '완료 보관함'으로 이동되었습니다.");
        }
        // 완료 보관함에서 다시 접수함으로 복원한 경우: 보관함에서 즉시 제외하여 접수함으로 이동
        else if (activeTab === "completed" && (newStatus === "pending" || newStatus === "in_progress")) {
          setFeedbacks((prev) => prev.filter((fb) => fb._id !== id));
          setCounts((prev) => ({
            ...prev,
            completedCount: Math.max(0, prev.completedCount - 1),
            activeCount: prev.activeCount + 1,
            pendingCount: newStatus === "pending" ? prev.pendingCount + 1 : prev.pendingCount,
            inProgressCount: newStatus === "in_progress" ? prev.inProgressCount + 1 : prev.inProgressCount,
            resolvedCount: targetFb?.status === "resolved" ? Math.max(0, prev.resolvedCount - 1) : prev.resolvedCount,
          }));
          toast.info("피드백이 접수함으로 다시 이동되었습니다.");
        } else {
          setFeedbacks((prev) =>
            prev.map((fb) => (fb._id === id ? { ...fb, ...updatedItem } : fb))
          );
          toast.success("피드백 상태 및 답변이 저장되었습니다.");
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "피드백 처리 실패");
      }
    } catch {
      toast.error("서버 통신 실패");
    } finally {
      setIsUpdatingFeedback((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* ================= 1. 상단 통계 헤더 ================= */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-xs">
            <MessageSquareText size={20} />
          </div>
          <div>
            <h2 className="ui-section-title text-on-surface">피드백 관리 센터</h2>
            <p className="ui-caption text-on-surface-variant font-light">
              미해결 피드백은 접수함에서 빠르게 처리하고, 해결 완료된 항목은 완료 보관함으로 분리 보관합니다.
            </p>
          </div>
        </div>

        <button
          onClick={fetchFeedbacks}
          disabled={isLoadingFeedbacks}
          className="px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface ui-caption font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <RefreshCw size={13} className={isLoadingFeedbacks ? "animate-spin text-primary" : ""} />
          <span>새로고침</span>
        </button>
      </div>

      {/* ================= 2. 🌟 메인 접수함 / 완료 보관함 탭 전환 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl p-2 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* 접수함 탭 (미해결 & 처리중) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("active");
              setFeedbackStatusFilter("ALL");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "active"
                ? "bg-primary text-on-primary shadow-xs"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <Inbox size={15} />
            <span>피드백 접수함</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${
                activeTab === "active"
                  ? "bg-white/20 text-white"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25"
              }`}
            >
              {counts.activeCount}
            </span>
          </button>

          {/* 완료 보관함 탭 (해결됨 & 제외됨) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("completed");
              setFeedbackStatusFilter("ALL");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === "completed"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            <Archive size={15} />
            <span>완료 보관함</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${
                activeTab === "completed"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
              }`}
            >
              {counts.completedCount}
            </span>
          </button>

          {/* 전체 내역 탭 */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("all");
              setFeedbackStatusFilter("ALL");
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === "all"
                ? "bg-surface-container-highest text-on-surface font-bold border border-outline-variant shadow-xs"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <span>전체 내역</span>
            <span className="text-[11px] font-mono opacity-70">({counts.allCount})</span>
          </button>
        </div>

        {/* 검색창 */}
        <div className="relative min-w-[200px] sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            placeholder="제목, 내용, 작성자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-8 pr-3 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-hidden focus:border-primary font-medium"
          />
        </div>
      </div>

      {/* ================= 3. 세부 필터 (상태 & 유형) ================= */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* 상태 세부 필터 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="ui-caption text-on-surface-variant font-semibold mr-1 flex items-center gap-1">
            <Filter size={12} />
            상태:
          </span>

          {activeTab === "active" && (
            <>
              {[
                { id: "ALL", label: `전체 (${counts.activeCount})` },
                { id: "pending", label: `대기중 (${counts.pendingCount})` },
                { id: "in_progress", label: `처리중 (${counts.inProgressCount})` },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFeedbackStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    feedbackStatusFilter === s.id
                      ? "bg-primary text-on-primary font-bold shadow-xs"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </>
          )}

          {activeTab === "completed" && (
            <>
              {[
                { id: "ALL", label: `전체 보관 (${counts.completedCount})` },
                { id: "resolved", label: `해결 완료 (${counts.resolvedCount})` },
                { id: "dismissed", label: `제외됨` },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFeedbackStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    feedbackStatusFilter === s.id
                      ? "bg-emerald-600 text-white font-bold shadow-xs"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </>
          )}

          {activeTab === "all" && (
            <>
              {[
                { id: "ALL", label: "전체" },
                { id: "pending", label: "대기중" },
                { id: "in_progress", label: "처리중" },
                { id: "resolved", label: "해결됨" },
                { id: "dismissed", label: "제외됨" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFeedbackStatusFilter(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                    feedbackStatusFilter === s.id
                      ? "bg-primary text-on-primary font-bold shadow-xs"
                      : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </>
          )}
        </div>

        {/* 유형 필터 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="ui-caption text-on-surface-variant font-semibold mr-1">유형:</span>
          {[
            { id: "ALL", label: "전체" },
            { id: "bug", label: "버그" },
            { id: "feature", label: "기능제안" },
            { id: "inquiry", label: "문의" },
            { id: "feedback", label: "피드백" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFeedbackTypeFilter(t.id)}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                feedbackTypeFilter === t.id
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= 4. 피드백 카드 목록 ================= */}
      {isLoadingFeedbacks ? (
        <div className="p-14 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <Loader2 size={26} className="animate-spin text-primary mx-auto mb-2.5" />
          <p className="ui-caption text-on-surface-variant">피드백 데이터를 동기화하는 중입니다...</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="p-14 text-center bg-surface-container-lowest border border-outline-variant rounded-xl space-y-2">
          {activeTab === "active" ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-1">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="ui-section-title text-on-surface">모든 피드백이 처리 완료되었습니다</h3>
              <p className="ui-caption text-on-surface-variant max-w-sm mx-auto">
                현재 접수 대기 또는 처리 중인 피드백이 없습니다. 해결된 피드백은 [완료 보관함]에서 확인하실 수 있습니다.
              </p>
            </>
          ) : activeTab === "completed" ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center mx-auto mb-1">
                <Archive size={28} />
              </div>
              <h3 className="ui-section-title text-on-surface">보관된 완료 피드백이 없습니다</h3>
              <p className="ui-caption text-on-surface-variant max-w-sm mx-auto">
                피드백 접수함에서 처리가 완료된 건들이 이곳에 안전하게 보관됩니다.
              </p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center mx-auto mb-1">
                <MessageSquareText size={28} />
              </div>
              <h3 className="ui-section-title text-on-surface">검색 조건에 맞는 피드백이 없습니다</h3>
              <p className="ui-caption text-on-surface-variant">필터나 검색어를 변경해 보세요.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {feedbacks.map((fb) => {
            const typeBadgeMap = {
              bug: { label: "버그 제보", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25" },
              feature: { label: "기능 제안", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25" },
              inquiry: { label: "문의 사항", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25" },
              feedback: { label: "일반 피드백", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" },
            }[fb.type] || { label: "피드백", color: "bg-primary/10 text-primary border-primary/25" };

            const isResolved = fb.status === "resolved";
            const isDismissed = fb.status === "dismissed";
            const isCompleted = isResolved || isDismissed;

            const statusBadgeMap = {
              pending: { label: "접수 대기", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25" },
              in_progress: { label: "처리 중", color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/25" },
              resolved: { label: "해결 완료", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
              dismissed: { label: "제외됨", color: "text-neutral-500 bg-neutral-400/10 border-neutral-400/25" },
            }[fb.status];

            const replyInput =
              feedbackReplies[fb._id] !== undefined ? feedbackReplies[fb._id] : fb.adminReply || "";
            const isUpdating = isUpdatingFeedback[fb._id];

            return (
              <div
                key={fb._id}
                className={`bg-surface-container-lowest border rounded-xl p-4.5 space-y-3.5 transition-all shadow-xs ${
                  isCompleted
                    ? "border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/[0.02]"
                    : "border-outline-variant hover:border-primary/40"
                }`}
              >
                {/* 상단 메타 바: 뱃지, 별점, 작성자, 액션 버튼 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-outline-variant pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`ui-badge px-2.5 py-0.5 rounded-md font-semibold border ${typeBadgeMap.color}`}>
                      {typeBadgeMap.label}
                    </span>
                    <span className={`ui-badge px-2.5 py-0.5 rounded-md font-bold border ${statusBadgeMap.color}`}>
                      {statusBadgeMap.label}
                    </span>
                    {typeof fb.rating === "number" && fb.rating > 0 && (
                      <div className="flex items-center gap-0.5 text-amber-400 ml-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={
                              i < (fb.rating || 0)
                                ? "fill-amber-400"
                                : "text-neutral-300 dark:text-neutral-700"
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 text-on-surface-variant ui-caption">
                    <span className="font-semibold text-on-surface">{fb.userName || "익명"}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px]">{fb.userEmail}</span>
                    <span>•</span>
                    <span>
                      {new Date(fb.createdAt).toLocaleString("ko-KR", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {/* 🌟 원터치 해결 보관 / 복원 버튼 */}
                    {!isCompleted ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateFeedbackStatus(fb._id, "resolved", replyInput)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 ml-2 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                        title="해결 완료로 처리하고 완료 보관함으로 이동"
                      >
                        <Check size={12} />
                        <span>해결 완료로 보관</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateFeedbackStatus(fb._id, "in_progress", replyInput)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 ml-2 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary border border-outline-variant text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                        title="다시 접수함으로 이동"
                      >
                        <Undo2 size={12} />
                        <span>접수함으로 복원</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 피드백 제목 및 본문 */}
                <div>
                  <h3 className="ui-card-title text-on-surface font-bold text-sm sm:text-base mb-1.5">
                    {fb.title}
                  </h3>
                  <p className="ui-body text-on-surface whitespace-pre-wrap bg-surface-container-low/70 p-3.5 rounded-xl border border-outline-variant/60 font-light leading-relaxed">
                    {fb.content}
                  </p>
                </div>

                {/* 관리자 답변 및 상태 업데이트 영역 */}
                <div className="pt-2 border-t border-outline-variant/60 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="ui-caption font-semibold text-on-surface flex items-center gap-1.5">
                      <MessageSquareText size={13} className="text-primary" />
                      <span>관리자 답변 및 상태 업데이트</span>
                      {fb.repliedAt && (
                        <span className="ui-caption font-normal text-on-surface-variant text-[11px]">
                          (답변일: {new Date(fb.repliedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })})
                        </span>
                      )}
                    </label>

                    {/* 빠른 상태 전환 토글 */}
                    <div className="flex items-center gap-1">
                      {(["pending", "in_progress", "resolved", "dismissed"] as const).map((st) => {
                        const labels = {
                          pending: "대기",
                          in_progress: "처리중",
                          resolved: "해결완료",
                          dismissed: "제외",
                        };
                        const isActive = fb.status === st;
                        return (
                          <button
                            key={st}
                            onClick={() => handleUpdateFeedbackStatus(fb._id, st, replyInput)}
                            disabled={isUpdating}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                              isActive
                                ? st === "resolved"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-primary text-on-primary shadow-xs"
                                : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant/60"
                            }`}
                          >
                            {labels[st]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 답변 입력 폼 */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={replyInput}
                      onChange={(e) =>
                        setFeedbackReplies((prev) => ({ ...prev, [fb._id]: e.target.value }))
                      }
                      placeholder="사용자에게 남길 답변 또는 내부 조치 메모를 입력하세요..."
                      className="flex-1 bg-surface-container-low px-3.5 py-2 rounded-xl border border-outline-variant ui-caption text-on-surface focus:outline-hidden focus:border-primary transition-all font-medium"
                    />

                    {/* 접수함(미해결)인 경우: [답변 저장 & 해결 보관] vs [답변만 저장] */}
                    {!isCompleted ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateFeedbackStatus(fb._id, "resolved", replyInput)}
                          disabled={isUpdating}
                          className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                          title="답변을 저장하고 완료 보관함으로 이동"
                        >
                          <Check size={13} />
                          <span>답변 & 완료 보관</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateFeedbackStatus(fb._id, fb.status === "pending" ? "in_progress" : fb.status, replyInput)}
                          disabled={isUpdating}
                          className="px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold rounded-xl border border-outline-variant transition-colors cursor-pointer"
                          title="접수함에 유지하며 답변만 저장"
                        >
                          임시 저장
                        </button>
                      </div>
                    ) : (
                      /* 완료 보관함인 경우: [답변 수정 저장] */
                      <button
                        type="button"
                        onClick={() => handleUpdateFeedbackStatus(fb._id, fb.status, replyInput)}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-primary hover:opacity-90 text-on-primary text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
                      >
                        답변 수정 저장
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
