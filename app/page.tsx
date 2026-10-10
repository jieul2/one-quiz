'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Settings, Moon, Sun, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // 단계별 선택 상태 ('main' | 'select-subject' | 'select-exam')
  const [step, setStep] = useState<'main' | 'select-subject' | 'select-exam'>('main');
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [selectedExamType, setSelectedExamType] = useState<string>('All');

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
  // 선택된 과목에 해당하는 회차들만 추출
  const examTypes = Array.from(new Set(
    questions
      .filter(q => selectedSubject === 'All' || q.subject === selectedSubject)
      .map(q => q.examType)
  ));

  const handleStartExam = () => {
    // 쿼리 스트링으로 과목과 회차 정보를 전달합니다.
    router.push(`/exam?subject=${encodeURIComponent(selectedSubject)}&examType=${encodeURIComponent(selectedExamType)}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center text-gray-800 dark:text-gray-200 transition-colors duration-300 relative overflow-hidden p-4">
      
      {/* 테마 토글 버튼 */}
      <button 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
        className="absolute top-6 right-6 sm:top-8 sm:right-8 p-3 bg-white dark:bg-[#1e1e1e] rounded-full shadow-md border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      {/* 로고 영역 */}
      <div className="text-center mb-10">
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">oneQuiz</h1>
        <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg font-medium">내가 공부하려고 만든 APP</p>
      </div>

      {/* 1단계: 메인 메뉴 */}
      {step === 'main' && (
        <div className="flex flex-col sm:flex-row gap-6 animate-fade-in">
          <button 
            onClick={() => setStep('select-subject')}
            className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 hover:border-yellow-500 dark:hover:border-yellow-500 rounded-2xl transition-all hover:scale-105 group w-64 shadow-xl dark:shadow-2xl text-left cursor-pointer"
          >
            <BookOpen size={48} className="text-yellow-600 dark:text-yellow-500 mb-4 group-hover:text-yellow-500 dark:group-hover:text-yellow-400 transition-colors" />
            <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">시험 응시하기</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 text-center">과목과 회차를 선택해<br/>맞춤형으로 학습하세요</span>
          </button>

          <button 
            onClick={() => router.push('/admin')}
            className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-500 rounded-2xl transition-all hover:scale-105 group w-64 shadow-xl dark:shadow-2xl text-left cursor-pointer"
          >
            <Settings size={48} className="text-gray-400 dark:text-gray-500 mb-4 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            <span className="text-xl font-bold text-gray-900 dark:text-white mb-2">관리자 페이지</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 text-center">문제 추가 및<br/>목록을 관리하세요</span>
          </button>
        </div>
      )}

      {/* 2단계: 과목 선택 팝업/카드 */}
      {step === 'select-subject' && (
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">📚 1단계: 과목 선택</h2>
            <button onClick={() => setStep('main')} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">처음으로</button>
          </div>

          <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedSubject('All')}
              className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all ${selectedSubject === 'All' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              <span>전체 과목 통합 응시</span>
              {selectedSubject === 'All' && <CheckCircle2 size={18} className="text-yellow-500" />}
            </button>

            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all ${selectedSubject === sub ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                <span>{sub}</span>
                {selectedSubject === sub && <CheckCircle2 size={18} className="text-yellow-500" />}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('main')} className="flex-1 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors">이전</button>
            <button onClick={() => { setSelectedExamType('All'); setStep('select-exam'); }} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
              다음 <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 3단계: 회차 선택 팝업/카드 */}
      {step === 'select-exam' && (
        <div className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">📝 2단계: 회차 선택</h2>
            <button onClick={() => setStep('select-subject')} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">과목 재선택</button>
          </div>

          <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedExamType('All')}
              className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all ${selectedExamType === 'All' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
            >
              <span>모든 회차 전체 포함</span>
              {selectedExamType === 'All' && <CheckCircle2 size={18} className="text-yellow-500" />}
            </button>

            {examTypes.map(exam => (
              <button
                key={exam}
                onClick={() => setSelectedExamType(exam)}
                className={`w-full p-4 rounded-xl border text-left font-bold flex justify-between items-center transition-all ${selectedExamType === exam ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400' : 'bg-gray-50 dark:bg-[#252526] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                <span>{exam}</span>
                {selectedExamType === exam && <CheckCircle2 size={18} className="text-yellow-500" />}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep('select-subject')} className="flex-1 py-3 bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors">이전</button>
            <button onClick={handleStartExam} className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg">
              시험 시작하기 <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}