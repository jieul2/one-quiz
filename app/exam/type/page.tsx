'use client';

import { useState, useEffect, Suspense } from 'react';
import { FileText, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ExamTypeSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedSubject = searchParams.get('subject') || 'All';

  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedExamType, setSelectedExamType] = useState<string>('All');
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

  // 선택한 과목에 해당하는 회차들만 필터링
  const examTypes = Array.from(new Set(
    questions
      .filter(q => selectedSubject === 'All' || q.subject === selectedSubject)
      .map(q => q.examType)
  ));

  const handleStartExam = () => {
    router.push(`/exam?subject=${encodeURIComponent(selectedSubject)}&examType=${encodeURIComponent(selectedExamType)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center text-gray-800 dark:text-gray-200 p-4 transition-colors">
      <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="text-yellow-500" size={22} /> 2단계: 회차 선택
          </h2>
          <Link href="/exam/subject" className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">과목 재선택</Link>
        </div>

        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-1">
          <button
            onClick={() => setSelectedExamType('All')}
            className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all cursor-pointer ${selectedExamType === 'All' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
          >
            <span>모든 회차 전체 포함</span>
            {selectedExamType === 'All' && <CheckCircle2 size={18} className="text-yellow-500" />}
          </button>

          {examTypes.map(exam => (
            <button
              key={exam}
              onClick={() => setSelectedExamType(exam)}
              className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all cursor-pointer ${selectedExamType === exam ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              <span>{exam}</span>
              {selectedExamType === exam && <CheckCircle2 size={18} className="text-yellow-500" />}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <Link href="/exam/subject" className="flex-1 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors text-center flex items-center justify-center gap-1.5">
            <ArrowLeft size={16} /> 이전
          </Link>
          <button onClick={handleStartExam} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer">
            시험 시작 <ArrowRight size={16} />
          </button>
        </div>

      </div>
    </div>
  );
}

export default function ExamTypeSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <ExamTypeSelectionContent />
    </Suspense>
  );
}