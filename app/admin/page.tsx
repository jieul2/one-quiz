"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Users,
  Terminal,
  Settings,
  BellRing,
  CheckCircle,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface ReportType {
  _id: string;
  questionId?: string;
  subject?: string;
  examType?: string;
  questionNumber?: number;
  questionText?: string;
  userEmail: string;
  reportReason: string;
  createdAt: string;
}

export default function AdminHubPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState<ReportType[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadReports() {
      if (session?.user?.role === "admin") {
        try {
          const res = await fetch("/api/admin/reports");
          if (res.ok) {
            const data = await res.json();
            if (!ignore) setReports(data);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    loadReports();
    return () => {
      ignore = true;
    };
  }, [session]);

  const handleResolveReport = async (reportId: string) => {
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r._id !== reportId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyId = (questionId?: string, reportId?: string) => {
    if (!questionId) {
      alert("연결된 문제 ID가 없습니다.");
      return;
    }
    navigator.clipboard.writeText(questionId);
    setCopiedId(reportId || null);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* 1. 계정 및 시스템 현황 브리핑 카드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldAlert size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs text-on-surface">시스템 관리자 인증 완료</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/15 text-primary">
                Active
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
              {session?.user?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-on-surface-variant text-[11px]">미해결 오류 신고:</span>
          <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
            reports.length > 0 ? "bg-rose-500/15 text-rose-500 font-bold" : "bg-surface-container text-on-surface-variant"
          }`}>
            {reports.length}건
          </span>
        </div>
      </div>

      {/* 2. 문제 오류 신고 알림 카드 (신고 건수가 있을 때) */}
      {reports.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <BellRing size={14} className="text-primary animate-pulse" />
              <span>유저 신고 문제 오류 목록 ({reports.length}건)</span>
            </div>
            <span className="text-[11px] text-on-surface-variant">조치가 필요합니다</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            {reports.map((report) => {
              const isCopied = copiedId === report._id;

              return (
                <div
                  key={report._id}
                  className="bg-surface-container-low border border-outline-variant p-3 rounded-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {report.subject && (
                        <span className="px-2 py-0.5 bg-surface-container text-on-surface rounded text-[10px] font-semibold border border-outline-variant">
                          {report.subject}
                        </span>
                      )}
                      {report.examType && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium border border-primary/20">
                          {report.examType}
                        </span>
                      )}
                      {report.questionNumber && (
                        <span className="font-mono font-bold text-primary text-[11px]">
                          #{report.questionNumber}번
                        </span>
                      )}
                    </div>

                    {report.questionText && (
                      <p className="text-on-surface-variant truncate font-normal text-xs">
                        {report.questionText}
                      </p>
                    )}

                    <div className="p-2 bg-surface-container-lowest border border-outline-variant rounded text-on-surface text-[11px]">
                      <span className="font-bold text-primary mr-1">신고 사유:</span>
                      {report.reportReason}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-on-surface-variant">
                      <span>신고자: {report.userEmail}</span>
                      <span>·</span>
                      <span>{new Date(report.createdAt).toLocaleString("ko-KR")}</span>
                      {report.questionId && (
                        <>
                          <span>·</span>
                          <button
                            onClick={() => handleCopyId(report.questionId, report._id)}
                            className="flex items-center gap-1 text-primary hover:underline cursor-pointer font-mono"
                          >
                            {isCopied ? (
                              <>
                                <Check size={11} /> <span>복사됨</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} /> <span>ID 복사</span>
                              </>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleResolveReport(report._id)}
                    className="px-3 py-1.5 bg-primary hover:opacity-90 text-on-primary font-semibold rounded-md text-xs transition-opacity shrink-0 flex items-center gap-1 self-end md:self-center cursor-pointer"
                  >
                    <CheckCircle size={13} />
                    <span>조치 완료</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. 4개 하위 관리 모듈 숏컷 그리드 (settings 카드 스타일 통일) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <Link
          href="/admin/questions"
          className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg hover:border-primary/50 transition-colors group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Database size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">문항 및 시험 데이터 관리</h3>
              <p className="text-xs text-on-surface-variant font-light mt-0.5 leading-relaxed">
                기출문제를 등록, 수정, 삭제하고 사용자 풀이 기록을 관리합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
            <span>바로가기</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          href="/admin/accounts"
          className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg hover:border-primary/50 transition-colors group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">사용자 및 계정 관리</h3>
              <p className="text-xs text-on-surface-variant font-light mt-0.5 leading-relaxed">
                회원 목록을 조회하고 관리자 권한을 부여하거나 일반 유저로 변경합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
            <span>바로가기</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          href="/admin/logs"
          className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg hover:border-primary/50 transition-colors group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Terminal size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">시스템 로그 및 감사</h3>
              <p className="text-xs text-on-surface-variant font-light mt-0.5 leading-relaxed">
                서버 API 호출 내역, 응답 시간 및 실시간 감사 로그를 모니터링합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
            <span>바로가기</span>
            <ArrowRight size={13} />
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="bg-surface-container-lowest border border-outline-variant p-4 rounded-lg hover:border-primary/50 transition-colors group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-2">
            <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Settings size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-on-surface">사이트 운영 설정</h3>
              <p className="text-xs text-on-surface-variant font-light mt-0.5 leading-relaxed">
                점검 모드 전환, 공지 메시지 및 개별 기능 ON/OFF를 제어합니다.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
            <span>바로가기</span>
            <ArrowRight size={13} />
          </div>
        </Link>
      </div>
    </div>
  );
}
