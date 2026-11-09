"use client";

import { useState } from "react";
import {
  Users,
  UserCheck,
  Share2,
  Copy,
  Check,
  Send,
  Plus,
  Trash2,
  DollarSign,
  HeartHandshake,
  MessageSquare,
  Sparkles,
} from "lucide-react";

interface Props {
  scope: "personal" | "group";
  onToggleScope: (newScope: "personal" | "group") => void;
}

export function FinanceGroupTab({ scope, onToggleScope }: Props) {
  // 더치페이 N빵 계산기 상태
  const [totalBill, setTotalBill] = useState<number>(75000);
  const [payerName, setPayerName] = useState<string>("나 (결제자)");
  const [members, setMembers] = useState<string[]>([
    "나 (결제자)",
    "김민준",
    "이서연",
    "박지훈",
  ]);
  const [newMemberName, setNewMemberName] = useState("");
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // 멤버 추가 / 삭제
  const handleAddMember = () => {
    const trimmed = newMemberName.trim();
    if (trimmed && !members.includes(trimmed)) {
      setMembers([...members, trimmed]);
      setNewMemberName("");
    }
  };

  const handleRemoveMember = (idx: number) => {
    if (members.length <= 2) {
      alert("최소 2명 이상이어야 정산이 가능합니다.");
      return;
    }
    setMembers(members.filter((_, i) => i !== idx));
  };

  // N빵 계산
  const memberCount = members.length;
  const splitAmount = memberCount > 0 ? Math.round(totalBill / memberCount) : 0;

  // 카카오페이/토스 정산 텍스트 생성
  const shareMessage = `[원퀴즈 더치페이 정산]
총 결제금액: ₩${totalBill.toLocaleString()} (${memberCount}명)
결제자: ${payerName}
------------------------
👉 1인당 보낼 금액: ₩${splitAmount.toLocaleString()}원
토스/카카오페이로 편하게 송금해주세요!`;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(shareMessage);
    setCopiedType("message");
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleCopyTossLink = () => {
    const tossUrl = `supertoss://send?amount=${splitAmount}`;
    navigator.clipboard.writeText(tossUrl);
    setCopiedType("toss");
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* 1. 개인 ↔ 그룹 가계부 스위칭 배너 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="ui-card-title text-base font-bold text-on-surface">
                {scope === "group" ? "👥 공유 / 그룹 가계부 모드" : "👤 개인 단독 가계부 모드"}
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  scope === "group"
                    ? "bg-primary text-on-primary shadow-xs"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {scope === "group" ? "그룹 공유 활성" : "개인 전용"}
              </span>
            </div>
            <p className="ui-caption text-xs text-on-surface-variant mt-1 leading-relaxed">
              {scope === "group"
                ? "모임, 커플, 부부, 스터디원과 공동 경비 및 정산 내역을 투명하게 공유합니다."
                : "나만의 독립적인 수입·지출을 비공개로 안전하게 기록합니다."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggleScope(scope === "personal" ? "group" : "personal")}
          className="px-4 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs sm:text-sm hover:opacity-95 shadow-xs cursor-pointer transition-all active:scale-[0.98] shrink-0"
        >
          {scope === "personal" ? "👥 그룹 가계부로 전환" : "👤 개인 가계부로 전환"}
        </button>
      </div>

      {/* 2. 스마트 N분의 1 더치페이(Dutch Pay) 계산기 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="ui-card-title text-base font-bold text-on-surface">
                스마트 N분의 1 (더치페이) 정산 계산기
              </h3>
              <p className="ui-caption text-xs text-on-surface-variant">
                모임 지출을 인원수대로 계산하고 카카오페이/토스 송금 요청 메시지를 즉시 생성합니다
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 좌측 입력 폼 */}
          <div className="space-y-4 text-xs sm:text-sm">
            {/* 총 결제 금액 */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                총 결제 금액 (원)
              </label>
              <input
                type="number"
                value={totalBill}
                onChange={(e) => setTotalBill(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl font-mono text-base font-extrabold text-on-surface focus:outline-hidden focus:border-primary"
              />
            </div>

            {/* 결제자 이름 */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                선결제자 (받을 사람)
              </label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-on-surface focus:outline-hidden focus:border-primary font-semibold"
              />
            </div>

            {/* 정산 참여 멤버 */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                정산 참여자 ({memberCount}명)
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                  placeholder="참여자 이름 입력 후 추가"
                  className="flex-1 px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-hidden focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="px-3 py-1.5 bg-primary text-on-primary font-bold rounded-xl text-xs cursor-pointer hover:opacity-90"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* 멤버 칩 목록 */}
              <div className="flex flex-wrap gap-1.5">
                {members.map((m, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/60"
                  >
                    <span>{m}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(idx)}
                      className="text-on-surface-variant hover:text-rose-500 cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 우측 정산 계산 결과 & 메시지 복사 */}
          <div className="bg-surface-container-low border border-outline-variant/60 rounded-2xl p-4 flex flex-col justify-between space-y-4">
            <div>
              <div className="text-xs font-semibold text-on-surface-variant">
                1인당 분할 정산 금액
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-primary mt-1">
                ₩{splitAmount.toLocaleString()}원
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                총 ₩{totalBill.toLocaleString()}원을 {memberCount}명이서 균등하게 부담합니다.
              </p>
            </div>

            {/* 공유 메시지 프리뷰 박스 */}
            <div className="p-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-xs font-mono text-on-surface space-y-1">
              <div className="font-bold text-primary flex items-center gap-1">
                <MessageSquare size={13} /> 정산 안내 메시지
              </div>
              <div className="text-[11px] text-on-surface-variant whitespace-pre-line leading-relaxed">
                {shareMessage}
              </div>
            </div>

            {/* 클립보드 복사 버튼 그룹 */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex-1 py-2 px-3 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 shadow-xs cursor-pointer active:scale-[0.98]"
              >
                {copiedType === "message" ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedType === "message" ? "복사 완료!" : "정산 메시지 복사"}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyTossLink}
                className="py-2 px-3 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-sky-500/20 cursor-pointer"
                title="토스 송금 링크 복사"
              >
                {copiedType === "toss" ? <Check size={14} /> : <Share2 size={14} />}
                <span>토스 송금 링크</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
