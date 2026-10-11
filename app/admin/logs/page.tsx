'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Terminal, Moon, Sun, Search, User, Clock, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

interface LogType {
  _id: string;
  userId?: string;
  email: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  statusCode: number;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  ip: string;
  userAgent: string;
  responseTime: number;
  message: string;
  timestamp: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogType[]>([]);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  
  // 서버사이드 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const limit = 20;

  const { theme, setTheme } = useTheme();

  // useCallback을 사용하여 린터 경고를 방지하고 함수 안정성 확보
  const fetchLogsData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());
      if (selectedUser !== 'ALL') params.set('email', selectedUser);
      if (methodFilter !== 'ALL') params.set('method', methodFilter);
      if (levelFilter !== 'ALL') params.set('level', levelFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentPage, selectedUser, methodFilter, levelFilter, searchQuery]);

  // 비동기 로딩을 안전하게 처리하기 위한 분리된 이펙트 훅
  useEffect(() => {
    let isMounted = true;

    async function load() {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', limit.toString());
      if (selectedUser !== 'ALL') params.set('email', selectedUser);
      if (methodFilter !== 'ALL') params.set('method', methodFilter);
      if (levelFilter !== 'ALL') params.set('level', levelFilter);
      if (searchQuery) params.set('search', searchQuery);

      try {
        const res = await fetch(`/api/logs?${params.toString()}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setLogs(data.logs || []);
          setTotalPages(data.totalPages || 1);
          setTotalCount(data.total || 0);
        }
      } catch (e) {
        console.error(e);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [currentPage, selectedUser, methodFilter, levelFilter, searchQuery]);

  // 전체 회원 목록 콤보박스를 위해 데이터 기반 유저 추출
  const uniqueUsers = Array.from(new Set(logs.map(log => log.email))).filter(Boolean);

  // 프론트엔드 추가 필터링
  const filteredLogs = logs.filter(log => {
    const matchesMethod = methodFilter === 'ALL' || log.method === methodFilter;
    const matchesLevel = levelFilter === 'ALL' || log.level === levelFilter;
    const matchesSearch = 
      log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.endpoint.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMethod && matchesLevel && matchesSearch;
  });

  const handleFilterChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] p-4 md:p-8 text-gray-800 dark:text-gray-200 transition-colors">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* 상단 네비게이션 헤더 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                <Terminal size={22} />
              </div>
              <div>
                <h1 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">시스템 감사 및 활동 로그</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">회원별 활동 및 API 호출 내역 감사 모듈 (DB 페이징 적용)</p>
              </div>
            </div>
          </div>

          <button 
            suppressHydrationWarning
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
            className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl text-gray-600 dark:text-gray-400 cursor-pointer"
          >
            <span className="block dark:hidden"><Moon size={18} /></span>
            <span className="hidden dark:block"><Sun size={18} /></span>
          </button>
        </div>

        {/* 컨트롤 패널 */}
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-md p-4 md:p-5 flex flex-col lg:flex-row justify-between items-center gap-4">
          
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* 회원별 필터 콤보박스 */}
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2">
              <User size={15} className="text-purple-500 shrink-0" />
              <select
                value={selectedUser}
                onChange={(e) => handleFilterChange(setSelectedUser, e.target.value)}
                className="bg-transparent text-xs focus:outline-none text-gray-900 dark:text-white dark:bg-[#2d2d2d] cursor-pointer font-medium"
              >
                <option value="ALL" className="dark:bg-[#1e1e1e] dark:text-white">전체 회원 보기</option>
                {uniqueUsers.map(email => (
                  <option key={email} value={email} className="dark:bg-[#1e1e1e] dark:text-white">{email}</option>
                ))}
              </select>
            </div>

            {/* HTTP 메서드별 필터 버튼 */}
            <div className="flex items-center gap-1">
              {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((method) => (
                <button
                  key={method}
                  onClick={() => handleFilterChange(setMethodFilter, method)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    methodFilter === method 
                      ? 'bg-purple-500 text-white shadow' 
                      : 'bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#383838]'
                  }`}
                >
                  {method === 'ALL' ? '모든 메서드' : method}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            <select
              value={levelFilter}
              onChange={(e) => handleFilterChange(setLevelFilter, e.target.value)}
              className="bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white cursor-pointer font-medium"
            >
              <option value="ALL" className="dark:bg-[#1e1e1e] dark:text-white">로그 레벨 전체</option>
              <option value="INFO" className="dark:bg-[#1e1e1e] dark:text-white">INFO</option>
              <option value="WARN" className="dark:bg-[#1e1e1e] dark:text-white">WARN</option>
              <option value="ERROR" className="dark:bg-[#1e1e1e] dark:text-white">ERROR</option>
              <option value="SECURITY" className="dark:bg-[#1e1e1e] dark:text-white">SECURITY</option>
            </select>

            <div className="relative flex-1 sm:w-48">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                placeholder="경로 검색..." 
                value={searchQuery}
                onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
              />
            </div>
          </div>

        </div>

        {/* 로그 리스트 출력 영역 */}
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-md p-4 md:p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Activity size={16} className="text-purple-500" /> 수집된 로그 총 누적 <span className="text-purple-600 dark:text-purple-400 font-extrabold">{totalCount}건</span>
            </h2>
            <button onClick={fetchLogsData} className="text-xs text-purple-500 hover:underline cursor-pointer">
              새로고침
            </button>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              조건에 일치하는 로그가 없습니다.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredLogs.map(log => (
                <LogItem key={log._id} log={log} />
              ))}
            </div>
          )}

          {/* 페이지네이션 컨트롤러 */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                페이지 <strong className="text-purple-500">{currentPage}</strong> / {totalPages} (총 {totalCount}건)
              </span>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-gray-100 dark:bg-[#2d2d2d] rounded-lg disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => {
                    if (
                      pageNumber === 1 || 
                      pageNumber === totalPages || 
                      (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setCurrentPage(pageNumber)}
                          className={`w-8 h-8 rounded-lg font-bold transition-all cursor-pointer ${
                            currentPage === pageNumber
                              ? 'bg-purple-500 text-white shadow'
                              : 'bg-gray-100 dark:bg-[#2d2d2d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#383838]'
                          }`}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (
                      pageNumber === currentPage - 3 || 
                      pageNumber === currentPage + 3
                    ) {
                      return <span key={pageNumber} className="text-gray-400 px-1">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-gray-100 dark:bg-[#2d2d2d] rounded-lg disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-[#383838] transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

function LogItem({ log }: { log: LogType }) {
  const methodColor = {
    GET: 'text-green-500 bg-green-500/10 border-green-500/30',
    POST: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    PUT: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
    DELETE: 'text-red-500 bg-red-500/10 border-red-500/30',
  }[log.method] || 'text-gray-500 bg-gray-500/10';

  return (
    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700/60 p-3.5 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-xs hover:border-purple-500 transition-all">
      <div className="flex items-start md:items-center gap-3 overflow-hidden">
        <span className={`px-2.5 py-1 rounded-md font-mono font-bold text-[10px] border shrink-0 ${methodColor}`}>
          {log.method}
        </span>

        <div className="overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 dark:text-white font-mono truncate">{log.endpoint}</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500">
              {log.statusCode}
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400 truncate mt-0.5">{log.message}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500 shrink-0 self-end md:self-center">
        <span className="font-mono bg-gray-100 dark:bg-[#2d2d2d] px-2 py-1 rounded text-gray-600 dark:text-gray-300">
          ⏱️ {log.responseTime}ms
        </span>
        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 font-medium">
          <User size={12} /> {log.email}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {new Date(log.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}