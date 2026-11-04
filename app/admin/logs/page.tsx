"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  User,
  Clock,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useMounted } from "@/lib/hooks/useMounted";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const limit = 20;

  const mounted = useMounted();

  const fetchLogsData = useCallback(async () => {
    setIsRefreshing(true);
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
    } finally {
      setIsRefreshing(false);
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

  const uniqueUsers = useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.email))).filter(Boolean);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesMethod = methodFilter === "ALL" || log.method === methodFilter;
      const matchesLevel = levelFilter === "ALL" || log.level === levelFilter;
      const matchesSearch =
        log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMethod && matchesLevel && matchesSearch;
    });
  }, [logs, methodFilter, levelFilter, searchQuery]);

  const handleFilterChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-4">
      {/* 1. 상단 안내 및 요약 헤더 (Settings 스타일) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div>
          <h2 className="text-sm font-semibold text-on-surface">시스템 감사 및 활동 로그</h2>
          <p className="text-xs text-on-surface-variant font-light mt-0.5">
            사용자 활동 및 시스템 API 호출 내역을 실시간으로 추적·감사합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded text-xs font-semibold bg-surface-container-lowest text-primary border border-outline-variant">
            총 {totalCount.toLocaleString()}건
          </span>
          <button
            onClick={fetchLogsData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-lowest hover:bg-surface-container-low text-on-surface rounded-md text-xs font-medium border border-outline-variant transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin text-primary" : "text-primary"} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 2. 필터 컨트롤 바 (Settings 스타일 카드) */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 space-y-3">
        {/* 상단: HTTP 메서드 탭 필터 */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            {["ALL", "GET", "POST", "PUT", "DELETE"].map((method) => {
              const isSelected = methodFilter === method;
              return (
                <button
                  key={method}
                  onClick={() => handleFilterChange(setMethodFilter, method)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-surface-container text-on-surface font-semibold"
                      : "text-on-surface-variant font-light hover:bg-surface-container-low hover:text-on-surface"
                  }`}
                >
                  {method === "ALL" ? "전체 메서드" : method}
                </button>
              );
            })}
          </div>

          {/* 로그 레벨 필터 */}
          <select
            value={levelFilter}
            onChange={(e) => handleFilterChange(setLevelFilter, e.target.value)}
            className="bg-surface-container-low border border-outline-variant rounded-md px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer font-medium"
          >
            <option value="ALL">전체 레벨</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="SECURITY">SECURITY</option>
          </select>
        </div>

        <div className="h-px bg-outline-variant/60" />

        {/* 하단: 회원 선택 및 엔드포인트 검색 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-surface-container-low border border-outline-variant rounded-md px-2.5 py-1.5 sm:w-64">
            <User size={13} className="text-primary shrink-0" />
            <select
              value={selectedUser}
              onChange={(e) => handleFilterChange(setSelectedUser, e.target.value)}
              className="bg-transparent text-xs focus:outline-none text-on-surface cursor-pointer font-medium w-full truncate"
            >
              <option value="ALL">전체 회원 필터</option>
              {uniqueUsers.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <Search
              size={13}
              className="absolute left-2.5 top-2.5 text-on-surface-variant pointer-events-none"
            />
            <input
              type="text"
              placeholder="경로 또는 메시지 검색..."
              value={searchQuery}
              onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md text-xs focus:outline-none focus:border-primary text-on-surface placeholder:text-on-surface-variant/60"
            />
          </div>
        </div>
      </div>

      {/* 3. 감사 로그 리스트 카드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-primary" />
            <h3 className="text-xs font-semibold text-on-surface">수집된 활동 기록</h3>
          </div>
          <span className="text-[11px] text-on-surface-variant font-light">
            페이지당 20건 표시
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant text-xs font-light">
            조건에 맞는 활동 로그가 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log) => (
              <LogItem key={log._id} log={log} />
            ))}
          </div>
        )}

        {/* 4. 페이지네이션 컨트롤 (Settings 스타일) */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2.5 pt-3 border-t border-outline-variant text-xs">
            <span className="text-[11px] text-on-surface-variant">
              페이지 {currentPage} / {totalPages} (총 {totalCount.toLocaleString()}건)
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-surface-container-low rounded-md disabled:opacity-40 hover:bg-surface-container transition-colors cursor-pointer disabled:cursor-not-allowed text-on-surface border border-outline-variant"
                title="이전 페이지"
              >
                <ChevronLeft size={14} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                  ) {
                    const isCurrent = currentPage === pageNumber;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`w-7 h-7 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-primary text-on-primary font-bold"
                            : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container border border-outline-variant"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                    return (
                      <span key={pageNumber} className="text-on-surface-variant px-1 text-xs">
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
                className="p-1.5 bg-surface-container-low rounded-md disabled:opacity-40 hover:bg-surface-container transition-colors cursor-pointer disabled:cursor-not-allowed text-on-surface border border-outline-variant"
                title="다음 페이지"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogItem({ log }: { log: LogType }) {
  const methodBadge =
    {
      GET: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
      POST: "text-primary bg-primary/10 border-primary/30",
      PUT: "text-secondary bg-secondary/10 border-secondary/30",
      DELETE: "text-destructive bg-destructive/10 border-destructive/30",
    }[log.method] || "text-on-surface-variant bg-surface-container-low border-outline-variant";

  const levelBadge =
    {
      INFO: "text-on-surface-variant bg-surface-container-low border-outline-variant",
      WARN: "text-amber-500 bg-amber-500/10 border-amber-500/30",
      ERROR: "text-destructive bg-destructive/10 border-destructive/30",
      SECURITY: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    }[log.level] || "text-on-surface-variant bg-surface-container-low border-outline-variant";

  return (
    <div className="bg-surface-container-low border border-outline-variant p-3 rounded-md flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 text-xs hover:border-primary/40 transition-colors">
      <div className="flex items-start md:items-center gap-2.5 overflow-hidden w-full md:w-auto">
        <span
          className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border shrink-0 ${methodBadge}`}
        >
          {log.method}
        </span>

        <span
          className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-semibold border shrink-0 ${levelBadge}`}
        >
          {log.level}
        </span>

        <div className="overflow-hidden flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-on-surface font-mono text-xs truncate max-w-full">
              {log.endpoint}
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-surface-container text-on-surface-variant border border-outline-variant shrink-0">
              {log.statusCode}
            </span>
          </div>
          {log.message && (
            <p className="text-on-surface-variant text-[11px] font-light truncate mt-0.5">
              {log.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-on-surface-variant shrink-0 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t border-outline-variant md:border-t-0">
        <span className="font-mono bg-surface-container border border-outline-variant px-1.5 py-0.5 rounded text-[10px] text-on-surface-variant">
          {log.responseTime}ms
        </span>
        <span className="flex items-center gap-1 font-medium truncate max-w-[150px]">
          <User size={11} className="shrink-0 text-primary" />
          <span className="truncate">{log.email}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
          <Clock size={11} className="text-secondary" />
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
