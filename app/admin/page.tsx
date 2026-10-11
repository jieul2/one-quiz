'use client';

import { useState, useEffect } from 'react';
import { Database, Users, Terminal, Settings, Home, Lock, Moon, Sun, ShieldAlert, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

export default function AdminHubPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
      } else {
        const data = await res.json();
        setAuthError(data.error || '비밀번호가 틀렸습니다.');
      }
    } catch (error) {
      setAuthError('인증 중 오류가 발생했습니다.');
    }
  };

  if (!mounted) return null;

  // 인증되지 않은 경우 비밀번호 입력 화면
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center mb-3">
              <Lock size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">관리자 인증 허브</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">관리자 대시보드에 접근하려면 비밀번호를 입력하세요.</p>
          </div>

          {authError && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="관리자 비밀번호 입력"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold py-3 rounded-xl transition-colors shadow-md text-sm cursor-pointer"
            >
              로그인
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors">
              ← 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 인증 완료 후 관리자 모듈 허브 대시보드
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
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">시스템 모듈을 선택하여 관리 및 설정할 수 있습니다.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link href="/" className="flex items-center gap-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] px-4 py-2.5 rounded-xl transition-colors font-medium">
              <Home size={16} /> 메인으로
            </Link>
          </div>
        </div>

        {/* 모듈 카드 그리드 (문제관리, 계정관리, 로그, 사이트설정) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. 문제 관리 모듈 */}
          <Link href="/admin/questions" className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-yellow-500 dark:hover:border-yellow-500 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Database size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">문항 및 시험 DB 관리</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                CBT 기출문제를 등록, 수정, 삭제하고 사용자들의 누적 풀이 성적 기록 및 이력을 관리합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-yellow-600 dark:text-yellow-500 group-hover:translate-x-1 transition-transform">
              <span>모듈 접속하기</span> <ArrowRight size={14} />
            </div>
          </Link>

          {/* 2. 계정 관리 모듈 (추후 확장용) */}
          <Link href="/admin/accounts" className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">사용자 및 계정 관리</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                플랫폼을 이용하는 회원 계정 권한 설정, 관리자 패스워드 제어 및 인증 로그를 관리합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-blue-500 group-hover:translate-x-1 transition-transform">
              <span>모듈 접속하기</span> <ArrowRight size={14} />
            </div>
          </Link>

          {/* 3. 시스템 로그 모듈 (추후 확장용) */}
          <Link href="/admin/logs" className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-purple-500 dark:hover:border-purple-500 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Terminal size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">시스템 로그 및 감사</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                서버 API 호출 내역, 데이터베이스 연동 에러 및 실시간 활동 로그를 모니터링합니다.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1 text-xs font-bold text-purple-500 group-hover:translate-x-1 transition-transform">
              <span>모듈 접속하기</span> <ArrowRight size={14} />
            </div>
          </Link>

          {/* 4. 사이트 설정 모듈 (추후 확장용) */}
          <Link href="/admin/settings" className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm hover:border-green-500 dark:hover:border-green-500 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Settings size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">사이트 전역 설정</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                플랫폼 타이틀, 서비스 점검 모드 토글, API 연동 키 및 전역 환경설정을 제어합니다.
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