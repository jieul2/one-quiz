"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Users,
  Plus,
  KeyRound,
  Search,
  Share2,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface GroupData {
  _id: string;
  name: string;
  description: string;
  category: string;
  ownerEmail: string;
  ownerName: string;
  inviteCode: string;
  members: Array<{ email: string; name: string; role: string }>;
  sharedItems: Array<{ type: string; title: string; link: string; sharedBy: string }>;
  createdAt: string;
}

export function GroupListView() {
  const { data: session } = useSession();
  const [myGroups, setMyGroups] = useState<GroupData[]>([]);
  const [publicGroups, setPublicGroups] = useState<GroupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 모달 상태
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("시험대비");

  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [inputInviteCode, setInputInviteCode] = useState("");

  const loadGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setMyGroups(data.myGroups || []);
        setPublicGroups(data.publicGroups || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/groups");
        if (res.ok && !ignore) {
          const data = await res.json();
          setMyGroups(data.myGroups || []);
          setPublicGroups(data.publicGroups || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // 새 그룹 만들기
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      toast.error("그룹 이름을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          category: newGroupCategory,
        }),
      });

      if (res.ok) {
        toast.success("새 스터디 그룹이 생성되었습니다!");
        setIsCreateOpen(false);
        setNewGroupName("");
        setNewGroupDesc("");
        loadGroups();
      } else {
        const err = await res.json();
        toast.error(err.error || "그룹 생성에 실패했습니다.");
      }
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    }
  };

  // 초대 코드로 가입
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputInviteCode.trim()) {
      toast.error("초대 코드를 입력해주세요.");
      return;
    }

    // 대상 그룹 찾기
    const targetGroup = [...publicGroups, ...myGroups].find(
      (g) => g.inviteCode === inputInviteCode.trim().toUpperCase()
    );

    const targetId = targetGroup ? targetGroup._id : inputInviteCode.trim();

    try {
      const res = await fetch(`/api/groups/${targetId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inputInviteCode.trim().toUpperCase() }),
      });

      if (res.ok) {
        toast.success("스터디 그룹에 가입되었습니다!");
        setIsJoinOpen(false);
        setInputInviteCode("");
        loadGroups();
      } else {
        const err = await res.json();
        toast.error(err.error || "초대 코드를 확인해주세요.");
      }
    } catch {
      toast.error("가입 처리 중 오류가 발생했습니다.");
    }
  };

  const filteredMyGroups = myGroups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full space-y-4">
      {/* ================= 1. 상단 플랫 헤더 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="ui-page-title text-on-surface">스터디 그룹 & 협업</h1>
            <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 font-semibold">
              <Users size={11} />
              STUDY GROUP
            </span>
          </div>
          <span className="ui-page-subtitle block mt-0.5">
            동료 학습자들과 그룹을 맺어 기출 오답노트, 캘린더 스터디 일정, 아이디어 캔버스를 공유하고 전용 채널에서 채팅하세요.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsJoinOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-medium ui-button transition-colors cursor-pointer"
          >
            <KeyRound size={13} className="text-primary" />
            <span>초대코드로 가입</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary font-medium ui-button hover:opacity-90 transition-all cursor-pointer shadow-xs"
          >
            <Plus size={13} />
            <span>그룹 만들기</span>
          </button>
        </div>
      </div>

      {/* ================= 2. 검색 바 ================= */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="스터디 그룹 이름 검색..."
          className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-xs text-on-surface placeholder:text-on-surface-variant/60 outline-hidden focus:border-primary transition-colors"
        />
      </div>

      {/* ================= 3. 내가 참여 중인 그룹 ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="ui-section-title flex items-center gap-2 text-on-surface">
            <span>참여 중인 스터디 그룹</span>
            <span className="ui-badge px-1.5 py-0.2 rounded-full bg-surface-container text-primary">
              {filteredMyGroups.length}
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
            <span className="ui-caption text-on-surface-variant">스터디 그룹을 불러오는 중...</span>
          </div>
        ) : filteredMyGroups.length === 0 ? (
          <div className="p-8 text-center bg-surface-container-lowest border border-outline-variant rounded-xl space-y-2">
            <Users size={28} className="mx-auto text-on-surface-variant/50" />
            <p className="ui-body text-on-surface">아직 참여 중인 스터디 그룹이 없습니다.</p>
            <p className="ui-caption text-on-surface-variant">
              새 그룹을 만들거나 팀원의 6자리 초대 코드를 입력하여 가입하세요!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredMyGroups.map((grp) => (
              <Link
                key={grp._id}
                href={`/groups/${grp._id}`}
                className="group p-4 bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant hover:border-primary/50 rounded-xl transition-all shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="ui-badge px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                      {grp.category}
                    </span>
                    <span className="text-[11px] font-mono text-on-surface-variant flex items-center gap-1">
                      <KeyRound size={10} />
                      {grp.inviteCode}
                    </span>
                  </div>

                  <h3 className="ui-card-title text-on-surface group-hover:text-primary transition-colors">
                    {grp.name}
                  </h3>

                  <p className="ui-caption text-on-surface-variant line-clamp-2">
                    {grp.description || "함께 공부하고 학습 자료를 공유하는 스터디 그룹입니다."}
                  </p>
                </div>

                <div className="pt-3 border-t border-outline-variant mt-3 flex items-center justify-between text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {grp.members.length}명 참여중
                  </span>
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <Share2 size={12} />
                    자료 {grp.sharedItems?.length || 0}개 공유됨
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ================= 4. 공개 추천 스터디 그룹 ================= */}
      <div className="space-y-3 pt-3">
        <h2 className="ui-section-title text-on-surface">추천 스터디 그룹 탐색</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {publicGroups.map((grp) => {
            const isJoined = grp.members.some((m) => m.email === session?.user?.email);
            return (
              <div
                key={grp._id}
                className="p-4 bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="ui-badge px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
                      {grp.category}
                    </span>
                    <span className="text-[11px] text-on-surface-variant">{grp.ownerName}</span>
                  </div>
                  <h4 className="ui-card-title text-on-surface mt-1.5">{grp.name}</h4>
                  <p className="ui-caption text-on-surface-variant mt-1 line-clamp-2">
                    {grp.description || "원퀴즈 학습자들의 자유 스터디 모임입니다."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant">
                  <span className="text-xs text-on-surface-variant">{grp.members.length}명 참여</span>
                  {isJoined ? (
                    <Link
                      href={`/groups/${grp._id}`}
                      className="px-2.5 py-1 rounded bg-surface-container text-primary font-semibold text-xs hover:bg-surface-container-high transition-colors"
                    >
                      입장하기 →
                    </Link>
                  ) : (
                    <button
                      onClick={() => {
                        setInputInviteCode(grp.inviteCode);
                        setIsJoinOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-primary text-on-primary font-semibold text-xs hover:opacity-90 transition-all cursor-pointer"
                    >
                      가입하기
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= 모달: 그룹 생성 ================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="ui-section-title text-on-surface">새 스터디 그룹 만들기</h3>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  그룹 이름 *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="예: 2026 정보처리기사 실기 합격반"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  카테고리
                </label>
                <select
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary"
                >
                  <option value="시험대비">시험대비</option>
                  <option value="자격증">자격증</option>
                  <option value="코딩/개발">코딩/개발</option>
                  <option value="자율스터디">자율스터디</option>
                </select>
              </div>

              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  그룹 소개
                </label>
                <textarea
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="스터디 목표와 운영 방식을 간략히 소개해주세요."
                  className="w-full px-3 py-2 h-20 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-surface-container text-on-surface-variant hover:bg-surface-container-high ui-button cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-primary text-on-primary font-medium ui-button hover:opacity-90 cursor-pointer"
                >
                  생성하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 모달: 초대 코드로 가입 ================= */}
      {isJoinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="ui-section-title text-on-surface flex items-center gap-1.5">
              <KeyRound size={16} className="text-primary" />
              초대 코드로 그룹 가입
            </h3>
            <p className="ui-caption text-on-surface-variant">
              스터디장에게 공유받은 6자리 영숫자 초대 코드를 입력하세요.
            </p>

            <form onSubmit={handleJoinByCode} className="space-y-3">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={inputInviteCode}
                  onChange={(e) => setInputInviteCode(e.target.value.toUpperCase())}
                  placeholder="예: 7G8X2K"
                  className="w-full px-3 py-2.5 bg-surface-container-low border border-outline-variant rounded-md text-center font-mono font-bold text-sm tracking-widest text-on-surface outline-hidden focus:border-primary uppercase"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsJoinOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-surface-container text-on-surface-variant hover:bg-surface-container-high ui-button cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-primary text-on-primary font-medium ui-button hover:opacity-90 cursor-pointer"
                >
                  가입 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
