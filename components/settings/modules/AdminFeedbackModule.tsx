"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  ExternalLink,
  Edit3,
  Copy,
  X,
  Save,
} from "lucide-react";
import { toast } from "@/lib/toast";

export interface FeedbackItem {
  _id: string;
  userEmail: string;
  userName: string;
  type: "bug" | "feature" | "inquiry" | "feedback" | "report";
  title: string;
  content: string;
  rating?: number;
  status: "pending" | "in_progress" | "resolved" | "dismissed";
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
  questionId?: string;
  subject?: string;
  examType?: string;
  questionNumber?: number;
  reportId?: string;
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

  // 🌟 문항 오류 직접 수정 모달 상태
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackItem | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [editFormData, setEditFormData] = useState({
    subject: "",
    examType: "",
    questionNumber: "1",
    questionType: "multiple-choice" as "multiple-choice" | "short-answer",
    title: "",
    codeSnippet: "",
    options: ["", "", "", ""],
    correctAnswer: ["1"] as string[],
    explanation: "",
  });

  // 문항 수정 모달 열기 및 원본 데이터 페칭
  const handleOpenQuestionEditModal = async (questionId?: string, fb?: FeedbackItem) => {
    setIsEditModalOpen(true);
    setEditingQuestionId(questionId || null);
    setEditingFeedback(fb || null);
    setIsLoadingQuestion(true);

    // 초기 폼 설정
    setEditFormData({
      subject: fb?.subject || "",
      examType: fb?.examType || "",
      questionNumber: String(fb?.questionNumber ?? 1),
      questionType: "multiple-choice",
      title: "",
      codeSnippet: "",
      options: ["", "", "", ""],
      correctAnswer: ["1"],
      explanation: "",
    });

    try {
      let targetQ: any = null;
      if (questionId) {
        const res = await fetch(`/api/questions?id=${questionId}`);
        if (res.ok) {
          const data = await res.json();
          targetQ = Array.isArray(data) ? data[0] : data;
        }
      }

      if (targetQ) {
        setEditingQuestionId(targetQ._id);
        const parsedAnswers: string[] = (() => {
          const raw = targetQ.correctAnswer ?? targetQ.answer;
          if (Array.isArray(raw) && raw.length > 0) return raw.map(String);
          if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
            return String(raw).split(",").map((s: string) => s.trim()).filter(Boolean);
          }
          return ["1"];
        })();

        setEditFormData({
          subject: targetQ.subject || fb?.subject || "",
          examType: targetQ.examType || fb?.examType || "",
          questionNumber: String(targetQ.questionNumber ?? fb?.questionNumber ?? 1),
          questionType: targetQ.questionType || "multiple-choice",
          title: targetQ.title || "",
          codeSnippet: targetQ.codeSnippet || "",
          options: targetQ.options && targetQ.options.length >= 2 ? targetQ.options : ["", "", "", ""],
          correctAnswer: parsedAnswers,
          explanation: targetQ.explanation || "",
        });
      }
    } catch (err) {
      console.error("문항 상세 조회 오류:", err);
      toast.error("문항 상세 정보를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  // 문항 수정 저장 (및 선택적 신고 해결 처리)
  const handleSaveQuestion = async (resolveFeedback: boolean = false) => {
    if (!editingQuestionId) {
      toast.error("수정할 문항 ID가 없습니다.");
      return;
    }
    if (!editFormData.title.trim()) {
      toast.warning("문제 지문을 입력해주세요.");
      return;
    }
    if (editFormData.correctAnswer.length === 0) {
      toast.warning("최소 한 개 이상의 정답을 지정해주세요.");
      return;
    }

    setIsSavingQuestion(true);
    try {
      const res = await fetch("/api/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editingQuestionId,
          subject: editFormData.subject,
          examType: editFormData.examType,
          questionNumber: Number(editFormData.questionNumber) || 1,
          questionType: editFormData.questionType,
          title: editFormData.title,
          codeSnippet: editFormData.codeSnippet,
          options: editFormData.questionType === "multiple-choice" ? editFormData.options : [],
          correctAnswer: editFormData.correctAnswer,
          explanation: editFormData.explanation,
        }),
      });

      if (res.ok) {
        toast.success("문항이 성공적으로 수정되어 반영되었습니다.");
        if (resolveFeedback && editingFeedback) {
          await handleUpdateFeedbackStatus(
            editingFeedback._id,
            "resolved",
            `신고해주신 문항(과목: ${editFormData.subject || "-"}, #${editFormData.questionNumber}번)의 오류가 정상 수정 및 반영되었습니다. 소중한 제보 감사합니다!`
          );
        }
        setIsEditModalOpen(false);
      } else {
        const err = await res.json();
        toast.error(err.error || "문항 수정 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error(err);
      toast.error("네트워크 통신 중 오류가 발생했습니다.");
    } finally {
      setIsSavingQuestion(false);
    }
  };

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
    replyText?: string,
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
            pendingCount:
              targetFb?.status === "pending"
                ? Math.max(0, prev.pendingCount - 1)
                : prev.pendingCount,
            inProgressCount:
              targetFb?.status === "in_progress"
                ? Math.max(0, prev.inProgressCount - 1)
                : prev.inProgressCount,
            resolvedCount: newStatus === "resolved" ? prev.resolvedCount + 1 : prev.resolvedCount,
          }));
          toast.success("해결 완료되어 '완료 보관함'으로 이동되었습니다.");
        }
        // 완료 보관함에서 다시 접수함으로 복원한 경우: 보관함에서 즉시 제외하여 접수함으로 이동
        else if (
          activeTab === "completed" &&
          (newStatus === "pending" || newStatus === "in_progress")
        ) {
          setFeedbacks((prev) => prev.filter((fb) => fb._id !== id));
          setCounts((prev) => ({
            ...prev,
            completedCount: Math.max(0, prev.completedCount - 1),
            activeCount: prev.activeCount + 1,
            pendingCount: newStatus === "pending" ? prev.pendingCount + 1 : prev.pendingCount,
            inProgressCount:
              newStatus === "in_progress" ? prev.inProgressCount + 1 : prev.inProgressCount,
            resolvedCount:
              targetFb?.status === "resolved"
                ? Math.max(0, prev.resolvedCount - 1)
                : prev.resolvedCount,
          }));
          toast.info("피드백이 접수함으로 다시 이동되었습니다.");
        } else {
          setFeedbacks((prev) =>
            prev.map((fb) => (fb._id === id ? { ...fb, ...updatedItem } : fb)),
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
              미해결 피드백은 접수함에서 빠르게 처리하고, 해결 완료된 항목은 완료 보관함으로 분리
              보관합니다.
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
            { id: "report", label: "문제 오류 신고" },
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
          <p className="ui-caption text-on-surface-variant">
            피드백 데이터를 동기화하는 중입니다...
          </p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="p-14 text-center bg-surface-container-lowest border border-outline-variant rounded-xl space-y-2">
          {activeTab === "active" ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-1">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="ui-section-title text-on-surface">
                모든 피드백이 처리 완료되었습니다
              </h3>
              <p className="ui-caption text-on-surface-variant max-w-sm mx-auto">
                현재 접수 대기 또는 처리 중인 피드백이 없습니다. 해결된 피드백은 [완료 보관함]에서
                확인하실 수 있습니다.
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
              <h3 className="ui-section-title text-on-surface">
                검색 조건에 맞는 피드백이 없습니다
              </h3>
              <p className="ui-caption text-on-surface-variant">필터나 검색어를 변경해 보세요.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {feedbacks.map((fb) => {
            const typeBadgeMap = {
              report: {
                label: "문제 오류 신고",
                color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
              },
              bug: {
                label: "버그 제보",
                color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
              },
              feature: {
                label: "기능 제안",
                color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
              },
              inquiry: {
                label: "문의 사항",
                color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
              },
              feedback: {
                label: "일반 피드백",
                color:
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
              },
            }[fb.type] || {
              label: "피드백",
              color: "bg-primary/10 text-primary border-primary/25",
            };

            const isResolved = fb.status === "resolved";
            const isDismissed = fb.status === "dismissed";
            const isCompleted = isResolved || isDismissed;

            const statusBadgeMap = {
              pending: {
                label: "접수 대기",
                color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25",
              },
              in_progress: {
                label: "처리 중",
                color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/25",
              },
              resolved: {
                label: "해결 완료",
                color:
                  "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
              },
              dismissed: {
                label: "제외됨",
                color: "text-neutral-500 bg-neutral-400/10 border-neutral-400/25",
              },
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
                    <span
                      className={`ui-badge px-2.5 py-0.5 rounded-md font-semibold border ${typeBadgeMap.color}`}
                    >
                      {typeBadgeMap.label}
                    </span>
                    <span
                      className={`ui-badge px-2.5 py-0.5 rounded-md font-bold border ${statusBadgeMap.color}`}
                    >
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
                        onClick={() =>
                          handleUpdateFeedbackStatus(fb._id, "in_progress", replyInput)
                        }
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

                {/* 문항 오류 신고인 경우 문항 메타정보 및 문항 바로가기 배너 */}
                {(fb.subject || fb.examType || fb.questionNumber !== undefined || fb.questionId || fb.type === "report") && (
                  <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-surface-container/70 border border-outline-variant text-xs text-on-surface">
                    <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 shrink-0">
                      <AlertCircle size={14} />
                      문항 정보:
                    </span>
                    {fb.subject && (
                      <span className="px-2 py-0.5 rounded-md bg-surface-container-high font-medium text-[11.5px] border border-outline-variant/60">
                        과목: {fb.subject}
                      </span>
                    )}
                    {fb.examType && (
                      <span className="px-2 py-0.5 rounded-md bg-surface-container-high font-medium text-[11.5px] border border-outline-variant/60">
                        회차: {fb.examType}
                      </span>
                    )}
                    {fb.questionNumber !== undefined && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono font-bold text-[11.5px] border border-rose-500/25">
                        #{fb.questionNumber}번 문항
                      </span>
                    )}
                    {fb.questionId && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-container-high font-mono text-[11px] border border-outline-variant/60">
                        <span className="text-on-surface-variant font-sans text-[11px]">문항 ID:</span>
                        <span className="font-bold text-primary select-all">{fb.questionId}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(fb.questionId!);
                            toast.success("문항 ID가 복사되었습니다.");
                          }}
                          className="text-on-surface-variant hover:text-on-surface p-0.5 rounded hover:bg-surface-container-highest cursor-pointer transition-colors"
                          title="문항 ID 클립보드 복사"
                        >
                          <Copy size={11} />
                        </button>
                      </span>
                    )}

                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenQuestionEditModal(fb.questionId, fb)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-on-primary hover:opacity-90 text-[11.5px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
                        title="신고된 문항 내용/정답 바로 수정하기"
                      >
                        <Edit3 size={12} />
                        <span>수정하기</span>
                      </button>
                      <Link
                        href="/settings/questions"
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-on-surface-variant hover:text-primary transition-colors"
                      >
                        <span>문항 관리</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                )}

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
                          (답변일:{" "}
                          {new Date(fb.repliedAt).toLocaleString("ko-KR", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          )
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
                          onClick={() =>
                            handleUpdateFeedbackStatus(
                              fb._id,
                              fb.status === "pending" ? "in_progress" : fb.status,
                              replyInput,
                            )
                          }
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

      {/* ================= 🌟 문항 오류 직접 수정 모달 ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-outline-variant flex items-center justify-between bg-surface-container-low/50">
              <div>
                <h3 className="ui-section-title text-on-surface font-bold flex items-center gap-2">
                  <Edit3 size={18} className="text-primary" />
                  <span>신고 문항 직접 수정</span>
                </h3>
                <p className="ui-caption text-on-surface-variant mt-0.5">
                  지문, 보기, 정답, 해설을 수정하면 문제 풀이와 DB에 실시간으로 즉시 반영됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[calc(90vh-140px)]">
              {isLoadingQuestion ? (
                <div className="py-12 text-center space-y-3">
                  <Loader2 size={24} className="animate-spin text-primary mx-auto" />
                  <p className="ui-caption text-on-surface-variant">문항 원본 데이터를 불러오는 중입니다...</p>
                </div>
              ) : (
                <>
                  {/* 문항 ID & 메타정보 배너 */}
                  <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-on-surface-variant">문항 ID:</span>
                      <span className="font-mono font-bold text-primary select-all">
                        {editingQuestionId || "신규/미연결"}
                      </span>
                      {editingQuestionId && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(editingQuestionId);
                            toast.success("문항 ID가 복사되었습니다.");
                          }}
                          className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface cursor-pointer"
                          title="ID 복사"
                        >
                          <Copy size={12} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px]">
                      <span>과목: {editFormData.subject || "-"}</span>
                      <span>•</span>
                      <span>회차: {editFormData.examType || "-"}</span>
                      <span>•</span>
                      <span>#{editFormData.questionNumber}번</span>
                    </div>
                  </div>

                  {/* 과목, 회차, 문항 번호 수정 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="ui-caption font-semibold text-on-surface block mb-1">과목명</label>
                      <input
                        type="text"
                        value={editFormData.subject}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, subject: e.target.value }))}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                        placeholder="예: 전자계산기구조"
                      />
                    </div>
                    <div>
                      <label className="ui-caption font-semibold text-on-surface block mb-1">회차명</label>
                      <input
                        type="text"
                        value={editFormData.examType}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, examType: e.target.value }))}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                        placeholder="예: 2024년 1회"
                      />
                    </div>
                    <div>
                      <label className="ui-caption font-semibold text-on-surface block mb-1">문항 번호</label>
                      <input
                        type="number"
                        value={editFormData.questionNumber}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, questionNumber: e.target.value }))}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* 문제 유형 선택 */}
                  <div>
                    <label className="ui-caption font-semibold text-on-surface block mb-1">문제 유형</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditFormData((prev) => ({ ...prev, questionType: "multiple-choice" }))}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          editFormData.questionType === "multiple-choice"
                            ? "bg-primary text-on-primary border-primary shadow-xs"
                            : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:text-on-surface"
                        }`}
                      >
                        객관식 (4지선다)
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormData((prev) => ({ ...prev, questionType: "short-answer" }))}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          editFormData.questionType === "short-answer"
                            ? "bg-primary text-on-primary border-primary shadow-xs"
                            : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:text-on-surface"
                        }`}
                      >
                        주관식 (단답형)
                      </button>
                    </div>
                  </div>

                  {/* 문제 지문 (제목) */}
                  <div>
                    <label className="ui-caption font-semibold text-on-surface block mb-1">문제 지문</label>
                    <textarea
                      value={editFormData.title}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, title: e.target.value }))}
                      rows={3}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary leading-relaxed resize-y"
                      placeholder="문제 지문을 입력하세요"
                    />
                  </div>

                  {/* 코드 스니펫 (선택) */}
                  <div>
                    <label className="ui-caption font-semibold text-on-surface block mb-1">
                      코드 스니펫 / 첨부 텍스트 (선택)
                    </label>
                    <textarea
                      value={editFormData.codeSnippet}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, codeSnippet: e.target.value }))}
                      rows={3}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs font-mono text-on-surface focus:outline-none focus:border-primary resize-y"
                      placeholder="예: 소스코드나 표, 추가 설명 텍스트 (마크다운 지원)"
                    />
                  </div>

                  {/* 객관식 보기 및 정답 설정 */}
                  {editFormData.questionType === "multiple-choice" ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="ui-caption font-semibold text-on-surface">
                          보기 목록 및 정답 선택 (번호를 눌러 정답 지정/해제)
                        </label>
                        <span className="text-[11px] text-primary font-bold">
                          현재 정답: {editFormData.correctAnswer.join(", ") || "없음"}번
                        </span>
                      </div>
                      <div className="space-y-2">
                        {editFormData.options.map((opt, idx) => {
                          const optNum = String(idx + 1);
                          const isCorrect = editFormData.correctAnswer.includes(optNum);
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditFormData((prev) => {
                                    const exists = prev.correctAnswer.includes(optNum);
                                    const nextAnswers = exists
                                      ? prev.correctAnswer.filter((a) => a !== optNum)
                                      : [...prev.correctAnswer, optNum];
                                    return {
                                      ...prev,
                                      correctAnswer: nextAnswers.length > 0 ? nextAnswers : [optNum],
                                    };
                                  });
                                }}
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                                  isCorrect
                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-xs"
                                    : "bg-surface-container text-on-surface-variant border-outline-variant hover:border-primary"
                                }`}
                                title={`보기 ${optNum}번 정답 지정/해제`}
                              >
                                {optNum}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditFormData((prev) => {
                                    const newOpts = [...prev.options];
                                    newOpts[idx] = val;
                                    return { ...prev, options: newOpts };
                                  });
                                }}
                                className={`flex-1 bg-surface-container-low border rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary ${
                                  isCorrect ? "border-emerald-500/50 bg-emerald-500/5" : "border-outline-variant"
                                }`}
                                placeholder={`보기 ${optNum} 내용`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="ui-caption font-semibold text-on-surface block mb-1">
                        주관식 정답 (쉼표로 복수 정답 구분 가능)
                      </label>
                      <input
                        type="text"
                        value={editFormData.correctAnswer.join(", ")}
                        onChange={(e) => {
                          const split = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                          setEditFormData((prev) => ({ ...prev, correctAnswer: split }));
                        }}
                        className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary font-bold"
                        placeholder="예: 스택, stack"
                      />
                    </div>
                  )}

                  {/* 해설 */}
                  <div>
                    <label className="ui-caption font-semibold text-on-surface block mb-1">해설 (설명)</label>
                    <textarea
                      value={editFormData.explanation}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, explanation: e.target.value }))}
                      rows={3}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-xs sm:text-sm text-on-surface focus:outline-none focus:border-primary leading-relaxed resize-y"
                      placeholder="해설 내용을 입력하세요"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:p-4 border-t border-outline-variant flex flex-wrap items-center justify-between gap-2.5 bg-surface-container-low/50">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer transition-colors"
              >
                취소
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveQuestion(false)}
                  disabled={isSavingQuestion || isLoadingQuestion}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary hover:opacity-90 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingQuestion ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>수정 사항 저장</span>
                </button>

                {editingFeedback && (
                  <button
                    type="button"
                    onClick={() => handleSaveQuestion(true)}
                    disabled={isSavingQuestion || isLoadingQuestion}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSavingQuestion ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                    <span>수정 & 해결완료 보관</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
