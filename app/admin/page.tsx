'use client';

import { useState, useEffect } from 'react';
import { Database, Users, Terminal, Settings, Home, Moon, Sun, ShieldAlert, ArrowRight, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { signIn, useSession, signOut } from 'next-auth/react';

export default function AdminHubPage() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // 로딩 중 화면
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#121212] text-gray-400">
        인증 정보를 확인하는 중...
      </div>
    );
  }

  // 로그인되지 않은 경우 (구글 / 카카오 소셜 로그인 화면)
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md text-center space-y-6">
          
          <div className="w-14 h-14 mx-auto rounded-2xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center">
            <ShieldAlert size={28} />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">관리자 인증 허브</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">관리자 모듈에 접근하려면 소셜 계정으로 로그인하세요.</p>
          </div>

          <div className="space-y-3 pt-2">
            {/* 구글 로그인 버튼 */}
            <button
              onClick={() => signIn('google', { callbackUrl: '/admin' })}
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#353535] text-gray-800 dark:text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm cursor-pointer text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Google 계정으로 로그인
            </button>

            {/* 카카오 로그인 버튼 */}
            <button
              onClick={() => signIn('kakao', { callbackUrl: '/admin' })}
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm cursor-pointer text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.84 5.32 4.62 6.74-.15.54-.56 1.96-.64 2.27-.1.38.14.38.3.26.12-.09 1.95-1.33 2.74-1.87.65.1 1.32.15 1.98.15 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
              </svg>
              카카오 계정으로 로그인
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

  // 로그인 완료된 경우 관리자 허브 대시보드 표시
  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-[#121212] transition-colors">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* 상단 헤더 바 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-xl">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white">⚙️ 관리자 제어 센터</h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                접속 계정: <span className="font-bold text-yellow-600 dark:text-yellow-500">{session.user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => signOut()} className="px-3.5 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer">
              로그아웃
            </button>
            <Link href="/" className="flex items-center gap-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] px-4 py-2.5 rounded-xl transition-colors font-medium">
              <Home size={16} /> 메인으로
            </Link>
          </div>
        </div>

        {/* 모듈 카드 그리드 */}
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
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">회원 권한 설정 및 관리자 패스워드 제어 로그를 관리합니다.</p>
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