"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users,
  KeyRound,
  Copy,
  Share2,
  MessageSquare,
  Send,
  Plus,
  ArrowLeft,
  Trash2,
  Hash,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface GroupMember {
  email: string;
  name: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

interface SharedItem {
  type: "quiz" | "note" | "calendar" | "canvas";
  title: string;
  link: string;
  sharedBy: string;
  createdAt: string;
}

interface GroupDetail {
  _id: string;
  name: string;
  description: string;
  ownerEmail: string;
  ownerName: string;
  inviteCode: string;
  category: string;
  members: GroupMember[];
  sharedItems: SharedItem[];
  channels: string[];
}

interface ChatMsg {
  _id: string;
  channelName: string;
  senderEmail: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export function GroupDetailView({ groupId }: { groupId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [activeTab, setActiveTab] = useState<"shared" | "chat" | "members">("shared");
  const [activeChannel, setActiveChannel] = useState("일반");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 자료 공유 모달 상태
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareType, setShareType] = useState<"quiz" | "note" | "calendar" | "canvas">("quiz");
  const [shareTitle, setShareTitle] = useState("");
  const [shareLink, setShareLink] = useState("/exam");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. 그룹 정보 로드
  useEffect(() => {
    let ignore = false;
    async function loadGroup() {
      try {
        const res = await fetch(`/api/groups/${groupId}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setGroup(data.group);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    loadGroup();
    return () => {
      ignore = true;
    };
  }, [groupId]);

  // 2. 채팅 메시지 로드 (채널 변경 시)
  useEffect(() => {
    let ignore = false;
    async function loadMessages() {
      try {
        const res = await fetch(`/api/chat?groupId=${groupId}&channel=${activeChannel}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error(err);
      }
    }
    if (activeTab === "chat") {
      loadMessages();
    }
    return () => {
      ignore = true;
    };
  }, [groupId, activeChannel, activeTab]);

  // 채팅 스크롤 하단 이동
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 채팅 전송
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const payload = {
      groupId,
      channelName: activeChannel,
      content: inputText.trim(),
    };

    setInputText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      }
    } catch {
      toast.error("메시지 전송에 실패했습니다.");
    }
  };

  // 학습 자료 공유 등록
  const handleShareItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareTitle.trim()) {
      toast.error("자료 제목을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch(`/api/groups/${groupId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: shareType,
          title: shareTitle.trim(),
          link: shareLink.trim(),
        }),
      });

      if (res.ok) {
        toast.success("스터디 자료가 그룹에 공유되었습니다!");
        setIsShareModalOpen(false);
        setShareTitle("");
        const refreshed = await fetch(`/api/groups/${groupId}`);
        if (refreshed.ok) {
          const data = await refreshed.json();
          setGroup(data.group);
        }
      }
    } catch {
      toast.error("공유에 실패했습니다.");
    }
  };

  // 초대코드 복사
  const handleCopyInviteCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    toast.success(`초대코드 '${group.inviteCode}'가 복사되었습니다! 팀원에게 공유하세요.`);
  };

  // 그룹 삭제 (그룹장 또는 관리자)
  const handleDeleteGroup = async () => {
    if (
      !confirm(
        "정말로 이 스터디 그룹을 삭제하시겠습니까? 등록된 모든 자료와 채팅 내역이 영구 삭제됩니다."
      )
    )
      return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("스터디 그룹이 성공적으로 삭제되었습니다.");
        router.push("/groups");
      } else {
        const data = await res.json();
        toast.error(data.error || "그룹 삭제 실패");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-on-surface-variant">
        그룹 정보를 불러오는 중...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="ui-body text-on-surface">그룹을 찾을 수 없습니다.</p>
        <Link href="/groups" className="text-primary text-xs underline">
          그룹 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* ================= 1. 그룹 헤더 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/groups"
              className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="ui-page-title text-on-surface">{group.name}</h1>
            <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              {group.category}
            </span>
          </div>
          <p className="ui-page-subtitle">{group.description || "함께 공부하는 스터디 그룹입니다."}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* 초대코드 복사 칩 */}
          <button
            onClick={handleCopyInviteCode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface ui-caption font-mono font-bold cursor-pointer transition-colors"
            title="초대코드 복사"
          >
            <KeyRound size={12} className="text-primary" />
            <span>{group.inviteCode}</span>
            <Copy size={11} className="text-on-surface-variant" />
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary font-medium ui-button hover:opacity-90 transition-all cursor-pointer shadow-xs"
          >
            <Plus size={13} />
            <span>기능·자료 공유</span>
          </button>

          {(group.ownerEmail === userEmail || session?.user?.role === "admin") && (
            <button
              onClick={handleDeleteGroup}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-error/10 hover:bg-error/20 border border-error/30 text-error font-medium ui-caption transition-colors cursor-pointer"
              title="스터디 그룹 삭제"
            >
              <Trash2 size={12} />
              <span className="hidden sm:inline">그룹 삭제</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= 2. 탭 내비게이션 ================= */}
      <div className="flex items-center gap-1 border-b border-outline-variant pb-1">
        <button
          onClick={() => setActiveTab("shared")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md ui-body font-medium transition-colors cursor-pointer ${
            activeTab === "shared"
              ? "bg-surface-container text-primary font-semibold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Share2 size={13} />
          <span>공유된 학습 자료</span>
          <span className="ui-badge px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
            {group.sharedItems?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md ui-body font-medium transition-colors cursor-pointer ${
            activeTab === "chat"
              ? "bg-surface-container text-primary font-semibold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <MessageSquare size={13} />
          <span>그룹 채널 채팅</span>
        </button>

        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-md ui-body font-medium transition-colors cursor-pointer ${
            activeTab === "members"
              ? "bg-surface-container text-primary font-semibold"
              : "text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Users size={13} />
          <span>스터디원</span>
          <span className="ui-badge px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface-variant">
            {group.members.length}명
          </span>
        </button>
      </div>

      {/* ================= 3. 탭별 컨텐츠 ================= */}

      {/* [탭 1: 공유된 기능 & 자료] */}
      {activeTab === "shared" && (
        <div className="space-y-3">
          {(!group.sharedItems || group.sharedItems.length === 0) ? (
            <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-xl space-y-2">
              <Share2 size={24} className="mx-auto text-on-surface-variant/50" />
              <p className="ui-body text-on-surface">아직 공유된 학습 자료가 없습니다.</p>
              <p className="ui-caption text-on-surface-variant">
                상단의 [기능·자료 공유] 버튼을 눌러 기출문제 세트, 지식노트, 캘린더 일정을 그룹원들과 나눠보세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.sharedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col justify-between space-y-3 hover:border-primary/50 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="ui-badge px-2 py-0.5 rounded font-bold bg-surface-container text-primary">
                        {item.type === "quiz"
                          ? "📝 기출문제"
                          : item.type === "note"
                          ? "📚 지식노트"
                          : item.type === "calendar"
                          ? "📅 캘린더 일정"
                          : "🎨 아이디어 캔버스"}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">{item.sharedBy} 공유</span>
                    </div>
                    <h4 className="ui-card-title text-on-surface">{item.title}</h4>
                  </div>

                  <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                    <Link
                      href={item.link}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>바로 열기</span>
                      <ExternalLink size={11} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* [탭 2: 그룹 전용 채널 채팅] */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[520px]">
          {/* 채널 목록 사이드바 */}
          <div className="md:col-span-3 bg-surface-container-lowest border border-outline-variant rounded-xl p-2 space-y-1">
            <span className="block px-2 py-1 ui-caption font-bold text-on-surface-variant">
              채널 목록
            </span>
            {group.channels?.map((ch) => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-md ui-body transition-colors cursor-pointer text-left ${
                  activeChannel === ch
                    ? "bg-surface-container text-primary font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <Hash size={13} className="text-on-surface-variant" />
                <span>{ch}</span>
              </button>
            ))}
          </div>

          {/* 채팅 메시지 영역 */}
          <div className="md:col-span-9 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-outline-variant flex items-center justify-between">
              <span className="ui-card-title flex items-center gap-1 text-on-surface">
                <Hash size={14} className="text-primary" />
                {activeChannel}
              </span>
              <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-500" />
                그룹 비공개 암호화
              </span>
            </div>

            {/* 메시지 피드 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant gap-1">
                  <MessageSquare size={20} className="opacity-40" />
                  <span className="ui-caption">#{activeChannel} 채널의 첫 메시지를 남겨보세요!</span>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderEmail === userEmail;
                  return (
                    <div
                      key={m._id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant px-1 mb-0.5">
                        <span className="font-semibold">{m.senderName}</span>
                        <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-xl text-xs ${
                          isMine
                            ? "bg-primary text-on-primary rounded-tr-none"
                            : "bg-surface-container text-on-surface rounded-tl-none border border-outline-variant"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 메시지 입력창 */}
            <form onSubmit={handleSendMessage} className="p-2 border-t border-outline-variant flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`#${activeChannel} 채널에 메시지 입력...`}
                className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-on-surface outline-hidden focus:border-primary"
              />
              <button
                type="submit"
                className="p-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity cursor-pointer shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* [탭 3: 스터디원 목록] */}
      {activeTab === "members" && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-3">
          <h3 className="ui-section-title text-on-surface">그룹 멤버 목록</h3>
          <div className="divide-y divide-outline-variant">
            {group.members.map((m) => (
              <div key={m.email} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center font-bold text-xs text-primary">
                    {m.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="ui-body font-semibold text-on-surface">{m.name}</span>
                      {m.role === "owner" && (
                        <span className="ui-badge px-1.5 py-0.2 rounded bg-primary/10 text-primary font-bold">
                          스터디장
                        </span>
                      )}
                    </div>
                    <span className="ui-caption text-on-surface-variant font-mono">{m.email}</span>
                  </div>
                </div>

                <span className="text-[11px] text-on-surface-variant">
                  {new Date(m.joinedAt).toLocaleDateString()} 가입
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 모달: 자료 공유 ================= */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="ui-section-title text-on-surface flex items-center gap-1.5">
              <Share2 size={16} className="text-primary" />
              학습 기능 & 자료 공유
            </h3>

            <form onSubmit={handleShareItem} className="space-y-3">
              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  공유 유형 *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "quiz", label: "📝 기출문제", defaultLink: "/exam" },
                    { id: "note", label: "📚 지식노트", defaultLink: "/diary" },
                    { id: "calendar", label: "📅 캘린더 일정", defaultLink: "/calendar" },
                    { id: "canvas", label: "🎨 아이디어 캔버스", defaultLink: "/canvas" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setShareType(t.id as "quiz" | "note" | "calendar" | "canvas");
                        setShareLink(t.defaultLink);
                      }}
                      className={`p-2 rounded-md border text-xs font-semibold cursor-pointer transition-colors ${
                        shareType === t.id
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-surface-container-low border-outline-variant text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  자료 제목 *
                </label>
                <input
                  type="text"
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="예: 2026 수제비 실기 핵심 오답노트"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  연결 링크
                </label>
                <input
                  type="text"
                  value={shareLink}
                  onChange={(e) => setShareLink(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface font-mono outline-hidden focus:border-primary"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-surface-container text-on-surface-variant hover:bg-surface-container-high ui-button cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-primary text-on-primary font-medium ui-button hover:opacity-90 cursor-pointer"
                >
                  공유 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
