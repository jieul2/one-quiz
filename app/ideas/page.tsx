'use client';

import { useState, useEffect } from 'react';
import { Home, Plus, Trash2, Lightbulb, Sparkles, ArrowLeft, Edit3, CheckCircle, Clock, Zap, X } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

interface IdeaType {
  _id: string;
  title: string;
  description: string;
  status: 'idea' | 'progress' | 'completed';
  createdAt: string;
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaType[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idea' | 'progress' | 'completed'>('idea');
  
  // 편집 모드 관련 상태
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      if (isEditing && currentEditId) {
        // 수정 요청
        const res = await fetch('/api/ideas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ _id: currentEditId, title, description, status }),
        });
        if (res.ok) {
          resetForm();
          fetchIdeas();
        }
      } else {
        // 신규 등록 요청
        const res = await fetch('/api/ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, status }),
        });
        if (res.ok) {
          resetForm();
          fetchIdeas();
        }
      }
    } catch (e) {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleEditClick = (item: IdeaType) => {
    setIsEditing(true);
    setCurrentEditId(item._id);
    setTitle(item.title);
    setDescription(item.description || '');
    setStatus(item.status);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentEditId(null);
    setTitle('');
    setDescription('');
    setStatus('idea');
  };

  const handleDeleteIdea = async (id: string) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/ideas?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchIdeas();
    } catch (e) {
      alert('삭제 실패');
    }
  };

  if (!mounted) return null;

  // 상태별 카드 분류
  const ideaList = ideas.filter(i => i.status === 'idea');
  const progressList = ideas.filter(i => i.status === 'progress');
  const completedList = ideas.filter(i => i.status === 'completed');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-800 dark:text-gray-200 p-4 md:p-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 상단 네비게이션 바 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 rounded-xl">
              <Lightbulb size={26} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 dark:text-white">🚀 통합 앱 프로젝트 로드맵</h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">아이디어를 기획하고 개발 현황을 체계적으로 관리하세요.</p>
            </div>
          </div>
          <Link href="/" className="flex items-center gap-2 text-sm bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] px-4 py-2.5 rounded-xl transition-colors font-medium">
            <ArrowLeft size={16} /> 메인으로
          </Link>
        </div>

        {/* 아이디어 등록 / 수정 폼 */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Sparkles size={16} className="text-yellow-500" />
              {isEditing ? '기능 아이디어 수정 중...' : '새로운 기능 아이디어 추가'}
            </h2>
            {isEditing && (
              <button type="button" onClick={resetForm} className="text-xs text-red-500 hover:underline flex items-center gap-1 cursor-pointer">
                <X size={14} /> 수정 취소
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input 
              type="text" 
              placeholder="기능 제목 (예: AI 오답노트 자동생성)" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="md:col-span-2 w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
              required
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white cursor-pointer font-medium"
            >
              <option value="idea">💡 아이디어</option>
              <option value="progress">⚡ 개발 중</option>
              <option value="completed">✅ 개발 완료</option>
            </select>
          </div>

          <textarea 
            placeholder="상세 설명이나 구현 방안을 적어주세요..." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
          />

          <button 
            type="submit" 
            className={`w-full font-bold py-3 rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm ${
              isEditing ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black'
            }`}
          >
            <Plus size={18} /> {isEditing ? '아이디어 수정 완료' : '아이디어 등록하기'}
          </button>
        </form>

        {/* 3단 칸반 보드 레이아웃 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* 1. 아이디어 컬럼 */}
          <div className="bg-gray-100/80 dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> 💡 아이디어 ({ideaList.length})
              </h3>
            </div>

            <div className="space-y-3">
              {ideaList.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8">등록된 아이디어가 없습니다.</div>
              ) : (
                ideaList.map(item => (
                  <KanbanCard key={item._id} item={item} onEdit={handleEditClick} onDelete={handleDeleteIdea} />
                ))
              )}
            </div>
          </div>

          {/* 2. 개발 중 컬럼 */}
          <div className="bg-gray-100/80 dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> ⚡ 개발 중 ({progressList.length})
              </h3>
            </div>

            <div className="space-y-3">
              {progressList.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8">진행 중인 기능이 없습니다.</div>
              ) : (
                progressList.map(item => (
                  <KanbanCard key={item._id} item={item} onEdit={handleEditClick} onDelete={handleDeleteIdea} />
                ))
              )}
            </div>
          </div>

          {/* 3. 개발 완료 컬럼 */}
          <div className="bg-gray-100/80 dark:bg-[#181818] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> ✅ 개발 완료 ({completedList.length})
              </h3>
            </div>

            <div className="space-y-3">
              {completedList.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8">완료된 기능이 없습니다.</div>
              ) : (
                completedList.map(item => (
                  <KanbanCard key={item._id} item={item} onEdit={handleEditClick} onDelete={handleDeleteIdea} />
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// 개별 칸반 카드 컴포넌트
function KanbanCard({ item, onEdit, onDelete }: { item: IdeaType; onEdit: (item: IdeaType) => void; onDelete: (id: string) => void }) {
  return (
    <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700/80 p-4 rounded-xl shadow-sm hover:border-yellow-500 transition-all group flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-snug">{item.title}</h4>
          
          {/* 호버 시 나타나는 편집/삭제 버튼 */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button 
              onClick={() => onEdit(item)} 
              className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors cursor-pointer"
              title="편집"
            >
              <Edit3 size={14} />
            </button>
            <button 
              onClick={() => onDelete(item._id)} 
              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2d2d2d] transition-colors cursor-pointer"
              title="삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed mb-3">
          {item.description || '상세 설명이 없습니다.'}
        </p>
      </div>

      <div className="text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2.5 flex justify-between items-center">
        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
        <span className={`px-2 py-0.5 rounded-full font-bold ${
          item.status === 'completed' ? 'bg-green-500/10 text-green-500' :
          item.status === 'progress' ? 'bg-blue-500/10 text-blue-500' :
          'bg-yellow-500/10 text-yellow-500'
        }`}>
          {item.status === 'completed' ? '개발 완료' : item.status === 'progress' ? '개발 중' : '아이디어'}
        </span>
      </div>
    </div>
  );
}