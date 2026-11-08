"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import {
  MessageSquarePlus,
  X,
  Send,
  Star,
  CheckCircle2,
  Bug,
  Lightbulb,
  HelpCircle,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { toast } from "@/lib/toast";

export function FeedbackModal() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"bug" | "feature" | "inquiry" | "feedback">("feedback");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          rating,
          title: title.trim(),
          content: content.trim(),
          userEmail: session?.user?.email || email.trim() || "anonymous@one-quiz.com",
          userName: session?.user?.name || "학습자",
        }),
      });

      if (res.ok) {
        setIsSubmitted(true);
        toast.success("소중한 피드백이 관리자에게 안전하게 전달되었습니다!");
        setTimeout(() => {
          setIsSubmitted(false);
          setIsOpen(false);
          setTitle("");
          setContent("");
          setEmail("");
          setRating(5);
          setType("feedback");
        }, 1800);
      } else {
        toast.error("피드백 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
    } catch {
      toast.error("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const types = [
    { id: "bug", label: "버그 제보", icon: Bug },
    { id: "feature", label: "기능 제안", icon: Lightbulb },
    { id: "inquiry", label: "문의 사항", icon: HelpCircle },
    { id: "feedback", label: "일반 피드백", icon: MessageCircle },
  ] as const;

  return (
    <>
      {/* 🌟 우측 하단 고정 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-xs shadow-lg hover:opacity-90 active:scale-95 transition-all duration-200 cursor-pointer group"
        title="원퀴즈 개선 피드백 & 버그 제보"
      >
        <MessageSquarePlus size={16} className="group-hover:rotate-12 transition-transform" />
        <span className="hidden sm:inline">피드백 & 제보</span>
      </button>

      {/* 🌟 피드백 작성 모달 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container-low/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <MessageSquarePlus size={18} />
                </div>
                <div>
                  <h2 className="ui-card-title text-on-surface">의견 및 피드백 보내기</h2>
                  <p className="ui-caption text-on-surface-variant">
                    더 나은 원퀴즈를 위한 소중한 제안과 문제점을 알려주세요.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 모달 본문 */}
            {isSubmitted ? (
              <div className="py-16 px-6 flex flex-col items-center justify-center text-center gap-3 animate-in zoom-in-95 duration-200">
                <CheckCircle2 size={48} className="text-primary animate-bounce" />
                <h3 className="ui-section-title text-on-surface">피드백이 접수되었습니다!</h3>
                <p className="ui-body text-on-surface-variant max-w-xs">
                  보내주신 의견을 면밀히 검토하여 더욱 편리한 원퀴즈로 발전하겠습니다. 감사합니다.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* 분류 선택 */}
                <div className="space-y-1.5">
                  <label className="ui-caption font-semibold text-on-surface block">
                    유형 선택
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {types.map((t) => {
                      const Icon = t.icon;
                      const isSelected = type === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setType(t.id)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg border ui-caption font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-on-primary border-primary shadow-xs"
                              : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                          }`}
                        >
                          <Icon size={14} />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 만족도 별점 */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="ui-caption font-semibold text-on-surface">
                      서비스 만족도
                    </label>
                    <span className="ui-caption text-primary font-bold">
                      {rating}점 / 5점
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          size={22}
                          className={`${
                            star <= rating
                              ? "text-amber-400 fill-amber-400"
                              : "text-on-surface-variant/30"
                          } transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 제목 */}
                <div className="space-y-1">
                  <label className="ui-caption font-semibold text-on-surface block">
                    제목
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="간단한 핵심 요약을 적어주세요..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant ui-body text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary transition-all"
                  />
                </div>

                {/* 상세 내용 */}
                <div className="space-y-1">
                  <label className="ui-caption font-semibold text-on-surface block">
                    상세 내용
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="구체적인 상황이나 원하시는 개선 방향을 자세히 설명해주세요..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-surface-container-low p-3 rounded-lg border border-outline-variant ui-body text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary transition-all resize-none"
                  />
                </div>

                {/* 이메일 (비로그인 시) */}
                {!session?.user?.email && (
                  <div className="space-y-1">
                    <label className="ui-caption font-semibold text-on-surface block">
                      답변 받을 이메일 (선택)
                    </label>
                    <input
                      type="email"
                      placeholder="reply@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface-container-low px-3 py-2 rounded-lg border border-outline-variant ui-body text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                )}

                {/* 제출 버튼 */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-lg border border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface ui-button transition-colors cursor-pointer"
                  >
                    취소
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-on-primary ui-button font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>전송 중...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>피드백 전송</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
