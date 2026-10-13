"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Users, Shield, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

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
  const [mounted] = useState(true);
  const { theme, setTheme } = useTheme();

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (isMounted) {
          setUsers(data);
        }
      } catch (e) {
        console.error(e);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (
      !confirm(
        `이 유저의 권한을 [${newRole === "admin" ? "관리자" : "일반 유저"}]로 변경하시겠습니까?`,
      )
    )
      return;

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, role: newRole }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        alert("권한 변경에 실패했습니다.");
      }
    } catch (e) {
      alert("서버 오류가 발생했습니다.");
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] p-4 md:p-8 text-gray-800 dark:text-gray-200 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 💡 상단 네비게이션 헤더 (다른 관리자/일기장 페이지와 동일한 반응형 디자인 구조) */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link
              href="/admin"
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
              title="관리자 메인으로"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="overflow-hidden">
              <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white truncate">
                👥 사용자 및 계정 권한 관리
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                플랫폼에 가입/로그인한 계정 목록을 확인하고 관리자 권한을 부여하세요.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-xl text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
              title="테마 변경"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* 유저 목록 테이블 컨테이너 */}
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">
              전체 회원 목록 <span className="text-blue-500 font-extrabold">{users.length}명</span>
            </h2>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">
              등록된 사용자 기록이 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[650px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-400 font-semibold">
                    <th className="py-3 px-3">사용자 정보</th>
                    <th className="py-3 px-3">이메일</th>
                    <th className="py-3 px-3">권한 (Role)</th>
                    <th className="py-3 px-3">최근 로그인</th>
                    <th className="py-3 px-3 text-center">권한 제어</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {users.map((u) => (
                    <tr
                      key={u._id}
                      className="hover:bg-gray-50 dark:hover:bg-[#252526] transition-colors"
                    >
                      <td className="py-3 px-3 flex items-center gap-2.5">
                        {u.image ? (
                          <img
                            src={u.image}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {u.name?.[0] || "U"}
                          </div>
                        )}
                        <span className="font-bold text-gray-900 dark:text-white truncate max-w-[120px]">
                          {u.name || "이름 없음"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600 dark:text-gray-400 break-all max-w-[200px]">
                        {u.email}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 shrink-0 ${
                            u.role === "admin"
                              ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/30"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                          }`}
                        >
                          {u.role === "admin" ? <Shield size={10} /> : null}{" "}
                          {u.role === "admin" ? "관리자" : "유저"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-[11px] whitespace-nowrap">
                        {new Date(u.lastLoginAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleRole(u._id, u.role)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors cursor-pointer shadow-sm whitespace-nowrap ${
                            u.role === "admin"
                              ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                              : "bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white"
                          }`}
                        >
                          {u.role === "admin" ? "관리자 해제" : "권한 부여"}
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
    </div>
  );
}
