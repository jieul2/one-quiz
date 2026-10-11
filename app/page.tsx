'use client';

import { useState } from 'react';
import { BookOpen, Settings, Lightbulb, Moon, Sun, Lock } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  // 초기값을 true로 주어 별도의 동기 setState 이펙트 트리거를 방지합니다.
  const [mounted] = useState(true);
  const router = useRouter();

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center text-gray-800 dark:text-gray-200 transition-colors duration-300 relative overflow-hidden p-4">
      
      {/* 테마 토글 버튼 */}
      <button 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
        className="absolute top-6 right-6 sm:top-8 sm:right-8 p-3 bg-white dark:bg-[#1e1e1e] rounded-full shadow-md border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
      >
        {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      {/* 로고 영역 */}
      <div className="text-center mb-10 cursor-pointer" onClick={() => router.push('/')}>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">oneQuiz</h1>
        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg font-medium">박다훈의 맞춤형 통합 학습 플랫폼 <br/><small className="text-gray-500 dark:text-gray-500">중간고사 : 10/12 ~ 16, 드론조종사 : 10/21</small></p>
      </div>

      {/* 메인 메뉴 카드 그리드 (일기장 포함 4개 카드) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-in max-w-5xl justify-items-center">
        
        {/* 시험 응시하기 */}
        <button 
          onClick={() => router.push('/exam/subject')}
          className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 rounded-2xl transition-all hover:scale-105 group w-64 shadow-xl dark:shadow-2xl text-left cursor-pointer"
        >
          <BookOpen size={44} className="text-yellow-600 dark:text-yellow-500 mb-4 group-hover:text-yellow-500 transition-colors" />
          <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">시험 응시하기</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center">과목과 회차를 선택해<br/>맞춤형으로 학습하세요</span>
        </button>

        {/* 나만의 일기장 */}
        <button 
          onClick={() => router.push('/diary')}
          className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl transition-all hover:scale-105 group w-64 shadow-xl dark:shadow-2xl text-left cursor-pointer"
        >
          <Lock size={44} className="text-blue-500 mb-4 group-hover:text-blue-400 transition-colors" />
          <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">나만의 일기장</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center">로그인 전용 프라이빗<br/>일기를 기록하세요</span>
        </button>

        {/* 개발 예정 기능 */}
        <button 
          onClick={() => router.push('/ideas')}
          className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl transition-all hover:scale-105 group w-64 shadow-xl dark:shadow-2xl text-left cursor-pointer"
        >
          <Lightbulb size={44} className="text-blue-500 mb-4 group-hover:text-blue-400 transition-colors" />
          <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">개발 예정 기능</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center">통합 앱 확장을 위한<br/>아이디어를 기록하세요</span>
        </button>

        {/* 관리자 페이지 */}
        <button 
          onClick={() => router.push('/admin')}
          className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-500 rounded-2xl transition-all hover:scale-105 group w-64 shadow-xl dark:shadow-2xl text-left cursor-pointer"
        >
          <Settings size={44} className="text-gray-400 dark:text-gray-500 mb-4 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
          <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">관리자 페이지</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center">문제 추가 및<br/>목록을 관리하세요</span>
        </button>

      </div>

    </div>
  );
}