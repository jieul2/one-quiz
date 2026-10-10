'use client';

import { useState, useEffect } from 'react';
import { Home, Plus, Trash2, Lightbulb, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

interface IdeaType {
  _id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaType[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      const res = await fetch('/api/ideas');
      const data = await res.json();
      setIdeas(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (res.ok) {
        setTitle('');
        setDescription('');
        fetchIdeas();
      }
    } catch (e) {
      alert('등록 실패');
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!confirm('이 아이디어를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/ideas?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchIdeas();
    } catch (e) {
      alert('삭제 실패');
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-800 dark:text-gray-200 p-4 md:p-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 상단 네비게이션 바 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-xl">
              <Lightbulb size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">🚀 개발 예정 기능 & 아이디어 노트</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">통합 앱 성장을 위한 아이디어를 자유롭게 기록하세요.</p>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] px-4 py-2.5 rounded-xl transition-colors font-medium">
            <ArrowLeft size={16} /> 메인으로
          </Link>
        </div>

        {/* 아이디어 등록 폼 */}
        <form onSubmit={handleAddIdea} className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <Sparkles size={16} className="text-yellow-500" />새 기능 아이디어 추가하기
          </h2>
          <input 
            type="text" 
            placeholder="기능 제목 (예: 오답 노트 AI 분석 기능 추가)" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
            required
          />
          <textarea 
            placeholder="상세 설명이나 구현 아이디어를 적어주세요..." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
          />
          <button 
            type="submit" 
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold py-3 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <Plus size={18} /> 아이디어 등록하기
          </button>
        </form>

        {/* 등록된 아이디어 목록 */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-gray-800 dark:text-white px-1">
            등록된 아이디어 목록 <span className="text-yellow-600 dark:text-yellow-500 font-extrabold">{ideas.length}개</span>
          </h2>

          {ideas.length === 0 ? (
            <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-400">
              아직 등록된 아이디어가 없습니다. 위에서 첫 번째 아이디어를 추가해 보세요!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ideas.map((item) => (
                <div key={item._id} className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between hover:border-yellow-500 transition-colors group">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-base text-gray-900 dark:text-white">{item.title}</h3>
                      <button 
                        onClick={() => handleDeleteIdea(item._id)}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed mb-4">
                      {item.description || '상세 설명이 없습니다.'}
                    </p>
                  </div>
                  <div className="text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800/80 pt-3 flex justify-between items-center">
                    <span>등록일: {new Date(item.createdAt).toLocaleDateString()}</span>
                    <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-2 py-0.5 rounded-full font-bold">개발 예정</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}