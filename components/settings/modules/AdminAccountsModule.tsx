"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Users, RefreshCw, Search, X, Loader2, ShieldCheck } from "lucide-react";
import { GoogleIcon, KakaoIcon } from "../common/AuthIcons";
import { useSettings } from "../SettingsContext";
import { toast } from "@/lib/toast";

export interface UserAccountType {
  _id: string;
  email: string;
  name?: string;
  image?: string;
  role: "admin" | "user";
  provider?: string;
  providerAccountId?: string;
  lastLoginAt?: string;
}

/**
 * 🌟 회원 인증 방식(Provider) 판별 헬퍼
 * 1. DB의 provider 필드 ('google' | 'kakao')
 * 2. 프로필 이미지 URL (kakaocdn.net vs googleusercontent.com)
 * 3. providerAccountId 형식 (카카오는 고유 숫자 ID 형식)
 * 4. 이메일 도메인 (@kakao.com, @daum.net 등)
 */
export function getAuthProvider(user: Partial<UserAccountType>): "google" | "kakao" {
  if (user.provider) {
    const p = user.provider.toLowerCase();
    if (p.includes("kakao")) return "kakao";
    if (p.includes("google")) return "google";
  }

  if (user.image) {
    const img = user.image.toLowerCase();
    if (img.includes("kakaocdn.net") || img.includes("kakao")) return "kakao";
    if (img.includes("googleusercontent.com") || img.includes("google")) return "google";
  }

  if (user.providerAccountId) {
    if (/^\d{6,14}$/.test(user.providerAccountId)) {
      return "kakao";
    }
  }

  if (user.email) {
    const email = user.email.toLowerCase();
    if (
      email.endsWith("@kakao.com") ||
      email.endsWith("@daum.net") ||
      email.endsWith("@hanmail.net")
    ) {
      return "kakao";
    }
  }

  return "google";
}

export function AdminAccountsModule() {
  const { data: session } = useSession();
  const { markSaved, setSaveStatus } = useSettings();

  const [adminUsers, setAdminUsers] = useState<UserAccountType[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserAccountType | null>(null);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "google" | "kakao" | "admin">("all");
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const fetchAdminUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAdminUsers(data);
        }
      }
    } catch {
      toast.error("사용자 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/users");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setAdminUsers(data);
          }
        }
      } catch {
        if (!ignore) toast.error("사용자 목록을 불러오지 못했습니다.");
      } finally {
        if (!ignore) setIsLoadingUsers(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // 회원 권한(Role) 변경
  const handleToggleUserRole = async (userId: string, currentRole: "admin" | "user") => {
    const targetRole = currentRole === "admin" ? "user" : "admin";
    const confirmMsg =
      targetRole === "admin"
        ? "해당 사용자를 관리자로 승격하시겠습니까?"
        : "해당 사용자의 관리자 권한을 회수하시겠습니까?";

    if (!confirm(confirmMsg)) return;

    setSaveStatus("saving");
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: userId, role: targetRole }),
      });

      if (res.ok) {
        setAdminUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, role: targetRole } : u))
        );
        markSaved();
        toast.success(
          `권한이 '${targetRole === "admin" ? "관리자" : "일반 유저"}'(으)로 변경되었습니다.`
        );
      } else {
        setSaveStatus("error");
        toast.error("권한 변경 실패");
      }
    } catch {
      setSaveStatus("error");
      toast.error("서버 통신 실패");
    }
  };

  // 통계 계산
  const adminUsersCount = useMemo(
    () => adminUsers.filter((u) => u.role === "admin").length,
    [adminUsers]
  );
  const regularUsersCount = useMemo(
    () => adminUsers.filter((u) => u.role === "user").length,
    [adminUsers]
  );
  const googleUsersCount = useMemo(
    () => adminUsers.filter((u) => getAuthProvider(u) === "google").length,
    [adminUsers]
  );
  const kakaoUsersCount = useMemo(
    () => adminUsers.filter((u) => getAuthProvider(u) === "kakao").length,
    [adminUsers]
  );

  // 실시간 사용자 검색 및 필터링
  const filteredAdminUsers = useMemo(() => {
    let list = adminUsers;

    if (activeFilter === "google") {
      list = list.filter((u) => getAuthProvider(u) === "google");
    } else if (activeFilter === "kakao") {
      list = list.filter((u) => getAuthProvider(u) === "kakao");
    } else if (activeFilter === "admin") {
      list = list.filter((u) => u.role === "admin");
    }

    if (!searchUserQuery.trim()) return list;
    const q = searchUserQuery.toLowerCase().trim();
    return list.filter((u) => {
      const provider = getAuthProvider(u);
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        provider.includes(q) ||
        (q === "카카오" && provider === "kakao") ||
        (q === "구글" && provider === "google")
      );
    });
  }, [adminUsers, activeFilter, searchUserQuery]);

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 space-y-4">
      {/* 1. 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <h2 className="ui-section-title text-on-surface">사용자 계정 및 권한 관리</h2>
            <p className="ui-caption text-on-surface-variant font-light">
              전체 가입자 {adminUsers.length}명 (Google {googleUsersCount}명 · Kakao {kakaoUsersCount}명 · 일반 {regularUsersCount}명 · 관리자 {adminUsersCount}명)
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminUsers}
          disabled={isLoadingUsers}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface ui-caption font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={12} className={isLoadingUsers ? "animate-spin text-primary" : ""} />
          <span>새로고침</span>
        </button>
      </div>

      {/* 2. 검색창 & 인증방식/권한 필터 탭 */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          />
          <input
            type="text"
            placeholder="이메일, 이름, 또는 인증방식(Google, Kakao)으로 사용자 검색..."
            value={searchUserQuery}
            onChange={(e) => setSearchUserQuery(e.target.value)}
            className="w-full bg-surface-container-low pl-9 pr-9 py-2 rounded-md border border-outline-variant ui-body text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-all"
          />
          {searchUserQuery && (
            <button
              onClick={() => setSearchUserQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5 cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* 필터 세그먼트 버튼 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              activeFilter === "all"
                ? "bg-surface-container-high border-outline-variant text-on-surface"
                : "bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <span>전체</span>
            <span className="font-mono text-[11px] opacity-80">{adminUsers.length}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("google")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              activeFilter === "google"
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <GoogleIcon className="w-3.5 h-3.5" />
            <span>Google</span>
            <span className="font-mono text-[11px] opacity-80">{googleUsersCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("kakao")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              activeFilter === "kakao"
                ? "bg-[#FEE500]/25 border-[#FEE500]/50 text-[#855900] dark:text-[#FEE500]"
                : "bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <KakaoIcon className="w-3.5 h-3.5 text-[#3C1E1E] dark:text-[#FEE500]" />
            <span>Kakao</span>
            <span className="font-mono text-[11px] opacity-80">{kakaoUsersCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("admin")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              activeFilter === "admin"
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-surface-container-low border-outline-variant/60 text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <ShieldCheck size={13} className="text-primary" />
            <span>관리자</span>
            <span className="font-mono text-[11px] opacity-80">{adminUsersCount}</span>
          </button>
        </div>
      </div>

      {/* 3. 사용자 카드 그리드 */}
      {isLoadingUsers ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ui-caption text-on-surface-variant">사용자 목록 불러오는 중...</span>
        </div>
      ) : filteredAdminUsers.length === 0 ? (
        <div className="py-12 text-center text-on-surface-variant text-xs bg-surface-container-low/30 rounded-lg border border-dashed border-outline-variant">
          일치하는 사용자가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAdminUsers.map((u) => {
            const provider = getAuthProvider(u);

            return (
              <div
                key={u._id}
                onClick={() => setSelectedUser(u)}
                className="p-3.5 rounded-lg bg-surface-container-low/60 hover:bg-surface-container-low border border-outline-variant hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between gap-3 group shadow-xs"
              >
                <div className="flex items-start gap-3">
                  {u.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={u.image}
                      alt={u.name || u.email}
                      className="w-10 h-10 rounded-full object-cover border border-outline-variant shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 text-sm">
                      {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-on-surface truncate ui-card-title group-hover:text-primary transition-colors">
                        {u.name || "학습자"}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* 🌟 인증 방식 뱃지 (Google vs Kakao) */}
                        {provider === "kakao" ? (
                          <span
                            className="ui-badge px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEE500]/25 text-[#855900] dark:text-[#FEE500] border border-[#FEE500]/40 flex items-center gap-1 shadow-2xs"
                            title="Kakao 계정 인증"
                          >
                            <KakaoIcon className="w-2.5 h-2.5 text-[#3C1E1E] dark:text-[#FEE500]" />
                            <span>카카오</span>
                          </span>
                        ) : (
                          <span
                            className="ui-badge px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant flex items-center gap-1 shadow-2xs"
                            title="Google 계정 인증"
                          >
                            <GoogleIcon className="w-2.5 h-2.5" />
                            <span>Google</span>
                          </span>
                        )}

                        {/* 권한 뱃지 */}
                        <span
                          className={`ui-badge px-1.5 py-0.5 rounded text-[10px] shrink-0 font-bold ${
                            u.role === "admin"
                              ? "bg-primary/15 text-primary border border-primary/30"
                              : "bg-surface-container text-on-surface-variant border border-outline-variant/60"
                          }`}
                        >
                          {u.role === "admin" ? "관리자" : "일반"}
                        </span>
                      </div>
                    </div>

                    <p className="ui-caption text-on-surface-variant truncate font-mono text-[11px] mt-0.5">
                      {u.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/50 ui-caption text-on-surface-variant">
                  <span>
                    최근:{" "}
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                        })
                      : "-"}
                  </span>
                  <span className="text-primary text-[11px] font-medium group-hover:underline flex items-center gap-0.5">
                    상세보기 &gt;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. 사용자 상세 모달 (UserDetailModal) */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 w-full max-w-md space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Users size={16} />
                </div>
                <h3 className="ui-card-title text-on-surface font-bold">사용자 상세 정보</h3>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* 프로필 대형 카드 */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-lg bg-surface-container-low border border-outline-variant">
              {selectedUser.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedUser.image}
                  alt={selectedUser.name || selectedUser.email}
                  className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/40 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center shrink-0 border border-primary/20">
                  {selectedUser.name
                    ? selectedUser.name[0].toUpperCase()
                    : selectedUser.email[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-base font-bold text-on-surface truncate">
                    {selectedUser.name || "학습자"}
                  </h4>

                  {/* 모달 상단 인증방식 뱃지 */}
                  {getAuthProvider(selectedUser) === "kakao" ? (
                    <span className="ui-badge px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEE500]/25 text-[#855900] dark:text-[#FEE500] border border-[#FEE500]/40 flex items-center gap-1">
                      <KakaoIcon className="w-2.5 h-2.5 text-[#3C1E1E] dark:text-[#FEE500]" />
                      <span>Kakao</span>
                    </span>
                  ) : (
                    <span className="ui-badge px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container text-on-surface-variant border border-outline-variant flex items-center gap-1">
                      <GoogleIcon className="w-2.5 h-2.5" />
                      <span>Google</span>
                    </span>
                  )}

                  <span
                    className={`ui-badge px-2 py-0.5 rounded text-[11px] font-bold ${
                      selectedUser.role === "admin"
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-surface-container text-on-surface-variant border border-outline-variant"
                    }`}
                  >
                    {selectedUser.role === "admin" ? "관리자" : "일반 유저"}
                  </span>
                </div>
                <p className="ui-caption font-mono text-on-surface-variant truncate mt-0.5">
                  {selectedUser.email}
                </p>
              </div>
            </div>

            {/* 계정 메타데이터 목록 */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-container-low/60 border border-outline-variant/60">
                <span className="text-on-surface-variant">고유 식별자 (ID)</span>
                <span className="font-mono text-on-surface text-[11px] truncate max-w-[200px]">
                  {selectedUser._id}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-container-low/60 border border-outline-variant/60">
                <span className="text-on-surface-variant">최근 접속 일시</span>
                <span className="font-medium text-on-surface">
                  {selectedUser.lastLoginAt
                    ? new Date(selectedUser.lastLoginAt).toLocaleString("ko-KR")
                    : "접속 기록 없음"}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-container-low/60 border border-outline-variant/60">
                <span className="text-on-surface-variant">인증 방식</span>
                {getAuthProvider(selectedUser) === "kakao" ? (
                  <span className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#FEE500] flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                      <KakaoIcon className="w-2.5 h-2.5 text-[#191919]" />
                    </span>
                    <span>Kakao OAuth 연동 계정</span>
                  </span>
                ) : (
                  <span className="font-semibold text-xs text-on-surface flex items-center gap-1.5">
                    <GoogleIcon className="w-4 h-4" />
                    <span>Google OAuth 연동 계정</span>
                  </span>
                )}
              </div>
            </div>

            {/* 권한 변경 제어 */}
            <div className="pt-2 border-t border-outline-variant space-y-2">
              <label className="ui-caption font-semibold text-on-surface block">권한 관리</label>
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <div>
                  <p className="ui-card-title text-on-surface">
                    {selectedUser.role === "admin" ? "관리자 권한 보유" : "일반 사용자 권한"}
                  </p>
                  <p className="ui-caption text-on-surface-variant font-light">
                    {selectedUser.role === "admin"
                      ? "문항 관리, 시스템 운영 설정, 전체 감사 로그에 접근 가능합니다."
                      : "기본 학습 및 모의고사 기능만 이용 가능합니다."}
                  </p>
                </div>
                {selectedUser.email === session?.user?.email ? (
                  <span className="ui-badge px-2 py-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs shrink-0">
                    본인 계정
                  </span>
                ) : (
                  <button
                    onClick={async () => {
                      const targetRole = selectedUser.role === "admin" ? "user" : "admin";
                      await handleToggleUserRole(selectedUser._id, selectedUser.role);
                      setSelectedUser((prev) => (prev ? { ...prev, role: targetRole } : null));
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 cursor-pointer transition-colors ${
                      selectedUser.role === "admin"
                        ? "bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant"
                        : "bg-primary text-on-primary hover:opacity-90 shadow-xs"
                    }`}
                  >
                    {selectedUser.role === "admin" ? "일반 유저로 변경" : "관리자로 승격"}
                  </button>
                )}
              </div>
            </div>

            {/* 닫기 버튼 */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-1.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface ui-caption font-medium transition-colors cursor-pointer border border-outline-variant"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
