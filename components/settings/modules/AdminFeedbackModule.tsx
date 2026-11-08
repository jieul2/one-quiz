"use client";

import React, { useState, useEffect, useCallback } from "react";
import { MessageSquareText, RefreshCw, Star, Loader2 } from "lucide-react";
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
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>("ALL");
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>("ALL");
  const [feedbackReplies, setFeedbackReplies] = useState<Record<string, string>>({});
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState<Record<string, boolean>>({});
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(true);

  const fetchFeedbacks = useCallback(async () => {
    setIsLoadingFeedbacks(true);
    try {
      const params = new URLSearchParams();
      if (feedbackStatusFilter !== "ALL") params.set("status", feedbackStatusFilter);
      if (feedbackTypeFilter !== "ALL") params.set("type", feedbackTypeFilter);

      const res = await fetch(`/api/feedback?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
      }
    } catch {
      toast.error("피드백 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingFeedbacks(false);
    }
  }, [feedbackStatusFilter, feedbackTypeFilter]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        if (feedbackStatusFilter !== "ALL") params.set("status", feedbackStatusFilter);
        if (feedbackTypeFilter !== "ALL") params.set("type", feedbackTypeFilter);

        const res = await fetch(`/api/feedback?${params.toString()}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setFeedbacks(data.feedbacks || []);
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
  }, [feedbackStatusFilter, feedbackTypeFilter]);

  // 피드백 상태 및 답변 업데이트
  const handleUpdateFeedbackStatus = async (
    id: string,
    newStatus: "pending" | "in_progress" | "resolved" | "dismissed",
    replyText?: string
  ) => {
    setIsUpdatingFeedback((prev) => ({ ...prev, [id]: true }));
    try {
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
        setFeedbacks((prev) =>
          prev.map((fb) => (fb._id === id ? { ...fb, ...data.feedback } : fb))
        );
        toast.success("피드백 상태 및 답변이 저장되었습니다.");
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
      {/* 상단 통계 및 새로고침 헤더 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MessageSquareText size={18} />
          </div>
          <div>
            <h2 className="ui-section-title text-on-surface">피드백 접수함</h2>
            <p className="ui-caption text-on-surface-variant font-light">
              사용자가 앱 내에서 접수한 버그 제보, 기능 제안 및 문의 내역을 관리하고 답변합니다.
            </p>
          </div>
        </div>

        <button
          onClick={fetchFeedbacks}
          disabled={isLoadingFeedbacks}
          className="px-3 py-1.5 rounded-md border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface ui-caption font-medium flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={13} className={isLoadingFeedbacks ? "animate-spin text-primary" : ""} />
          <span>새로고침</span>
        </button>
      </div>

      {/* 통계 요약 카드 4개 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <span className="ui-caption text-on-surface-variant font-light block">전체 접수</span>
          <span className="text-xl font-bold text-on-surface">{feedbacks.length}</span>
        </div>
        <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <span className="ui-caption text-amber-500 font-medium block">접수 대기</span>
          <span className="text-xl font-bold text-amber-500">
            {feedbacks.filter((f) => f.status === "pending").length}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <span className="ui-caption text-blue-500 font-medium block">처리 중</span>
          <span className="text-xl font-bold text-blue-500">
            {feedbacks.filter((f) => f.status === "in_progress").length}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant">
          <span className="ui-caption text-emerald-500 font-medium block">해결/완료</span>
          <span className="text-xl font-bold text-emerald-500">
            {feedbacks.filter((f) => f.status === "resolved").length}
          </span>
        </div>
      </div>

      {/* 필터 툴바 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
        {/* 상태 필터 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="ui-caption text-on-surface-variant font-medium mr-1">상태:</span>
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
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                feedbackStatusFilter === s.id
                  ? "bg-primary text-on-primary font-semibold"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 유형 필터 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="ui-caption text-on-surface-variant font-medium mr-1">유형:</span>
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
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                feedbackTypeFilter === t.id
                  ? "bg-primary text-on-primary font-semibold"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 피드백 목록 */}
      {isLoadingFeedbacks ? (
        <div className="p-12 text-center bg-surface-container-lowest border border-outline-variant rounded-lg">
          <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
          <p className="ui-caption text-on-surface-variant">피드백 데이터를 불러오는 중입니다...</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest border border-outline-variant rounded-lg">
          <MessageSquareText size={32} className="text-on-surface-variant/40 mx-auto mb-2" />
          <p className="ui-body text-on-surface font-medium">조건에 맞는 피드백이 없습니다.</p>
          <p className="ui-caption text-on-surface-variant font-light mt-1">
            새로운 사용자 피드백이 접수되면 이곳에 실시간으로 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => {
            const typeBadgeMap = {
              bug: { label: "버그 제보", color: "bg-red-500/10 text-red-500 border-red-500/20" },
              feature: { label: "기능 제안", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
              inquiry: { label: "문의 사항", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
              feedback: { label: "일반 피드백", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
            }[fb.type] || { label: "피드백", color: "bg-primary/10 text-primary border-primary/20" };

            const statusBadgeMap = {
              pending: { label: "접수 대기", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
              in_progress: { label: "처리 중", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
              resolved: { label: "해결 완료", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
              dismissed: { label: "제외됨", color: "text-neutral-400 bg-neutral-400/10 border-neutral-400/20" },
            }[fb.status];

            const replyInput =
              feedbackReplies[fb._id] !== undefined ? feedbackReplies[fb._id] : fb.adminReply || "";
            const isUpdating = isUpdatingFeedback[fb._id];

            return (
              <div
                key={fb._id}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3 transition-all"
              >
                {/* 피드백 상단 정보: 뱃지, 별점, 작성자, 작성일 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant pb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`ui-badge px-2 py-0.5 rounded border ${typeBadgeMap.color}`}>
                      {typeBadgeMap.label}
                    </span>
                    <span className={`ui-badge px-2 py-0.5 rounded border ${statusBadgeMap.color}`}>
                      {statusBadgeMap.label}
                    </span>
                    {typeof fb.rating === "number" && fb.rating > 0 && (
                      <div className="flex items-center gap-0.5 text-amber-400">
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

                  <div className="flex items-center gap-2 text-on-surface-variant ui-caption">
                    <span>{fb.userName || "익명"}</span>
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
                  </div>
                </div>

                {/* 제목 및 본문 내용 */}
                <div>
                  <h3 className="ui-card-title text-on-surface font-semibold mb-1">{fb.title}</h3>
                  <p className="ui-body text-on-surface-variant whitespace-pre-wrap bg-surface-container-low p-3 rounded-md border border-outline-variant/60 font-light leading-relaxed">
                    {fb.content}
                  </p>
                </div>

                {/* 관리자 답변 및 상태 제어 영역 */}
                <div className="pt-2 border-t border-outline-variant/60 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="ui-caption font-semibold text-on-surface flex items-center gap-1.5">
                      <MessageSquareText size={13} className="text-primary" />
                      <span>관리자 답변 및 상태 업데이트</span>
                      {fb.repliedAt && (
                        <span className="ui-caption font-normal text-on-surface-variant text-[11px]">
                          (답변일: {new Date(fb.repliedAt).toLocaleDateString("ko-KR")})
                        </span>
                      )}
                    </label>

                    {/* 상태 빠른 변경 버튼군 */}
                    <div className="flex items-center gap-1">
                      {(["pending", "in_progress", "resolved", "dismissed"] as const).map((st) => {
                        const labels = {
                          pending: "대기",
                          in_progress: "처리중",
                          resolved: "해결완료",
                          dismissed: "제외",
                        };
                        return (
                          <button
                            key={st}
                            onClick={() => handleUpdateFeedbackStatus(fb._id, st, replyInput)}
                            disabled={isUpdating}
                            className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                              fb.status === st
                                ? "bg-primary text-on-primary font-medium"
                                : "bg-surface-container-low text-on-surface-variant hover:text-on-surface border border-outline-variant"
                            }`}
                          >
                            {labels[st]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyInput}
                      onChange={(e) =>
                        setFeedbackReplies((prev) => ({ ...prev, [fb._id]: e.target.value }))
                      }
                      placeholder="사용자에게 남길 답변 또는 관리 메모를 입력하세요..."
                      className="flex-1 bg-surface-container-low px-3 py-1.5 rounded-md border border-outline-variant ui-caption text-on-surface focus:outline-none focus:border-primary transition-all"
                    />
                    <button
                      onClick={() =>
                        handleUpdateFeedbackStatus(
                          fb._id,
                          fb.status === "pending" ? "resolved" : fb.status,
                          replyInput
                        )
                      }
                      disabled={isUpdating}
                      className="px-3.5 py-1.5 bg-primary hover:opacity-90 text-on-primary text-xs font-semibold rounded-md transition-all shadow-xs cursor-pointer shrink-0"
                    >
                      답변 저장
                    </button>
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
