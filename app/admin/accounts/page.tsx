"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Shield, Search, UserCheck } from "lucide-react";
import Image from "next/image";
import { useMounted } from "@/lib/hooks/useMounted";
import { toast } from "@/lib/toast";

interface UserType {
  _id: string;
  email: string;
  name?: string;
  image?: string;
  role: "admin" | "user";
  lastLoginAt: string;
}

export default function AdminAccountsPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const mounted = useMounted();

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      console.error("Failed to fetch users");
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/users");
        if (res.ok && !ignore) {
          const data = await res.json();
          setUsers(data);
        }
      } catch {
        console.error("Failed to fetch users");
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (
      !confirm(
        `이 사용자의 권한을 [${newRole === "admin" ? "관리자" : "일반 유저"}](으)로 변경하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, role: newRole }),
      });

      if (res.ok) {
        fetchUsers();
        toast.success(`사용자 권한이 [${newRole === "admin" ? "관리자" : "일반 유저"}](으)로 변경되었습니다.`);
      } else {
        toast.error("권한 변경에 실패했습니다.");
      }
    } catch {
      toast.error("서버 통신 오류가 발생했습니다.");
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name && u.name.toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.length - adminCount;

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      {/* 1. 상단 통계 요약 카드 (settings 스타일) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
          <p className="text-[10px] text-on-surface-variant font-medium">전체 회원</p>
          <p className="text-base font-bold text-on-surface font-mono mt-0.5">{users.length}명</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
          <p className="text-[10px] text-on-surface-variant font-medium">관리자</p>
          <p className="text-base font-bold text-primary font-mono mt-0.5">{adminCount}명</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 col-span-2 sm:col-span-1">
          <p className="text-[10px] text-on-surface-variant font-medium">일반 회원</p>
          <p className="text-base font-bold text-on-surface font-mono mt-0.5">{userCount}명</p>
        </div>
      </div>

      {/* 2. 유저 목록 관리 카드 (settings 스타일) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-outline-variant pb-3">
          <div>
            <h2 className="font-semibold text-xs text-on-surface">회원 목록 및 권한 설정</h2>
            <p className="text-xs text-on-surface-variant font-light mt-0.5">
              플랫폼에 등록된 사용자의 권한을 즉시 관리합니다.
            </p>
          </div>

          {/* 검색창 */}
          <div className="relative w-full sm:w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="이름, 이메일 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary font-light"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-xs text-on-surface-variant font-light">
            검색 결과 또는 등록된 회원이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[560px]">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant font-medium text-[11px]">
                  <th className="py-2.5 px-3">사용자</th>
                  <th className="py-2.5 px-3">이메일</th>
                  <th className="py-2.5 px-3">권한</th>
                  <th className="py-2.5 px-3">최근 로그인</th>
                  <th className="py-2.5 px-3 text-right">권한 변경</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 font-light">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {u.image ? (
                          <Image
                            src={u.image}
                            alt=""
                            width={24}
                            height={24}
                            unoptimized
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-surface-container text-on-surface flex items-center justify-center font-bold text-[10px] shrink-0 border border-outline-variant">
                            {u.name?.[0] || "U"}
                          </div>
                        )}
                        <span className="font-medium text-on-surface truncate max-w-[120px]">
                          {u.name || "이름 없음"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant font-mono text-[11px]">
                      {u.email}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium inline-flex items-center gap-1 border ${
                          u.role === "admin"
                            ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                            : "bg-surface-container-low text-on-surface-variant border-outline-variant"
                        }`}
                      >
                        {u.role === "admin" ? <Shield size={10} /> : <UserCheck size={10} />}
                        {u.role === "admin" ? "관리자" : "일반 회원"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant font-mono text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("ko-KR") : "-"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleToggleRole(u._id, u.role)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                          u.role === "admin"
                            ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            : "border-primary/40 text-primary hover:bg-primary/10"
                        }`}
                      >
                        {u.role === "admin" ? "일반으로 전환" : "관리자 임명"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
