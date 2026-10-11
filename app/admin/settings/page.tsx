'use client';
import { ArrowLeft, Settings, Sliders } from 'lucide-react';
import Link from 'next/link';

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] p-6 text-gray-800 dark:text-gray-200">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
          <Link href="/admin" className="p-2 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl"><ArrowLeft size={18} /></Link>
          <Settings className="text-green-500" size={24} />
          <h1 className="text-xl font-bold">사이트 전역 설정</h1>
        </div>
        <div className="bg-white dark:bg-[#1e1e1e] p-12 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 text-center space-y-3">
          <Sliders size={48} className="mx-auto text-green-500 opacity-50" />
          <h2 className="text-lg font-bold">사이트 설정 모듈 준비 중</h2>
          <p className="text-xs text-gray-500">서비스 점검 모드, 플랫폼 이름 변경 및 글로벌 환경설정 기능이 추가될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}