"use client";

import { useState, useEffect } from "react";
import {
  Database,
  Users,
  Terminal,
  Settings,
  Home,
  Moon,
  Sun,
  ShieldAlert,
  ArrowRight,
  Lock,
  BellRing,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useSession, signIn, signOut } from "next-auth/react";

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
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted] = useState(true);

  // 관리자 알림(문제 오류 신고) 상태
  const [reports, setReports] = useState<ReportType[]>([]);
  // 복사 완료 상태 관리
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.role === "admin") {
      fetchReports();
    }
  }, [session]);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/admin/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  if (!mounted) return null;

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212] text-gray-400">
        권한을 확인하는 중...
      </div>
    );
  }

  // 1. 로그인되지 않은 경우
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center">
            <Lock size={28} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
              관리자 인증 허브
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              관리자 모듈에 접근하려면 로그인이 필요합니다.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => signIn()}
              className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-md cursor-pointer text-sm"
            >
              로그인 페이지로 이동
            </button>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
            >
              ← 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. 로그인은 했으나 관리자 권한이 아닌 경우
  if (session.user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
              접근 권한이 없습니다
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              현재 계정(
              <span className="font-bold text-gray-800 dark:text-gray-200">
                {session.user?.email}
              </span>
              )은 일반 사용자 권한입니다. 관리자 권한이 필요합니다.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => signOut()}
              className="flex-1 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs cursor-pointer"
            >
              로그아웃
            </button>
            <Link
              href="/"
              className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold rounded-xl text-xs flex items-center justify-center shadow"
            >
              메인으로 가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. 관리자(Admin) 권한인 경우 정상적인 제어 센터 표시
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-[#121212] transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 💡 상단 네비게이션 헤더 (캘린더/일기장과 동일한 반응형 디자인 구조 적용) */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-3 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-xl shrink-0">
              <ShieldAlert size={24} />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white truncate">
                ⚙️ 관리자 제어 센터
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                관리자 계정:{" "}
                <span className="font-bold text-yellow-600 dark:text-yellow-500">
                  {session.user?.email}
                </span>
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
            <button
              onClick={() => signOut()}
              className="px-3.5 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              로그아웃
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] px-3.5 py-2.5 rounded-xl transition-colors font-medium text-gray-700 dark:text-gray-300"
            >
              <Home size={16} /> <span className="hidden sm:inline">메인으로</span>
            </Link>
          </div>
        </div>

        {/* 헤더 바로 밑 실시간 상세 문제 오류 신고 알림 배너 */}
        {reports.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <BellRing size={18} className="animate-bounce" />
                <span>유저가 신고한 문제 오류 알림 ({reports.length}건)</span>
              </div>
              <span className="text-xs text-gray-400">확인 및 조치가 필요합니다.</span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {reports.map((report) => {
                const isCopied = copiedId === report._id;

                return (
                  <div
                    key={report._id}
                    className="bg-white dark:bg-[#1e1e1e] border border-amber-500/20 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs w-full overflow-hidden"
                  >
                    <div className="space-y-2 flex-1 w-full min-w-0">
                      {/* 과목 및 회차 정보 */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-amber-500 text-black font-bold px-2 py-0.5 rounded text-[10px]">
                          {report.subject || "과목 미상"}
                        </span>
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold px-2 py-0.5 rounded text-[10px]">
                          {report.examType || "회차 미상"} /{" "}
                          {report.questionNumber ? `${report.questionNumber}번 문항` : ""}
                        </span>
                        <span className="text-gray-400 text-[11px]">
                          신고유저: {report.userEmail}
                        </span>
                      </div>

                      {/* 신고 사유 */}
                      <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white text-sm">
                        <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                        <span className="break-words">신고사유: {report.reportReason}</span>
                      </div>

                      {/* 문제 내용 및 ID 복사 버튼 포함 박스 */}
                      <div className="bg-gray-50 dark:bg-[#2d2d2d] p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                        <p className="text-gray-600 dark:text-gray-400 font-mono text-xs break-all flex-1 min-w-0">
                          문제 내용: {report.questionText || "내용 없음"}
                        </p>

                        {/* 문제 ID 복사 버튼 */}
                        {report.questionId && (
                          <button
                            onClick={() => handleCopyId(report.questionId, report._id)}
                            className="flex items-center justify-center gap-1 bg-white dark:bg-[#1e1e1e] hover:bg-gray-100 dark:hover:bg-black px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 font-mono text-xs text-gray-700 dark:text-gray-300 shrink-0 cursor-pointer transition-colors shadow-2xs self-end sm:self-auto"
                            title="클립보드에 문제 ID 복사"
                          >
                            {isCopied ? (
                              <>
                                <Check size={14} className="text-green-500" />
                                <span className="text-green-500 font-bold">복사됨!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                <span>ID 복사</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 조치 완료 버튼 */}
                    <button
                      onClick={() => handleResolveReport(report._id)}
                      className="w-full md:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5 self-end md:self-center shadow-sm"
                    >
                      <CheckCircle size={15} /> 조치 완료
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 💡 관리자 모듈 카드 그리드 (반응형 패딩 및 호버 효과 정돈) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Link
            href="/admin/questions"
            className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-yellow-500 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Database size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                문항 및 시험 DB 관리
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                기출문제를 등록, 수정, 삭제하고 사용자 풀이 기록을 관리합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-yellow-600 dark:text-yellow-500 group-hover:translate-x-1 transition-transform">
              <span>모듈 접속하기</span> <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/admin/accounts"
            className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-blue-500 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                사용자 및 계정 관리
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                회원 권한 설정 및 관리자 권한을 부여/박탈합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-blue-500 group-hover:translate-x-1 transition-transform">
              <span>모듈 접속하기</span> <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/admin/logs"
            className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-purple-500 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Terminal size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                시스템 로그 및 감사
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                서버 API 호출 내역 및 실시간 활동 로그를 모니터링합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-purple-500 group-hover:translate-x-1 transition-transform">
              <span>모듈 접속하기</span> <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-green-500 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Settings size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                사이트 전역 설정
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                플랫폼 타이틀, 서비스 점검 모드 및 글로벌 환경설정을 제어합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-green-500 group-hover:translate-x-1 transition-transform">
              <span>모듈 접속하기</span> <ArrowRight size={14} />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
