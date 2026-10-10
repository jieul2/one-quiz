'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Home, Trash2, Filter, PlusCircle, X, Moon, Sun, RotateCcw, Search, ArrowUpDown, AlertTriangle, Lock } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

interface QuestionType {
  _id: string;
  subject: string;
  examType: string;
  questionNumber: number;
  questionType: 'multiple-choice' | 'short-answer';
  title: string;
  codeSnippet?: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  history?: { isCorrect: boolean; timestamp: string }[];
}

const defaultFormData = {
  subject: '',
  examType: '',
  questionNumber: '',
  questionType: 'multiple-choice' as 'multiple-choice' | 'short-answer',
  title: '',
  codeSnippet: '',
  options: ['', '', '', ''],
  correctAnswer: '1',
  explanation: '',
};

export default function AdminPage() {
  // 인증 관련 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [savedQuestions, setSavedQuestions] = useState<QuestionType[]>([]);
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterExamType, setFilterExamType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');

  // 모바일 스크롤 감지 상태 (스크롤 내리면 true -> 과목/회차 필터 숨김)
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 모달 ESC 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // 모바일 카드 목록 스크롤 이벤트 감지
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 20) {
      setIsScrolledDown(true);
    } else {
      setIsScrolledDown(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPassword }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        fetchQuestions();
      } else {
        const data = await res.json();
        setAuthError(data.error || '비밀번호가 틀렸습니다.');
      }
    } catch (error) {
      setAuthError('인증 중 오류가 발생했습니다.');
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/questions');
      const data = await res.json();
      setSavedQuestions(data);
    } catch (error) {
      console.error('Failed to fetch questions');
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentEditId(null);
    setFormData(defaultFormData);
    setMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (q: QuestionType) => {
    setEditMode(true);
    setCurrentEditId(q._id);
    setFormData({
      subject: q.subject,
      examType: q.examType,
      questionNumber: String(q.questionNumber),
      questionType: q.questionType,
      title: q.title,
      codeSnippet: q.codeSnippet || '',
      options: q.options && q.options.length === 4 ? q.options : ['', '', '', ''],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type: 'multiple-choice' | 'short-answer') => {
    setFormData(prev => ({ ...prev, questionType: type, correctAnswer: type === 'multiple-choice' ? '1' : '' }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const submitData = {
      ...formData,
      questionNumber: Number(formData.questionNumber),
      options: formData.questionType === 'multiple-choice' ? formData.options : [],
      ...(editMode && currentEditId ? { _id: currentEditId } : {})
    };

    try {
      const res = await fetch('/api/questions', {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `문제가 성공적으로 ${editMode ? '수정' : '등록'}되었습니다!` });
        fetchQuestions();
        if (!editMode) {
          setFormData((prev) => ({ ...defaultFormData, subject: prev.subject, examType: prev.examType, questionNumber: String(Number(prev.questionNumber) + 1) }));
        } else {
          setTimeout(() => setIsModalOpen(false), 1000);
        }
      } else {
        const errorData = await res.json();
        setMessage({ type: 'error', text: `오류 발생: ${errorData.error || errorData.message}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '서버와 통신하는 중 문제가 발생했습니다.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 문제를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/questions?id=${id}`, { method: 'DELETE' });
      if (res.ok) { alert('삭제되었습니다.'); fetchQuestions(); } 
      else { alert('삭제에 실패했습니다.'); }
    } catch (error) { alert('오류가 발생했습니다.'); }
  };

  const handleResetHistory = async (id: string) => {
    if (!confirm('이 문제의 풀이 기록을 완전히 초기화하시겠습니까?')) return;
    try {
      const res = await fetch('/api/questions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: id, history: [] }),
      });
      if (res.ok) { alert('풀이 기록이 초기화되었습니다.'); fetchQuestions(); } 
      else { alert('기록 초기화에 실패했습니다.'); }
    } catch (error) { alert('서버 오류가 발생했습니다.'); }
  };

  const handleResetAllHistory = async () => {
    if (!confirm('⚠️ 경고: 모든 문제의 누적 풀이 기록이 완전히 삭제됩니다. 진행하시겠습니까?')) return;
    try {
      const res = await fetch('/api/questions?resetAll=true', { method: 'DELETE' });
      if (res.ok) {
        alert('모든 문제의 풀이 기록이 초기화되었습니다.');
        fetchQuestions();
      } else {
        alert('전체 초기화에 실패했습니다.');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다.');
    }
  };

  const subjects = ['All', ...Array.from(new Set(savedQuestions.map(q => q.subject)))];
  const examTypes = ['All', ...Array.from(new Set(savedQuestions.map(q => q.examType)))];
  
  const filteredQuestions = savedQuestions.filter(q => {
    const matchSubject = filterSubject === 'All' || q.subject === filterSubject;
    const matchExamType = filterExamType === 'All' || q.examType === filterExamType;
    const matchSearch = searchQuery === '' || 
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSubject && matchExamType && matchSearch;
  }).sort((a, b) => {
    const aAttempts = a.history?.length || 0;
    const bAttempts = b.history?.length || 0;
    if (sortBy === 'attempts-desc') return bAttempts - aAttempts;
    if (sortBy === 'attempts-asc') return aAttempts - bAttempts;
    return 0;
  });

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
        <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center mb-3">
              <Lock size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">관리자 인증</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">관리자 페이지에 접근하려면 비밀번호를 입력하세요.</p>
          </div>

          {authError && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="관리자 비밀번호 입력"
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold py-3 rounded-xl transition-colors shadow-md text-sm cursor-pointer"
            >
              로그인
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors">
              ← 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-white dark:bg-[#1e1e1e] p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 gap-4">
          <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">⚙️ 문제 관리 대시보드</h1>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button onClick={handleResetAllHistory} className="flex-1 sm:flex-none flex justify-center items-center gap-2 text-sm bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 px-4 py-2 rounded-lg transition-colors cursor-pointer">
              <AlertTriangle size={16} /> 전체 기록 초기화
            </button>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 bg-gray-100 dark:bg-[#252526] rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link href="/" className="flex justify-center items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-[#252526] px-4 py-2 rounded-lg transition-colors">
              <Home size={16} /> 메인으로
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 flex flex-col h-[80vh]">
          <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              등록된 문제 목록 <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 text-xs px-2 py-1 rounded-full">{filteredQuestions.length}개</span>
            </h2>
            <button onClick={openAddModal} className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer">
              <PlusCircle size={18} /> 새 문제 추가
            </button>
          </div>

          {/* 검색, 정렬 및 과목/회차 필터 영역 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {/* 검색창 (항상 유지) */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input type="text" placeholder="문제 내용 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500" />
            </div>
            {/* 정렬 셀렉트 (항상 유지) */}
            <div className="relative">
              <ArrowUpDown size={16} className="absolute left-3 top-3 text-gray-400" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer">
                <option value="default">기본 정렬</option>
                <option value="attempts-desc">풀이 많은 순</option>
                <option value="attempts-asc">풀이 적은 순</option>
              </select>
            </div>
            
            {/* 과목 및 회차 필터 (모바일 스크롤 시 숨김 처리, PC에서는 항상 표시) */}
            <select 
              value={filterSubject} 
              onChange={(e) => setFilterSubject(e.target.value)} 
              className={`bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer transition-all duration-300 ${
                isScrolledDown ? 'hidden lg:block' : 'block'
              }`}
            >
              {subjects.map(s => <option key={s} value={s}>{s === 'All' ? '전체 과목 필터' : s}</option>)}
            </select>
            <select 
              value={filterExamType} 
              onChange={(e) => setFilterExamType(e.target.value)} 
              className={`bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer transition-all duration-300 ${
                isScrolledDown ? 'hidden lg:block' : 'block'
              }`}
            >
              {examTypes.map(e => <option key={e} value={e}>{e === 'All' ? '전체 회차 필터' : e}</option>)}
            </select>
          </div>
          
          {/* 카드 목록 스크롤 영역 */}
          <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto space-y-3 pr-2">
            {filteredQuestions.length === 0 ? (
              <p className="text-gray-500 text-center py-12">조건에 맞는 문제가 없습니다.</p>
            ) : (
              filteredQuestions.map((q) => {
                const attemptCount = q.history?.length || 0;
                const correctCount = q.history?.filter(h => h.isCorrect).length || 0;

                return (
                  <div 
                    key={q._id} 
                    onClick={() => openEditModal(q)}
                    className="flex items-center justify-between bg-gray-50 dark:bg-[#252526] p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors group cursor-pointer"
                  >
                    <div className="overflow-hidden pr-4 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[10px] px-2 py-1 rounded font-bold ${q.questionType === 'multiple-choice' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400'}`}>
                          {q.questionType === 'multiple-choice' ? '객관식' : '단답형'}
                        </span>
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">{q.examType}</span>
                        <span className="text-xs text-yellow-600 dark:text-yellow-500 font-bold">{q.subject}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-800 dark:text-white truncate mb-1">
                        {q.questionNumber}번. {q.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        누적 풀이: <span className="font-bold text-gray-700 dark:text-gray-300">{attemptCount}</span>번 (정답 <span className="text-green-600 dark:text-green-500">{correctCount}</span>번)
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleResetHistory(q._id)} 
                        className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-md cursor-pointer" 
                        title="풀이 기록 초기화"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(q._id)} 
                        className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-md cursor-pointer" 
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col">
              <div className="sticky top-0 z-10 flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editMode ? '문제 수정하기' : '새 문제 추가하기'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer">
                  <X size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                {message && (
                  <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'} flex items-center gap-2 text-sm font-medium`}>
                    {message.type === 'success' && <CheckCircle size={18} />} {message.text}
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-[#252526] rounded-lg">
                    <button type="button" onClick={() => handleTypeChange('multiple-choice')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors cursor-pointer ${formData.questionType === 'multiple-choice' ? 'bg-white dark:bg-yellow-600 text-gray-900 dark:text-black shadow' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]'}`}>객관식 (4지선다)</button>
                    <button type="button" onClick={() => handleTypeChange('short-answer')} className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors cursor-pointer ${formData.questionType === 'short-answer' ? 'bg-white dark:bg-yellow-600 text-gray-900 dark:text-black shadow' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333]'}`}>주관식 (단답형)</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">과목명</label>
                      <input required type="text" name="subject" value={formData.subject} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">기출 회차</label>
                      <input required type="text" name="examType" value={formData.examType} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">문제 번호</label>
                    <input required type="number" name="questionNumber" value={formData.questionNumber} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">문제 내용</label>
                    <textarea required name="title" value={formData.title} onChange={handleChange} rows={3} className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">코드 스니펫 (선택)</label>
                    <textarea name="codeSnippet" value={formData.codeSnippet} onChange={handleChange} rows={4} className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 font-mono text-sm focus:border-yellow-500 focus:outline-none" />
                  </div>

                  {formData.questionType === 'multiple-choice' && (
                    <div className="space-y-3 p-5 bg-gray-50 dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-800">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">4지선다 보기 입력</h3>
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-white shrink-0">{index + 1}</span>
                          <input required={formData.questionType === 'multiple-choice'} type="text" value={formData.options[index]} onChange={(e) => handleOptionChange(index, e.target.value)} className="flex-1 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">정답 입력</label>
                      {formData.questionType === 'multiple-choice' ? (
                        <select name="correctAnswer" value={formData.correctAnswer} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none cursor-pointer">
                          <option value="1">1번</option><option value="2">2번</option><option value="3">3번</option><option value="4">4번</option>
                        </select>
                      ) : (
                        <input required type="text" name="correctAnswer" value={formData.correctAnswer} onChange={handleChange} className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none" />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">해설 (선택)</label>
                      <textarea name="explanation" value={formData.explanation} onChange={handleChange} rows={4} placeholder="해설을 여러 줄로 입력하세요 (엔터 지원)" className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none" />
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold py-3.5 rounded-xl transition-colors shadow-md text-lg mt-4 cursor-pointer">
                    {editMode ? '수정 완료' : '새 문제 저장'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}