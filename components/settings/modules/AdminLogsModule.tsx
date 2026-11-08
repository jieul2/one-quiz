"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Terminal, RefreshCw, Search, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/lib/toast";

export interface AuditLogType {
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

export function AdminLogsModule() {
  const [adminLogs, setAdminLogs] = useState<AuditLogType[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logMethodFilter, setLogMethodFilter] = useState<string>("ALL");
  const [logLevelFilter, setLogLevelFilter] = useState<string>("ALL");
  const [logPage, setLogPage] = useState<number>(1);
  const [logTotalPages, setLogTotalPages] = useState<number>(1);
  const [logTotalCount, setLogTotalCount] = useState<number>(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogType | null>(null);

  const fetchAdminLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(logPage));
      params.set("limit", "25");
      if (logMethodFilter !== "ALL") params.set("method", logMethodFilter);
      if (logLevelFilter !== "ALL") params.set("level", logLevelFilter);

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAdminLogs(data.logs || []);
        setLogTotalPages(data.totalPages || 1);
        setLogTotalCount(data.total || 0);
      }
    } catch {
      toast.error("감사 로그를 불러오지 못했습니다.");
    } finally {
      setIsLoadingLogs(false);
    }
  }, [logPage, logMethodFilter, logLevelFilter]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams();
        params.set("page", String(logPage));
        params.set("limit", "25");
        if (logMethodFilter !== "ALL") params.set("method", logMethodFilter);
        if (logLevelFilter !== "ALL") params.set("level", logLevelFilter);

        const res = await fetch(`/api/logs?${params.toString()}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setAdminLogs(data.logs || []);
          setLogTotalPages(data.totalPages || 1);
          setLogTotalCount(data.total || 0);
        }
      } catch {
        if (!ignore) toast.error("감사 로그를 불러오지 못했습니다.");
      } finally {
        if (!ignore) setIsLoadingLogs(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [logPage, logMethodFilter, logLevelFilter]);

  // 프론트엔드 실시간 0ms 검색
  const filteredAdminLogs = useMemo(() => {
    if (!logSearchQuery.trim()) return adminLogs;
    const q = logSearchQuery.toLowerCase().trim();
    return adminLogs.filter(
      (log) =>
        log.endpoint.toLowerCase().includes(q) ||
        (log.email && log.email.toLowerCase().includes(q)) ||
        (log.message && log.message.toLowerCase().includes(q)) ||
        (log.ip && log.ip.includes(q)) ||
        String(log.statusCode).includes(q)
    );
  }, [adminLogs, logSearchQuery]);

  const methodColors: Record<string, string> = {
    GET: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    POST: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    PUT: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    DELETE: "bg-rose-500/15 text-rose-500 border-rose-500/30",
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 space-y-4">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Terminal size={18} />
          </div>
          <div>
            <h2 className="ui-section-title text-on-surface">시스템 감사 로그 (Audit Logs)</h2>
            <p className="ui-caption text-on-surface-variant font-light">
              전체 {logTotalCount}건 중 현재 페이지 {filteredAdminLogs.length}건 표시 (FE 실시간 0ms 검색)
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminLogs}
          disabled={isLoadingLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface ui-caption font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={12} className={isLoadingLogs ? "animate-spin text-primary" : ""} />
          <span>새로고침</span>
        </button>
      </div>

      {/* 검색 및 필터 툴바 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          />
          <input
            type="text"
            placeholder="실시간 검색 (메시지, 엔드포인트, 이메일, IP 등)..."
            value={logSearchQuery}
            onChange={(e) => setLogSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low pl-9 pr-9 py-2 rounded-md border border-outline-variant ui-body text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-all"
          />
          {logSearchQuery && (
            <button
              onClick={() => setLogSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-0.5 cursor-pointer"
              title="검색어 지우기"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* 메서드 필터 */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-md border border-outline-variant text-xs">
          {["ALL", "GET", "POST", "PUT", "DELETE"].map((m) => (
            <button
              key={m}
              onClick={() => {
                setLogMethodFilter(m);
                setLogPage(1);
              }}
              className={`px-2 py-1 rounded ui-caption font-bold transition-colors cursor-pointer ${
                logMethodFilter === m
                  ? "bg-surface-container text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* 로그 레벨 필터 */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-md border border-outline-variant text-xs">
          {["ALL", "INFO", "WARN", "ERROR"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setLogLevelFilter(lvl);
                setLogPage(1);
              }}
              className={`px-2 py-1 rounded ui-caption font-bold transition-colors cursor-pointer ${
                logLevelFilter === lvl
                  ? "bg-surface-container text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* 로그 목록 테이블 */}
      {isLoadingLogs ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
          <Loader2 size={24} className="animate-spin text-primary" />
          <span className="ui-caption text-on-surface-variant">감사 로그 조회 중...</span>
        </div>
      ) : filteredAdminLogs.length === 0 ? (
        <div className="py-12 ui-empty-state">
          {logSearchQuery ? `"${logSearchQuery}" 일치하는 로그가 없습니다.` : "기록된 감사 로그가 없습니다."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant">
          <table className="w-full border-collapse text-left ui-body font-mono">
            <thead className="bg-surface-container-low text-on-surface-variant ui-caption border-b border-outline-variant font-sans">
              <tr>
                <th className="py-2.5 px-3 font-semibold">시각</th>
                <th className="py-2.5 px-3 font-semibold">메서드</th>
                <th className="py-2.5 px-3 font-semibold">엔드포인트</th>
                <th className="py-2.5 px-3 font-semibold">상태</th>
                <th className="py-2.5 px-3 font-semibold">사용자</th>
                <th className="py-2.5 px-3 font-semibold text-right">응답</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant ui-caption">
              {filteredAdminLogs.map((log) => {
                return (
                  <tr
                    key={log._id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-surface-container-low/70 transition-colors cursor-pointer"
                  >
                    <td className="py-2 px-3 text-on-surface-variant whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                          methodColors[log.method] || "bg-surface-container"
                        }`}
                      >
                        {log.method}
                      </span>
                    </td>
                    <td
                      className="py-2 px-3 text-on-surface font-semibold truncate max-w-[200px]"
                      title={log.endpoint}
                    >
                      {log.endpoint}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`font-bold ${
                          log.statusCode >= 400 ? "text-destructive" : "text-primary"
                        }`}
                      >
                        {log.statusCode}
                      </span>
                    </td>
                    <td
                      className="py-2 px-3 text-on-surface-variant truncate max-w-[160px]"
                      title={log.email}
                    >
                      {log.email || "-"}
                    </td>
                    <td className="py-2 px-3 text-right text-on-surface-variant">
                      {log.responseTime ? `${log.responseTime}ms` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {logTotalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="ui-caption text-on-surface-variant">
            페이지 {logPage} / {logTotalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLogPage((p) => Math.max(1, p - 1))}
              disabled={logPage <= 1}
              className="p-1.5 rounded border border-outline-variant bg-surface-container-low text-on-surface disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}
              disabled={logPage >= logTotalPages}
              className="p-1.5 rounded border border-outline-variant bg-surface-container-low text-on-surface disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 로그 상세 모달 */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 w-full max-w-lg space-y-4 shadow-xl font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-outline-variant pb-3">
              <div className="flex items-center gap-2">
                <Terminal size={16} className="text-primary" />
                <h3 className="ui-card-title text-on-surface font-bold">감사 로그 상세 내역</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant space-y-1">
                <span className="text-on-surface-variant block text-[11px] font-sans font-semibold">
                  요청 엔드포인트 & 메서드
                </span>
                <p className="text-on-surface font-bold">
                  {selectedLog.method} {selectedLog.endpoint}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant">
                  <span className="text-on-surface-variant block text-[11px] font-sans font-semibold">
                    HTTP 상태 코드
                  </span>
                  <span
                    className={`font-bold ${
                      selectedLog.statusCode >= 400 ? "text-destructive" : "text-primary"
                    }`}
                  >
                    {selectedLog.statusCode}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant">
                  <span className="text-on-surface-variant block text-[11px] font-sans font-semibold">
                    응답 지연 시간
                  </span>
                  <span className="text-on-surface">{selectedLog.responseTime}ms</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant space-y-1">
                <span className="text-on-surface-variant block text-[11px] font-sans font-semibold">
                  사용자 이메일 & IP
                </span>
                <p className="text-on-surface">
                  {selectedLog.email || "익명"} ({selectedLog.ip || "IP 정보 없음"})
                </p>
              </div>

              <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant space-y-1">
                <span className="text-on-surface-variant block text-[11px] font-sans font-semibold">
                  로그 메시지
                </span>
                <p className="text-on-surface font-sans">{selectedLog.message}</p>
              </div>

              <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant space-y-1">
                <span className="text-on-surface-variant block text-[11px] font-sans font-semibold">
                  User Agent
                </span>
                <p className="text-on-surface-variant text-[11px] break-all">{selectedLog.userAgent}</p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface ui-caption font-medium cursor-pointer border border-outline-variant"
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
