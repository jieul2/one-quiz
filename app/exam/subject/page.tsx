'use client';

import { useState, useEffect, Suspense } from 'react';
import { BookOpen, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function SubjectSelectionContent() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    async function fetchQuestions() {
      try {
        const res = await fetch('/api/questions');
        const data = await res.json();
        setQuestions(data);
      } catch (e) {
        console.error(e);
      }
    }
    fetchQuestions();
  }, []);

  if (!mounted) return null;

  const subjects = Array.from(new Set(questions.map(q => q.subject)));

  const handleNext = () => {
    // 다음 단계(회차 선택 페이지)로 선택한 과목명을 쿼리스트링으로 전달합니다.
    router.push(`/exam/type?subject=${encodeURIComponent(selectedSubject)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center text-gray-800 dark:text-gray-200 p-4 transition-colors">
      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="text-yellow-500" size={22} /> 1단계: 과목 선택
          </h2>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">처음으로</Link>
        </div>

        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-1">
          <button
            onClick={() => setSelectedSubject('All')}
            className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all cursor-pointer ${selectedSubject === 'All' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            <span>전체 과목 통합 응시</span>
            {selectedSubject === 'All' && <CheckCircle2 size={18} className="text-yellow-500" />}
          </button>

          {subjects.map(sub => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all cursor-pointer ${selectedSubject === sub ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              <span>{sub}</span>
              {selectedSubject === sub && <CheckCircle2 size={18} className="text-yellow-500" />}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Link href="/" className="flex-1 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors text-center flex items-center justify-center gap-1.5">
            <ArrowLeft size={16} /> 취소
          </Link>
          <button onClick={handleNext} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md">
            다음 <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}

export default function SubjectSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <SubjectSelectionContent />
    </Suspense>
  );
}