'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { BookOpen, Plus, Lock, Calendar, Edit3, Moon, Sun, Home, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

interface DiaryItemType {
  _id?: string;
  title: string;
  content: string;
}

interface DiaryType {
  _id: string;
  title?: string;
  content?: string;
  items?: DiaryItemType[];
  createdAt: string;
}

export default function DiaryPage() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  
  const [mounted, setMounted] = useState(false);
  const [diaries, setDiaries] = useState<DiaryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<DiaryItemType[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDiaries = async () => {
    try {
      const res = await fetch('/api/diary');
      if (res.ok) {
        const data = await res.json();
        setDiaries(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (status === 'authenticated') {
        setIsLoading(true);
        try {
          const res = await fetch('/api/diary');
          if (res.ok && isMounted) {
            const data = await res.json();
            setDiaries(data);
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else if (status === 'unauthenticated') {
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [status]);

  if (!mounted) return null;

  if (status === 'loading' || (status === 'authenticated' && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4 text-center text-gray-800 dark:text-gray-200 gap-3">
        <Loader2 size={36} className="animate-spin text-blue-500" />
        <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">일기장 데이터를 안전하게 불러오는 중...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Lock size={28} />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">나만의 비밀 일기장</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">일기장을 확인하려면 로그인이 필요합니다.</p>
          </div>
          <button
            onClick={() => signIn()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md text-sm cursor-pointer"
          >
            로그인하기
          </button>
          <div>
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors">
              ← 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const todayStr = new Date().toDateString();
  const todayDiary = diaries.find((diary) => new Date(diary.createdAt).toDateString() === todayStr);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert('제목과 내용을 입력해주세요.');

    try {
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        setTitle('');
        setContent('');
        fetchDiaries();
      } else {
        const data = await res.json();
        alert(data.error || '작성 실패');
      }
    } catch (e) {
      alert('서버 오류');
    }
  };

  const handleUpdate = async (diaryId: string) => {
    try {
      const res = await fetch('/api/diary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: diaryId, items: editItems }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingDiaryId(null);
        fetchDiaries();
      } else {
        alert(data.error || '수정 실패');
      }
    } catch (e) {
      alert('서버 오류');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] p-4 md:p-8 text-gray-800 dark:text-gray-200 transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* 상단 네비게이션 헤더 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">📖 나만의 일기장</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                계정: <span className="font-bold text-blue-500">{session.user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              title="테마 변경"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => signOut()}
              className="px-3.5 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              로그아웃
            </button>
            <Link 
              href="/" 
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#353535] px-4 py-2.5 rounded-xl transition-colors font-medium text-gray-700 dark:text-gray-300"
            >
              <Home size={16} /> 메인으로
            </Link>
          </div>
        </div>

        {/* 오늘 일기 작성 폼 */}
        {!todayDiary ? (
          <form onSubmit={handleCreate} className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 space-y-4">
            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Plus size={16} /> 오늘의 일기 작성하기
            </h2>
            <input
              type="text"
              placeholder="제목을 입력하세요..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
            />
            <textarea
              placeholder="오늘 하루는 어땠나요? 마음속 이야기를 적어보세요..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:border-blue-500 resize-none text-gray-900 dark:text-white"
            />
            <div className="flex justify-end">
              <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow cursor-pointer">
                일기 저장
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl flex items-center justify-between text-blue-600 dark:text-blue-400">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="shrink-0" />
              <div>
                <p className="text-xs font-bold">오늘의 일기를 이미 작성하셨습니다.</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">아래 오늘의 일기 카드에서 <b>[수정하기]</b>를 누르면 새로운 항목을 추가하거나 편집하실 수 있습니다.</p>
              </div>
            </div>
          </div>
        )}

        {/* 작성한 일기 목록 */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            작성한 일기 목록 <span className="text-blue-500 font-extrabold">{diaries.length}개</span>
          </h2>

          {diaries.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-200 dark:border-gray-800 text-gray-400 text-sm">
              작성된 일기가 없습니다. 오늘 첫 일기를 작성해보세요!
            </div>
          ) : (
            diaries.map((diary) => {
              const diaryDate = new Date(diary.createdAt);
              const nowDate = new Date();
              const isToday = 
                diaryDate.getFullYear() === nowDate.getFullYear() &&
                diaryDate.getMonth() === nowDate.getMonth() &&
                diaryDate.getDate() === nowDate.getDate();

              const formattedDate = diaryDate.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });

              const diaryItems = diary.items && Array.isArray(diary.items) 
                ? diary.items 
                : [{ title: diary.title || '제목 없음', content: diary.content || '' }];

              const isEditing = editingDiaryId === diary._id;

              return (
                <div key={diary._id} className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-4">
                  
                  <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Calendar size={14} className="text-blue-500" /> {formattedDate}
                    </span>

                    <div>
                      {isToday ? (
                        !isEditing ? (
                          <button
                            onClick={() => {
                              setEditingDiaryId(diary._id);
                              setEditItems(JSON.parse(JSON.stringify(diaryItems)));
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-[#2d2d2d] text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Edit3 size={14} /> 수정하기 (항목 추가 가능)
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setEditingDiaryId(null)} 
                              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-xs rounded-xl font-bold cursor-pointer"
                            >
                              취소
                            </button>
                            <button 
                              onClick={() => handleUpdate(diary._id)} 
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-bold cursor-pointer shadow"
                            >
                              저장하기
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">수정 불가</span>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 pt-1">
                      {editItems.map((item, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-[#252526] p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                          <span className="text-xs font-extrabold text-blue-500">항목 #{index + 1}</span>
                          <input
                            type="text"
                            placeholder="제목을 입력하세요 (비워두면 저장되지 않습니다)..."
                            value={item.title}
                            onChange={(e) => {
                              const newItems = [...editItems];
                              newItems[index].title = e.target.value;
                              setEditItems(newItems);
                            }}
                            className="w-full p-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                          <textarea
                            rows={3}
                            placeholder="내용을 입력하세요..."
                            value={item.content}
                            onChange={(e) => {
                              const newItems = [...editItems];
                              newItems[index].content = e.target.value;
                              setEditItems(newItems);
                            }}
                            className="w-full p-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-lg text-sm resize-none text-gray-900 dark:text-white"
                          />
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => setEditItems([...editItems, { title: '', content: '' }])}
                        className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-dashed border-blue-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus size={16} /> 새로운 제목·내용 항목 추가하기 (+)
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {diaryItems.map((item, index) => (
                        <div key={index} className="space-y-1.5 last:mb-0">
                          <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] shrink-0">{index + 1}</span>
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed pl-7">
                            {item.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}