'use client';

import { useState } from 'react';
import { Database, Users, Terminal, Settings, Home, Moon, Sun, ShieldAlert, ArrowRight, Lock } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function AdminHubPage() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted] = useState(true);

  if (!mounted) return null;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212] text-gray-400">
        권한을 확인하는 중...
      </div>
    );
  }

  // 1. 로그인되지 않은 경우 (커스텀 로그인 페이지로 이동)
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md text-center space-y-6">
          
          <div className="w-14 h-14 mx-auto rounded-2xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center">
            <Lock size={28} />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">관리자 인증 허브</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">관리자 모듈에 접근하려면 로그인이 필요합니다.</p>
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
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors">
              ← 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. 로그인은 했으나 관리자 권한이 아닌 경우
  if (session.user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
            <ShieldAlert size={28} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">접근 권한이 없습니다</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              현재 계정(<span className="font-bold text-gray-800 dark:text-gray-200">{session.user?.email}</span>)은 일반 사용자 권한입니다. 관리자 권한이 필요합니다.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => signOut()} className="flex-1 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs cursor-pointer">
              로그아웃
            </button>
            <Link href="/" className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold rounded-xl text-xs flex items-center justify-center shadow">
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
      <div className="max-w-5xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-xl">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white">⚙️ 관리자 제어 센터</h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                관리자 계정: <span className="font-bold text-yellow-600 dark:text-yellow-500">{session.user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors cursor-pointer">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => signOut()} className="px-3.5 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer">
              로그아웃
            </button>
            <Link href="/" className="flex items-center gap-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 px-4 py-2.5 rounded-xl transition-colors font-medium">
              <Home size={16} /> 메인으로
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/admin/questions" className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-yellow-500 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Database size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">문항 및 시험 DB 관리</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">기출문제를 등록, 수정, 삭제하고 사용자 풀이 기록을 관리합니다.</p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-yellow-600 dark:text-yellow-500 group-hover:translate-x-1 transition-transform">
              <span>모듈 접속하기</span> <ArrowRight size={14} />
            </div>
          </Link>

          <Link href="/admin/accounts" className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-blue-500 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">사용자 및 계정 관리</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">회원 권한 설정 및 관리자 권한을 부여/박탈합니다.</p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-blue-500 group-hover:translate-x-1 transition-transform">
              <span>모듈 접속하기</span> <ArrowRight size={14} />
            </div>
          </Link>

          <Link href="/admin/logs" className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-purple-500 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Terminal size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">시스템 로그 및 감사</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">서버 API 호출 내역 및 실시간 활동 로그를 모니터링합니다.</p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-purple-500 group-hover:translate-x-1 transition-transform">
              <span>모듈 접속하기</span> <ArrowRight size={14} />
            </div>
          </Link>

          <Link href="/admin/settings" className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-green-500 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Settings size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">사이트 전역 설정</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">플랫폼 타이틀, 서비스 점검 모드 및 글로벌 환경설정을 제어합니다.</p>
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