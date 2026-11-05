"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck, MessageSquare, Send } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "peer";
  text: string;
  time: string;
}

export function ChatView() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "학습자";

  const [activeChannel, setActiveChannel] = useState("원퀴즈 스터디 라운지");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const now = new Date();
    const timeStr = `${now.getHours() < 12 ? "오전" : "오후"} ${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputText.trim(),
      time: timeStr,
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");

    // Simulated peer echo response
    setTimeout(() => {
      const echoMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "peer",
        text: "좋은 의견입니다! 오답 노트를 원퀴즈 일기장에 기록해 두시면 복습할 때 훨씬 기억에 잘 남습니다.",
        time: timeStr,
      };
      setMessages((prev) => [...prev, echoMsg]);
    }, 1000);
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* 상단 헤더 (라운딩 박스 없이 플랫 헤더) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="ui-page-title">
              스터디 채팅
            </h1>
            <span className="ui-badge inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container text-primary border border-outline-variant">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              보안 연결
            </span>
          </div>
          <p className="ui-page-subtitle mt-0.5">
            원퀴즈 스터디 동료들과 실시간으로 질의응답을 나누고 학습 팁을 공유하세요.
          </p>
        </div>
      </div>

      <div className="w-full bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs flex flex-col md:flex-row overflow-hidden h-[620px]">
        {/* Left Channels List */}
        <div className="w-full md:w-72 bg-surface-container-low/40 border-r border-outline-variant flex flex-col justify-between shrink-0">
          <div className="p-space-md flex flex-col gap-2">
            <span className="font-label-sm font-bold text-on-surface-variant px-1">대화 채널</span>
            {["원퀴즈 스터디 라운지", "정보처리기사 Q&A", "알고리즘 코테방"].map((ch) => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-body-sm text-left transition-colors ${
                  activeChannel === ch
                    ? "bg-surface-container-lowest text-on-surface font-bold shadow-xs border border-outline-variant"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="truncate">{ch}</span>
              </button>
            ))}
          </div>

          <div className="p-space-md border-t border-outline-variant flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[12px]">
              {userName[0]}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-sm font-semibold text-on-surface truncate">{userName}</span>
              <span className="text-[10px] text-emerald-500 font-medium">온라인</span>
            </div>
          </div>
        </div>

        {/* Right Chat Conversation Box */}
        <div className="flex-1 flex flex-col justify-between h-full bg-surface-container-lowest">
          {/* Chat Channel Header */}
          <div className="p-space-md border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm font-bold text-on-surface">{activeChannel}</span>
              <span className="text-caption text-on-surface-variant">· 4명 참여 중</span>
            </div>
          </div>

          {/* Messages Flow */}
          <div className="flex-1 p-space-md overflow-y-auto flex flex-col gap-space-sm">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-on-surface-variant">
                <MessageSquare className="w-10 h-10 opacity-30 mb-2 text-primary" />
                <p className="text-sm font-semibold text-on-surface">대화 내역이 없습니다</p>
                <p className="text-xs text-on-surface-variant font-light mt-1">
                  &quot;{activeChannel}&quot;에 첫 메시지를 보내 스터디원들과 대화를 시작해보세요.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span className="font-label-sm text-[11px] font-semibold text-on-surface-variant">
                        {isMe ? userName : "스터디 멘토"}
                      </span>
                      <span className="text-[10px] text-on-surface-variant opacity-70">{m.time}</span>
                    </div>
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-body-sm leading-relaxed ${
                        isMe
                          ? "bg-primary text-on-primary rounded-tr-xs shadow-xs"
                          : "bg-surface-container-low text-on-surface rounded-tl-xs border border-outline-variant"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSend}
            className="p-space-md border-t border-outline-variant flex items-center gap-2 bg-surface-container-lowest"
          >
            <input
              type="text"
              placeholder="메시지를 입력하세요 (Enter로 전송)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-surface-container-low px-4 py-2.5 rounded-xl border border-outline-variant text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-primary text-on-primary hover:opacity-90 transition-opacity shrink-0 flex items-center justify-center shadow-xs"
              title="전송"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
