"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Terminal,
  Moon,
  Sun,
  Search,
  User,
  Clock,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

interface LogType {
  _id: string;
  userId?: string;
  email: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  endpoint: string;
  statusCode: number;
  level: "INFO" | "WARN" | "ERROR" | "SECURITY";
  ip: string;
  userAgent: string;
  responseTime: number;
  message: string;
  timestamp: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogType[]>([]);
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");

  // 서버사이드 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const limit = 20;

  const { theme, setTheme } = useTheme();

  const fetchLogsData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", limit.toString());
      if (selectedUser !== "ALL") params.set("email", selectedUser);
      if (methodFilter !== "ALL") params.set("method", methodFilter);
      if (levelFilter !== "ALL") params.set("level", levelFilter);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentPage, selectedUser, methodFilter, levelFilter, searchQuery]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", limit.toString());
      if (selectedUser !== "ALL") params.set("email", selectedUser);
      if (methodFilter !== "ALL") params.set("method", methodFilter);
      if (levelFilter !== "ALL") params.set("level", levelFilter);
      if (searchQuery) params.set("search", searchQuery);

      try {
        const res = await fetch(`/api/logs?${params.toString()}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setLogs(data.logs || []);
          setTotalPages(data.totalPages || 1);
          setTotalCount(data.total || 0);
        }
      } catch (e) {
        console.error(e);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [currentPage, selectedUser, methodFilter, levelFilter, searchQuery]);

  const uniqueUsers = Array.from(new Set(logs.map((log) => log.email))).filter(Boolean);

  const filteredLogs = logs.filter((log) => {
    const matchesMethod = methodFilter === "ALL" || log.method === methodFilter;
    const matchesLevel = levelFilter === "ALL" || log.level === levelFilter;
    const matchesSearch =
      log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMethod && matchesLevel && matchesSearch;
  });

  const handleFilterChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] p-4 md:p-8 text-gray-800 dark:text-gray-200 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 💡 상단 네비게이션 헤더 (캘린더/일기장/기타 관리자 페이지와 통일된 반응형 구조) */}
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
                📜 시스템 감사 및 활동 로그
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                회원별 활동 및 API 호출 내역 감사 모듈 (DB 페이징 적용)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              suppressHydrationWarning
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] rounded-xl text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
              title="테마 변경"
            >
              <span className="block dark:hidden">
                <Moon size={18} />
              </span>
              <span className="hidden dark:block">
                <Sun size={18} />
              </span>
            </button>
          </div>
        </div>

        {/* 💡 컨트롤 패널 (모바일에서 버튼 및 셀렉트 박스가 깔끔하게 줄바꿈 및 확장되도록 수정) */}
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 md:p-5 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
            {/* 회원별 필터 콤보박스 */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5">
              <User size={15} className="text-purple-500 shrink-0" />
              <select
                value={selectedUser}
                onChange={(e) => handleFilterChange(setSelectedUser, e.target.value)}
                className="bg-transparent text-xs sm:text-sm focus:outline-none text-gray-900 dark:text-white cursor-pointer font-medium w-full"
              >
                <option value="ALL" className="dark:bg-[#1e1e1e] dark:text-white">
                  전체 회원 보기
                </option>
                {uniqueUsers.map((email) => (
                  <option key={email} value={email} className="dark:bg-[#1e1e1e] dark:text-white">
                    {email}
                  </option>
                ))}
              </select>
            </div>

            {/* HTTP 메서드별 필터 버튼 그룹 (모바일에서 스크롤 가능하도록 처리) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {["ALL", "GET", "POST", "PUT", "DELETE"].map((method) => (
                <button
                  key={method}
                  onClick={() => handleFilterChange(setMethodFilter, method)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    methodFilter === method
                      ? "bg-purple-500 text-white shadow"
                      : "bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#383838]"
                  }`}
                >
                  {method === "ALL" ? "모든 메서드" : method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
            <select
              value={levelFilter}
              onChange={(e) => handleFilterChange(setLevelFilter, e.target.value)}
              className="bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white cursor-pointer font-medium"
            >
              <option value="ALL" className="dark:bg-[#1e1e1e] dark:text-white">
                로그 레벨 전체
              </option>
              <option value="INFO" className="dark:bg-[#1e1e1e] dark:text-white">
                INFO
              </option>
              <option value="WARN" className="dark:bg-[#1e1e1e] dark:text-white">
                WARN
              </option>
              <option value="ERROR" className="dark:bg-[#1e1e1e] dark:text-white">
                ERROR
              </option>
              <option value="SECURITY" className="dark:bg-[#1e1e1e] dark:text-white">
                SECURITY
              </option>
            </select>

            <div className="relative flex-1 sm:w-56">
              <Search
                size={16}
                className="absolute left-3.5 top-3 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="경로 검색..."
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 로그 리스트 출력 영역 */}
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-4 md:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Activity size={16} className="text-purple-500" /> 수집된 로그 총 누적{" "}
              <span className="text-purple-600 dark:text-purple-400 font-extrabold">
                {totalCount}건
              </span>
            </h2>
            <button
              onClick={fetchLogsData}
              className="text-xs text-purple-500 hover:underline cursor-pointer font-bold"
            >
              새로고침
            </button>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              조건에 일치하는 로그가 없습니다.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map((log) => (
                <LogItem key={log._id} log={log} />
              ))}
            </div>
          )}

          {/* 페이지네이션 컨트롤러 */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                페이지 <strong className="text-purple-500">{currentPage}</strong> / {totalPages} (총{" "}
                {totalCount}건)
              </span>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`w-8 h-8 rounded-xl font-bold transition-all cursor-pointer ${
                            currentPage === pageNumber
                              ? "bg-purple-500 text-white shadow"
                              : "bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#383838]"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                      return (
                        <span key={pageNumber} className="text-gray-400 px-1">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LogItem({ log }: { log: LogType }) {
  const methodColor =
    {
      GET: "text-green-500 bg-green-500/10 border-green-500/30",
      POST: "text-blue-500 bg-blue-500/10 border-blue-500/30",
      PUT: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
      DELETE: "text-red-500 bg-red-500/10 border-red-500/30",
    }[log.method] || "text-gray-500 bg-gray-500/10";

  return (
    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700/60 p-4 rounded-xl shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs hover:border-purple-500 transition-all">
      <div className="flex items-start md:items-center gap-3 overflow-hidden w-full md:w-auto">
        <span
          className={`px-2.5 py-1 rounded-md font-mono font-bold text-[10px] border shrink-0 ${methodColor}`}
        >
          {log.method}
        </span>

        <div className="overflow-hidden flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-white font-mono truncate max-w-full">
              {log.endpoint}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 shrink-0">
              {log.statusCode}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 truncate mt-0.5">{log.message}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500 shrink-0 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t border-gray-100 dark:border-gray-800/60 md:border-t-0">
        <span className="font-mono bg-gray-100 dark:bg-[#2d2d2d] px-2 py-1 rounded text-gray-600 dark:text-gray-300">
          ⏱️ {log.responseTime}ms
        </span>
        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-medium truncate max-w-[150px]">
          <User size={12} className="shrink-0" /> <span className="truncate">{log.email}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0">
          <Clock size={12} /> {new Date(log.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
