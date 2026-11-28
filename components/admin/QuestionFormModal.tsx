"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Eye,
  EyeOff,
  HelpCircle,
  Code,
  Plus,
  Minus,
  Sparkles,
  CheckCircle,
  Check,
  Loader2,
  Save,
  AlertCircle,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { toast } from "@/lib/toast";
import { alertModal } from "@/lib/alert";
import { invalidateQuestionsCache } from "@/lib/questionsClient";

export interface QuestionData {
  _id?: string;
  subject: string;
  examType: string;
  questionNumber: number | string;
  questionType: "multiple-choice" | "short-answer";
  title: string;
  codeSnippet?: string;
  options?: string[];
  correctAnswer: string[];
  explanation?: string;
  isActive?: boolean;
}

export interface QuestionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId?: string | null;
  initialData?: QuestionData | null;
  defaultSubject?: string;
  defaultExamType?: string;
  defaultQuestionNumber?: number | string;
  feedbackId?: string | null;
  onSuccess?: (savedQuestion: QuestionData) => void;
  onResolveFeedback?: (feedbackId: string, replyMessage?: string) => Promise<void> | void;
}

const defaultFormData = {
  subject: "",
  examType: "",
  questionNumber: "1",
  questionType: "multiple-choice" as "multiple-choice" | "short-answer",
  title: "",
  codeSnippet: "",
  options: ["", "", "", ""],
  correctAnswer: ["1"],
  currentTagInput: "",
  explanation: "",
};

export function QuestionFormModal({
  isOpen,
  onClose,
  questionId,
  initialData,
  defaultSubject,
  defaultExamType,
  defaultQuestionNumber,
  feedbackId,
  onSuccess,
  onResolveFeedback,
}: QuestionFormModalProps) {
  const [formData, setFormData] = useState(defaultFormData);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const editMode = Boolean(targetId || questionId || initialData?._id);

  // 정답 안전 파싱 유틸리티
  const parseCorrectAnswers = (raw: unknown): string[] => {
    if (Array.isArray(raw) && raw.length > 0) {
      const mapped = raw.map((item) => String(item).trim()).filter(Boolean);
      if (mapped.length > 0) return mapped;
    } else if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      const split = String(raw).split(",").map((s) => s.trim()).filter(Boolean);
      if (split.length > 0) return split;
    }
    return ["1"];
  };

  // 모달 오픈 시 데이터 로드 및 폼 초기화
  useEffect(() => {
    if (!isOpen) {
      setMessage(null);
      setIsPreviewMode(false);
      return;
    }

    setMessage(null);
    setIsPreviewMode(false);

    // 1. initialData가 있는 경우 바로 반영
    if (initialData && (!questionId || initialData._id === questionId)) {
      setTargetId(initialData._id || null);
      setFormData({
        subject: initialData.subject || defaultSubject || "",
        examType: initialData.examType || defaultExamType || "",
        questionNumber: String(initialData.questionNumber ?? defaultQuestionNumber ?? "1"),
        questionType: initialData.questionType || "multiple-choice",
        title: initialData.title || "",
        codeSnippet: initialData.codeSnippet || "",
        options:
          initialData.options && initialData.options.length >= 2
            ? initialData.options
            : ["", "", "", ""],
        correctAnswer: parseCorrectAnswers(initialData.correctAnswer),
        currentTagInput: "",
        explanation: initialData.explanation || "",
      });
      return;
    }

    // 2. questionId가 주어진 경우 서버에서 상세 정보 페칭
    if (questionId) {
      setTargetId(questionId);
      setIsLoading(true);
      fetch(`/api/questions?id=${questionId}`)
        .then((res) => {
          if (!res.ok) throw new Error("문항을 불러오지 못했습니다.");
          return res.json();
        })
        .then((data) => {
          const q: QuestionData = Array.isArray(data) ? data[0] : data;
          if (q) {
            setFormData({
              subject: q.subject || defaultSubject || "",
              examType: q.examType || defaultExamType || "",
              questionNumber: String(q.questionNumber ?? defaultQuestionNumber ?? "1"),
              questionType: q.questionType || "multiple-choice",
              title: q.title || "",
              codeSnippet: q.codeSnippet || "",
              options: q.options && q.options.length >= 2 ? q.options : ["", "", "", ""],
              correctAnswer: parseCorrectAnswers(q.correctAnswer),
              currentTagInput: "",
              explanation: q.explanation || "",
            });
          }
        })
        .catch((err) => {
          console.error("Failed to load question details:", err);
          toast.error("문항 상세 정보를 불러오지 못했습니다.");
        })
        .finally(() => {
          setIsLoading(false);
        });
      return;
    }

    // 3. 신규 문제 등록 모드
    setTargetId(null);
    setFormData({
      ...defaultFormData,
      subject: defaultSubject || "",
      examType: defaultExamType || "",
      questionNumber: String(defaultQuestionNumber ?? "1"),
      correctAnswer: ["1"],
    });
  }, [isOpen, questionId, initialData, defaultSubject, defaultExamType, defaultQuestionNumber]);

  // 입력 핸들러
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type: "multiple-choice" | "short-answer") => {
    setFormData((prev) => {
      if (prev.questionType === type) return prev;
      return {
        ...prev,
        questionType: type,
        correctAnswer:
          prev.correctAnswer.length > 0
            ? prev.correctAnswer
            : type === "multiple-choice"
              ? ["1"]
              : [],
      };
    });
  };

  const handleSelectCorrectOption = (optNum: number) => {
    const optStr = String(optNum);
    setFormData((prev) => ({
      ...prev,
      correctAnswer: [optStr],
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const handleAddOption = () => {
    setFormData((prev) => ({ ...prev, options: [...prev.options, ""] }));
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) {
      alertModal.warning("객관식 보기는 최소 2개 이상이어야 합니다.");
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = formData.currentTagInput.trim();
      if (val && !formData.correctAnswer.includes(val)) {
        setFormData((prev) => ({
          ...prev,
          correctAnswer: [...prev.correctAnswer, val],
          currentTagInput: "",
        }));
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (formData.correctAnswer.length <= 1) {
      alertModal.warning("최소 한 개 이상의 정답이 필요합니다.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      correctAnswer: prev.correctAnswer.filter((tag) => tag !== tagToRemove),
    }));
  };

  // 문제 저장 처리 (선택적으로 피드백 해결 처리도 함께 수행)
  const handleSubmit = async (e?: React.FormEvent, resolveAlso: boolean = false) => {
    if (e) e.preventDefault();
    setMessage(null);

    if (!formData.title.trim()) {
      toast.warning("문제 지문을 입력해주세요.");
      return;
    }

    const finalAnswers = [...formData.correctAnswer];
    const leftover = formData.currentTagInput.trim();
    if (leftover && !finalAnswers.includes(leftover)) {
      finalAnswers.push(leftover);
    }

    if (finalAnswers.length === 0) {
      toast.warning("최소 한 개 이상의 정답을 입력해주세요.");
      return;
    }

    const submitId = targetId || questionId || initialData?._id;
    const submitData = {
      subject: formData.subject,
      examType: formData.examType,
      questionNumber: Number(formData.questionNumber) || 1,
      questionType: formData.questionType,
      title: formData.title,
      codeSnippet: formData.codeSnippet,
      options: formData.questionType === "multiple-choice" ? formData.options : [],
      correctAnswer: finalAnswers,
      explanation: formData.explanation,
      ...(editMode && submitId ? { _id: submitId } : {}),
    };

    setIsSaving(true);
    try {
      const res = await fetch("/api/questions", {
        method: editMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        const resData = await res.json();
        const savedQ: QuestionData = resData.data || submitData;

        invalidateQuestionsCache();
        toast.success(
          editMode ? "문제가 성공적으로 수정되었습니다." : "새 문제가 성공적으로 등록되었습니다."
        );

        if (onSuccess) {
          onSuccess(savedQ);
        }

        // 신고 피드백 해결 연동이 요청된 경우
        if (resolveAlso && feedbackId && onResolveFeedback) {
          const replyText = `신고해주신 문항(과목: ${formData.subject || "-"}, #${formData.questionNumber}번)의 오류가 정상 수정 및 반영되었습니다. 소중한 제보 감사합니다!`;
          await onResolveFeedback(feedbackId, replyText);
        }

        onClose();
      } else {
        const errorData = await res.json();
        const errMsg = errorData.error || errorData.message || "문제 저장 중 오류가 발생했습니다.";
        setMessage({ type: "error", text: errMsg });
        toast.error(errMsg);
      }
    } catch {
      const errMsg = "서버와 통신하는 중 문제가 발생했습니다.";
      setMessage({ type: "error", text: errMsg });
      toast.error(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-surface-container-lowest w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl flex flex-col border border-outline-variant">
        {/* 모달 상단 헤더 */}
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-outline-variant bg-surface-container-lowest backdrop-blur-md gap-3">
          <div className="flex items-center gap-2 truncate">
            <h3 className="text-sm sm:text-base font-bold text-on-surface truncate">
              {editMode ? "문항 수정하기" : "새 문항 추가하기"}
            </h3>
            {targetId && (
              <span className="font-mono text-[11px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md border border-outline-variant/60 hidden sm:inline-block">
                ID: {targetId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 미리보기 / 편집 모드 전환 */}
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
                isPreviewMode
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40"
                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/25"
              }`}
            >
              {isPreviewMode ? (
                <EyeOff size={13} className="text-amber-500" />
              ) : (
                <Eye size={13} className="text-amber-500" />
              )}
              <span>{isPreviewMode ? "편집 모드로 돌아가기" : "exam 미리보기"}</span>
            </button>

            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-surface-container-low hover:bg-surface-container rounded-md transition-colors cursor-pointer text-on-surface-variant hover:text-on-surface"
              title="닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 상단 탭: 문항 정보 편집 vs 실시간 시험 응시 화면 미리보기 */}
        <div className="flex items-center border-b border-outline-variant bg-surface-container-low/40 px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setIsPreviewMode(false)}
            className={`flex items-center gap-1.5 pb-2.5 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              !isPreviewMode
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <HelpCircle size={14} />
            <span>문항 정보 편집</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPreviewMode(true)}
            className={`flex items-center gap-1.5 pb-2.5 px-3.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              isPreviewMode
                ? "border-amber-500 text-amber-600 dark:text-amber-400"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Eye size={14} />
            <span>실시간 Exam 응시 화면 미리보기</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-[10px] font-mono text-amber-600 dark:text-amber-400 border border-amber-500/25">
              Live Preview
            </span>
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 sm:p-6 space-y-5">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-on-surface-variant space-y-2">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="text-xs font-medium">문항 정보를 불러오는 중입니다...</span>
            </div>
          ) : (
            <>
              {message && (
                <div
                  className={`p-3.5 rounded-xl border ${
                    message.type === "success"
                      ? "bg-secondary/15 text-secondary border-secondary/30"
                      : "bg-destructive/15 text-destructive border-destructive/30"
                  } flex items-center gap-2 text-xs sm:text-sm font-medium`}
                >
                  {message.type === "success" ? (
                    <CheckCircle size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {isPreviewMode ? (
                /* 미리보기 화면 (시험 응시 화면과 동일 스타일) */
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-surface-container-low border-2 border-dashed border-amber-500/40 p-5 sm:p-6 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                      <span>✨ Exam 응시 페이지 실시간 미리보기 (구문 강조 적용)</span>
                    </div>

                    <div className="bg-surface-container-lowest p-5 sm:p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant font-mono">
                        <span>[{formData.subject || "과목 미입력"}]</span>
                        <span>•</span>
                        <span>{formData.examType || "회차 미입력"}</span>
                        <span>•</span>
                        <span>{formData.questionNumber || "0"}번 문제</span>
                      </div>

                      <div className="text-sm sm:text-base font-bold text-on-surface leading-relaxed max-w-none">
                        <MarkdownRenderer content={formData.title || "작성된 문제 지문이 없습니다."} />
                      </div>

                      {formData.codeSnippet && (
                        <div className="bg-surface-container-low text-on-surface p-4 rounded-xl text-xs overflow-x-auto border border-outline-variant leading-relaxed max-w-none font-mono">
                          <MarkdownRenderer content={formData.codeSnippet} />
                        </div>
                      )}

                      {formData.questionType === "multiple-choice" && (
                        <div className="space-y-2 pt-2">
                          {formData.options.map((opt, idx) => {
                            const isCorrect = formData.correctAnswer.includes(String(idx + 1));
                            return (
                              <div
                                key={idx}
                                className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-3 transition-colors ${
                                  isCorrect
                                    ? "border-primary/50 bg-primary/5 text-on-surface"
                                    : "border-outline-variant bg-surface-container-low text-on-surface"
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isCorrect
                                      ? "bg-primary text-on-primary"
                                      : "bg-surface-container text-on-surface"
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className="truncate">{opt || `보기 ${idx + 1}`}</span>
                                {isCorrect && (
                                  <span className="ml-auto text-[11px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md">
                                    정답
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {formData.explanation && (
                        <div className="mt-4 p-4 bg-primary/10 rounded-xl border border-primary/30 text-xs text-on-surface space-y-1">
                          <span className="font-bold text-primary block">정답 및 해설</span>
                          <div className="leading-relaxed max-w-none">
                            <MarkdownRenderer content={formData.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 미리보기 화면 하단 액션 버튼 */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant">
                    <button
                      type="button"
                      onClick={() => setIsPreviewMode(false)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <EyeOff size={13} />
                      <span>← 다시 편집하기</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {feedbackId && onResolveFeedback && (
                        <button
                          type="button"
                          onClick={() => handleSubmit(undefined, true)}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          <span>수정 & 신고 해결완료 보관</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSubmit(undefined, false)}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:opacity-90 text-on-primary font-bold rounded-xl transition-opacity shadow-xs text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : editMode ? (
                          <Save size={15} />
                        ) : (
                          <Sparkles size={15} />
                        )}
                        <span>{editMode ? "수정 완료 (저장)" : "새 문항 저장"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* 편집 입력 폼 */
                <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
                  {/* 문항 타입 선택 토글 */}
                  <div className="flex gap-2 p-1 bg-surface-container-low rounded-xl border border-outline-variant">
                    <button
                      type="button"
                      onClick={() => handleTypeChange("multiple-choice")}
                      className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        formData.questionType === "multiple-choice"
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      객관식
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange("short-answer")}
                      className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        formData.questionType === "short-answer"
                          ? "bg-primary text-on-primary shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      주관식 (단답형)
                    </button>
                  </div>

                  {/* 과목명 & 기출 회차 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-on-surface">
                        과목명
                      </label>
                      <input
                        required
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="예: 컴퓨터구조, 소프트웨어공학"
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-xs sm:text-sm focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-on-surface">
                        기출 회차
                      </label>
                      <input
                        required
                        type="text"
                        name="examType"
                        value={formData.examType}
                        onChange={handleChange}
                        placeholder="예: [기출문제] 2026년 1회"
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-xs sm:text-sm focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* 문제 번호 */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-on-surface">
                      문제 번호
                    </label>
                    <input
                      required
                      type="number"
                      name="questionNumber"
                      value={formData.questionNumber}
                      onChange={handleChange}
                      placeholder="1"
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-xs sm:text-sm focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 transition-colors"
                    />
                  </div>

                  {/* 문제 지문 */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-on-surface flex items-center gap-1.5">
                      <HelpCircle size={15} className="text-primary" /> 문제 지문 (내용)
                    </label>
                    <textarea
                      required
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      rows={3}
                      placeholder="문제 지문을 입력하세요 (마크다운 지원)..."
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-xs sm:text-sm focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 transition-colors leading-relaxed"
                    />
                  </div>

                  {/* 코드 스니펫 */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-on-surface flex items-center gap-1.5">
                      <Code size={15} className="text-primary" /> 코드 스니펫 / 첨부 텍스트 (선택)
                    </label>
                    <textarea
                      name="codeSnippet"
                      value={formData.codeSnippet}
                      onChange={handleChange}
                      rows={4}
                      placeholder="소스코드 또는 알고리즘 입력 (```java, ```css 마크다운 지원)..."
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-xs sm:text-sm focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 font-mono transition-colors"
                    />
                  </div>

                  {/* 객관식 보기 섹션 */}
                  {formData.questionType === "multiple-choice" && (
                    <div className="space-y-3 p-4 sm:p-5 bg-surface-container-low rounded-xl border border-outline-variant">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h3 className="text-xs sm:text-sm font-semibold text-on-surface">
                            객관식 보기 입력 (최소 2개 이상)
                          </h3>
                          <p className="text-[11px] text-on-surface-variant">
                            보기 번호(원형 숫자)를 클릭하면 해당 번호가 정답으로 지정됩니다.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="flex items-center gap-1 text-xs bg-primary hover:opacity-90 text-on-primary font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs"
                        >
                          <Plus size={14} /> 보기 추가
                        </button>
                      </div>

                      {formData.options.map((option, index) => {
                        const isCorrect = formData.correctAnswer.includes(String(index + 1));
                        return (
                          <div key={index} className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleSelectCorrectOption(index + 1)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all cursor-pointer ${
                                isCorrect
                                  ? "bg-primary text-on-primary ring-2 ring-primary/40 shadow-xs"
                                  : "bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant"
                              }`}
                              title={`클릭하여 ${index + 1}번을 정답으로 지정`}
                            >
                              {index + 1}
                            </button>
                            <input
                              required={formData.questionType === "multiple-choice"}
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionChange(index, e.target.value)}
                              placeholder={`${index + 1}번 보기 입력...`}
                              className={`flex-1 bg-surface-container-lowest border rounded-xl p-3 text-xs sm:text-sm focus:border-primary focus:outline-none text-on-surface transition-colors ${
                                isCorrect
                                  ? "border-primary/50 ring-1 ring-primary/30"
                                  : "border-outline-variant"
                              }`}
                            />
                            {isCorrect && (
                              <span className="text-[11px] font-bold text-primary shrink-0 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-md">
                                정답
                              </span>
                            )}
                            {formData.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOption(index)}
                                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-colors"
                                title="보기 삭제"
                              >
                                <Minus size={16} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 정답 태그 관리 */}
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-sm font-semibold text-on-surface">
                      정답 관리 (입력 후 <strong>Enter</strong> 또는 <strong>쉼표(,)</strong> 입력)
                    </label>
                    <div className="flex flex-wrap items-center gap-2 bg-surface-container-low border border-outline-variant rounded-xl p-3 min-h-[46px]">
                      {formData.correctAnswer.map((tag, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1.5 bg-primary/15 text-primary text-xs font-bold px-3 py-1.5 rounded-lg border border-primary/30 animate-fade-in"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-destructive transition-colors cursor-pointer"
                            title="삭제"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        name="currentTagInput"
                        value={formData.currentTagInput}
                        onChange={handleChange}
                        onKeyDown={handleTagKeyDown}
                        placeholder={
                          formData.correctAnswer.length === 0
                            ? "정답을 입력하고 Enter를 누르세요..."
                            : "추가 정답 입력..."
                        }
                        className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm min-w-[140px] text-on-surface placeholder:text-on-surface-variant/50"
                      />
                    </div>
                  </div>

                  {/* 해설 입력 */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold mb-1.5 text-on-surface">
                      해설 (선택)
                    </label>
                    <textarea
                      name="explanation"
                      value={formData.explanation}
                      onChange={handleChange}
                      rows={4}
                      placeholder="해설 내용을 입력하세요 (마크다운 지원)..."
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-xs sm:text-sm focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant/50 transition-colors leading-relaxed"
                    />
                  </div>

                  {/* 모달 하단 액션 버튼 */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-outline-variant">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold cursor-pointer transition-colors"
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPreviewMode(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-colors cursor-pointer"
                        title="시험 응시 화면 미리보기로 전환"
                      >
                        <Eye size={14} />
                        <span>exam 미리보기</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 피드백 모듈에서 열린 경우: 수정 & 해결완료 보관 원클릭 버튼 */}
                      {feedbackId && onResolveFeedback && (
                        <button
                          type="button"
                          onClick={() => handleSubmit(undefined, true)}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {isSaving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          <span>수정 & 신고 해결완료 보관</span>
                        </button>
                      )}

                      {/* 기본 저장 버튼 */}
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:opacity-90 text-on-primary font-bold rounded-xl transition-opacity shadow-xs text-xs sm:text-sm cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : editMode ? (
                          <Save size={15} />
                        ) : (
                          <Sparkles size={15} />
                        )}
                        <span>{editMode ? "수정 완료 (저장)" : "새 문항 저장"}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
