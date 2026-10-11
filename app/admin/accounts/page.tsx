'use client';
import { ArrowLeft, Users, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AdminAccountsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] p-6 text-gray-800 dark:text-gray-200">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
          <Link href="/admin" className="p-2 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl"><ArrowLeft size={18} /></Link>
          <Users className="text-blue-500" size={24} />
          <h1 className="text-xl font-bold">사용자 및 계정 관리</h1>
        </div>
        <div className="bg-white dark:bg-[#1e1e1e] p-12 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 text-center space-y-3">
          <Shield size={48} className="mx-auto text-blue-500 opacity-50" />
          <h2 className="text-lg font-bold">계정 관리 모듈 준비 중</h2>
          <p className="text-xs text-gray-500">회원 권한 부여 및 관리자 계정 보안 설정 기능이 추후 업데이트될 예정입니다.</p>
        </div>
      </div>
    </div>
  );
}