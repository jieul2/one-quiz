'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Settings, Lightbulb, Moon, Sun, Lock, ShieldAlert, Clock, FileText } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

interface SettingsType {
  siteTitle: string;
  landingSubtitle: string;
  isMaintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceUpdatedAt?: string | null;
  disabledFeatures: {
    exam: boolean;
    diary: boolean;
    ideas: boolean;
    admin: boolean;
  };
}

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const router = useRouter();

  // useEffect 내부에는 오직 비동기 데이터 페칭만 수행하여 린터 경고 원천 차단
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (e) {
        console.error('Failed to load site settings:', e);
      }
    }
    loadSettings();
  }, []);

  // 1. 긴급 점검 모드일 경우 화면 차단 + 활성화 시각 및 점검 내용 출력 + 관리자 비상구 제공
  if (settings?.isMaintenanceMode) {
    const formattedTime = settings.maintenanceUpdatedAt 
      ? new Date(settings.maintenanceUpdatedAt).toLocaleString('ko-KR', {
          dateStyle: 'medium',
          timeStyle: 'medium',
        })
      : '기록 없음';

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4 text-center text-gray-800 dark:text-gray-200">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-2xl border border-red-500/30 max-w-md w-full space-y-6">
          <div className="w-16 h-16 mx-auto bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center">
            <ShieldAlert size={32} />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">시스템 긴급 점검 중</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              더 나은 서비스 제공을 위해 시스템 점검을 진행하고 있습니다.
            </p>

            {/* 점검 시간 및 점검 내용 안내 박스 */}
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                <Clock size={15} className="shrink-0" />
                <span>점검 시간 : {formattedTime}</span>
              </div>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold">
                <FileText size={15} className="shrink-0" />
                <span>점검 내용 : {settings.maintenanceMessage || '시스템 서버 안정화 작업'}</span>
              </div>
            </div>
          </div>

          {/* 관리자 비상구 버튼 */}
          <button
            onClick={() => router.push('/admin')}
            className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Settings size={16} /> 관리자 페이지로 이동 (점검 해제)
          </button>
        </div>
      </div>
    );
  }

  const handleMenuClick = (featureKey: string, path: string) => {
    if (settings?.disabledFeatures?.[featureKey as keyof typeof settings.disabledFeatures]) {
      alert('현재 관리자에 의해 일시적으로 비활성화(OFF)된 기능입니다.');
      return;
    }
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center text-gray-800 dark:text-gray-200 transition-colors duration-300 relative overflow-hidden p-4">
      
      {/* 테마 토글 버튼 (suppressHydrationWarning을 사용하여 서버/클라이언트 테마 속성 불일치 경고 우회) */}
      <button 
        suppressHydrationWarning
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
        className="absolute top-6 right-6 sm:top-8 sm:right-8 p-3 bg-white dark:bg-[#1e1e1e] rounded-full shadow-md border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
      >
        <span className="block dark:hidden"><Moon size={24} /></span>
        <span className="hidden dark:block"><Sun size={24} /></span>
      </button>

      {/* 로고 및 상태메시지 박스 */}
      <div className="text-center mb-8 cursor-pointer" onClick={() => router.push('/')}>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 dark:text-white mb-5 tracking-tight">oneQuiz</h1>
        
        <div className="inline-block bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 px-6 py-3 rounded-2xl shadow-sm max-w-md">
          <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm font-medium tracking-wide">
            {settings?.landingSubtitle || '중간고사 : 10/12 ~ 16, 드론조종사 : 10/21'}
          </p>
        </div>
      </div>

      {/* 메인 메뉴 카드 그리드 (개별 비활성화 상태 반영) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fade-in max-w-5xl justify-items-center">
        
        {/* 시험 응시하기 */}
        <button 
          onClick={() => handleMenuClick('exam', '/exam/subject')}
          className={`flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e1e1e] border rounded-2xl transition-all hover:scale-105 group w-64 shadow-xl dark:shadow-2xl text-left cursor-pointer ${
            settings?.disabledFeatures?.exam ? 'opacity-40 border-gray-300 cursor-not-allowed hover:scale-100' : 'border-gray-200 dark:border-gray-800 hover:border-yellow-500'
          }`}
        >
          <BookOpen size={44} className="text-yellow-600 dark:text-yellow-500 mb-4 group-hover:text-yellow-500 transition-colors" />
          <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">시험 응시하기</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center">과목과 회차를 선택해<br/>맞춤형으로 학습하세요</span>
          {settings?.disabledFeatures?.exam && <span className="mt-2 text-[10px] text-red-500 font-bold">비활성화됨 (OFF)</span>}
        </button>

        {/* 나만의 일기장 */}
        <button 
          onClick={() => handleMenuClick('diary', '/diary')}
          className={`flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e1e1e] border rounded-2xl transition-all hover:scale-105 group w-64 shadow-xl dark:shadow-2xl text-left cursor-pointer ${
            settings?.disabledFeatures?.diary ? 'opacity-40 border-gray-300 cursor-not-allowed hover:scale-100' : 'border-gray-200 dark:border-gray-800 hover:border-blue-500'
          }`}
        >
          <Lock size={44} className="text-blue-500 mb-4 group-hover:text-blue-400 transition-colors" />
          <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">나만의 일기장</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center">로그인 전용 프라이빗<br/>일기를 기록하세요</span>
          {settings?.disabledFeatures?.diary && <span className="mt-2 text-[10px] text-red-500 font-bold">비활성화됨 (OFF)</span>}
        </button>

        {/* 개발 예정 기능 */}
        <button 
          onClick={() => handleMenuClick('ideas', '/ideas')}
          className={`flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e1e1e] border rounded-2xl transition-all hover:scale-105 group w-64 shadow-xl dark:shadow-2xl text-left cursor-pointer ${
            settings?.disabledFeatures?.ideas ? 'opacity-40 border-gray-300 cursor-not-allowed hover:scale-100' : 'border-gray-200 dark:border-gray-800 hover:border-blue-500'
          }`}
        >
          <Lightbulb size={44} className="text-blue-500 mb-4 group-hover:text-blue-400 transition-colors" />
          <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">개발 예정 기능</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center">통합 앱 확장을 위한<br/>아이디어를 기록하세요</span>
          {settings?.disabledFeatures?.ideas && <span className="mt-2 text-[10px] text-red-500 font-bold">비활성화됨 (OFF)</span>}
        </button>

        {/* 관리자 페이지 */}
        <button 
          onClick={() => handleMenuClick('admin', '/admin')}
          className={`flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e1e1e] border rounded-2xl transition-all hover:scale-105 group w-64 shadow-xl dark:shadow-2xl text-left cursor-pointer ${
            settings?.disabledFeatures?.admin ? 'opacity-40 border-gray-300 cursor-not-allowed hover:scale-100' : 'border-gray-200 dark:border-gray-800 hover:border-gray-400'
          }`}
        >
          <Settings size={44} className="text-gray-400 dark:text-gray-500 mb-4 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
          <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">관리자 페이지</span>
          <span className="text-sm text-gray-500 dark:text-gray-400 text-center">문제 추가 및<br/>목록을 관리하세요</span>
          {settings?.disabledFeatures?.admin && <span className="mt-2 text-[10px] text-red-500 font-bold">비활성화됨 (OFF)</span>}
        </button>

      </div>

    </div>
  );
}