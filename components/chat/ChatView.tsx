"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ShieldCheck,
  MessageSquare,
  Send,
  Users,
  Hash,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface ChatMessageItem {
  _id: string;
  senderEmail: string;
  senderName: string;
  content: string;
  createdAt: string;
}

interface GroupSummary {
  _id: string;
  name: string;
  category: string;
}

export function ChatView() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  const [activeChannel, setActiveChannel] = useState("전체 라운지");
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [myGroups, setMyGroups] = useState<GroupSummary[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. 내 그룹 목록 조회
  useEffect(() => {
    let ignore = false;
    async function fetchGroups() {
      try {
        const res = await fetch("/api/groups");
        if (res.ok && !ignore) {
          const data = await res.json();
          setMyGroups(data.myGroups || []);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchGroups();
    return () => {
      ignore = true;
    };
  }, []);

  // 2. 메시지 초기 로드 및 실시간 SSE + 폴링 동기화 (A PC -> B PC 즉시 반영)
  useEffect(() => {
    let ignore = false;
    async function loadMessages() {
      try {
        const res = await fetch(`/api/chat?groupId=global&channel=${encodeURIComponent(activeChannel)}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          const list: ChatMessageItem[] = data.messages || [];
          setMessages((prev) => {
            const map = new Map<string, ChatMessageItem>();
            list.forEach((m) => {
              if (m && m._id) map.set(String(m._id), m);
            });
            prev.forEach((m) => {
              if (m && m._id && !map.has(String(m._id))) {
                map.set(String(m._id), m);
              }
            });
            return Array.from(map.values()).sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadMessages();

    // 🌟 A. 실시간 SSE (Server-Sent Events) 연결 수립
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(
        `/api/chat/stream?groupId=global&channel=${encodeURIComponent(activeChannel)}`
      );

      eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.startsWith(":")) return;
          const newMsg = JSON.parse(event.data);
          if (newMsg && newMsg._id) {
            const idStr = String(newMsg._id);
            setMessages((prev) => {
              if (prev.some((m) => String(m._id) === idStr)) return prev;
              return [...prev, newMsg];
            });
          }
        } catch (parseErr) {
          console.error("SSE message parse error:", parseErr);
        }
      };
    } catch (sseErr) {
      console.warn("EventSource not supported or failed to connect:", sseErr);
    }

    // 🌟 B. 3초 주기 보조 폴링 (네트워크 순단 또는 SSE 미지원 환경 대비 안전망)
    const pollInterval = setInterval(() => {
      if (document.hidden) return;
      loadMessages();
    }, 3000);

    return () => {
      ignore = true;
      clearInterval(pollInterval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [activeChannel]);

  // 중복 메시지 키 충돌 100% 방어
  const uniqueMessages = useMemo(() => {
    const map = new Map<string, ChatMessageItem>();
    messages.forEach((m) => {
      if (m && m._id) {
        map.set(String(m._id), m);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uniqueMessages]);

  // 3. 메시지 전송
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const sendingContent = inputText.trim();
    setInputText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: "global",
          channelName: activeChannel,
          content: sendingContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const createdMsg = data.message;
        if (createdMsg && createdMsg._id) {
          const idStr = String(createdMsg._id);
          setMessages((prev) => {
            if (prev.some((m) => String(m._id) === idStr)) return prev;
            return [...prev, createdMsg];
          });
        }
      }
    } catch {
      toast.error("메시지 전송에 실패했습니다.");
    }
  };

  const channels = ["전체 라운지", "기출 풀이 Q&A", "공부 인증", "스터디 모집"];

  return (
    <div className="w-full space-y-4">
      {/* 상단 플랫 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="ui-page-title text-on-surface">스터디 라운지 & 그룹 채팅</h1>
            <span className="ui-badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-primary border border-outline-variant font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              실시간 라운지
            </span>
          </div>
          <p className="ui-page-subtitle block mt-0.5">
            원퀴즈 스터디 동료들과 실시간으로 질의응답을 나누고, 참여 중인 스터디 그룹 전용 채팅방으로 바로 이동하세요.
          </p>
        </div>

        <Link
          href="/groups"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary font-medium ui-button hover:opacity-90 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
        >
          <Users size={13} />
          <span>스터디 그룹 관리</span>
        </Link>
      </div>

      {/* 2열 구조 (채널 + 채팅 화면) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 h-[580px]">
        {/* 좌측 채널 및 소속 그룹 */}
        <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            {/* 1. 공개 라운지 채널 */}
            <div>
              <span className="ui-caption font-bold text-on-surface-variant px-1 block mb-1">
                공개 라운지 채널
              </span>
              <div className="space-y-1">
                {channels.map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setActiveChannel(ch)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg ui-body transition-colors cursor-pointer text-left ${
                      activeChannel === ch
                        ? "bg-surface-container text-primary font-semibold"
                        : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                    }`}
                  >
                    <Hash size={14} className={activeChannel === ch ? "text-primary" : "text-on-surface-variant"} />
                    <span>{ch}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. 내가 참여 중인 스터디 그룹 */}
            <div className="pt-2 border-t border-outline-variant">
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="ui-caption font-bold text-on-surface-variant">
                  내 스터디 그룹 ({myGroups.length})
                </span>
                <Link href="/groups" className="text-[11px] text-primary hover:underline">
                  전체보기
                </Link>
              </div>

              {myGroups.length === 0 ? (
                <div className="p-3 text-center bg-surface-container-low rounded-lg text-xs text-on-surface-variant">
                  참여 중인 스터디 그룹이 없습니다.
                </div>
              ) : (
                <div className="space-y-1">
                  {myGroups.map((g) => (
                    <Link
                      key={g._id}
                      href={`/groups/${g._id}`}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant/60 text-xs transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-secondary" />
                        <span className="font-semibold text-on-surface group-hover:text-primary transition-colors">
                          {g.name}
                        </span>
                      </div>
                      <ExternalLink size={11} className="text-on-surface-variant" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-2.5 bg-surface-container-low rounded-lg text-xs text-on-surface-variant flex items-center gap-2">
            <Sparkles size={14} className="text-primary shrink-0" />
            <span>건전하고 유익한 스터디 문화를 지켜주세요.</span>
          </div>
        </div>

        {/* 우측 채팅 영역 */}
        <div className="md:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col overflow-hidden">
          {/* 채널 헤더 */}
          <div className="px-4 py-3 border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash size={16} className="text-primary" />
              <span className="ui-card-title text-on-surface">{activeChannel}</span>
            </div>
            <span className="text-[11px] text-on-surface-variant">
              {uniqueMessages.length}개 메시지
            </span>
          </div>

          {/* 메시지 스트림 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {uniqueMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant gap-2">
                <MessageSquare size={24} className="opacity-40" />
                <p className="ui-body">#{activeChannel} 채널에 아직 메시지가 없습니다.</p>
                <p className="ui-caption">동료 학습자들에게 인사를 건네보세요!</p>
              </div>
            ) : (
              uniqueMessages.map((msg: ChatMessageItem, idx: number) => {
                const isMine = msg.senderEmail === userEmail;
                return (
                  <div
                    key={msg._id || `msg-${idx}`}
                    className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant px-1 mb-0.5">
                      <span className="font-semibold">{msg.senderName}</span>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div
                      className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                        isMine
                          ? "bg-primary text-on-primary rounded-tr-none shadow-xs"
                          : "bg-surface-container text-on-surface rounded-tl-none border border-outline-variant"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 하단 입력 폼 */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-outline-variant flex items-center gap-2 bg-surface-container-lowest"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`#${activeChannel} 채널에 메시지 입력...`}
              className="flex-1 px-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface outline-hidden focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 bg-primary disabled:opacity-40 text-on-primary rounded-xl hover:opacity-90 transition-opacity cursor-pointer shrink-0 shadow-xs"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
