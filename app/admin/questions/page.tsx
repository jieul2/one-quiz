"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  Home,
  Trash2,
  PlusCircle,
  X,
  Moon,
  Sun,
  RotateCcw,
  Search,
  ArrowUpDown,
  AlertTriangle,
  ArrowLeft,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Minus,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

interface QuestionType {
  _id: string;
  subject: string;
  examType: string;
  questionNumber: number;
  questionType: "multiple-choice" | "short-answer";
  title: string;
  codeSnippet?: string;
  options?: string[];
  correctAnswer: string[]; // 복수 정답 배열
  explanation?: string;
  history?: { isCorrect: boolean; timestamp: string }[];
}

const defaultFormData = {
  subject: "",
  examType: "",
  questionNumber: "",
  questionType: "multiple-choice" as "multiple-choice" | "short-answer",
  title: "",
  codeSnippet: "",
  options: ["", "", "", ""],
  correctAnswer: ["1"], // 태그형태의 정답 배열 상태
  currentTagInput: "", // 태그 입력 중인 임시 텍스트
  explanation: "",
};

export default function AdminQuestionsPage() {
  const [savedQuestions, setSavedQuestions] = useState<QuestionType[]>([]);
  const [filterSubject, setFilterSubject] = useState("All");
  const [filterExamType, setFilterExamType] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const [showQuestionId, setShowQuestionId] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchQuestions();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isModalOpen) setIsModalOpen(false);
        if (isSettingsOpen) setIsSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isSettingsOpen]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch("/api/questions");
      const data = await res.json();
      setSavedQuestions(data);
    } catch (error) {
      console.error("Failed to fetch questions");
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
      codeSnippet: q.codeSnippet || "",
      options: q.options && q.options.length >= 2 ? q.options : ["", "", "", ""],
      correctAnswer:
        Array.isArray(q.correctAnswer) && q.correctAnswer.length > 0 ? q.correctAnswer : ["1"],
      currentTagInput: "",
      explanation: q.explanation || "",
    });
    setMessage(null);
    setIsModalOpen(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (type: "multiple-choice" | "short-answer") => {
    setFormData((prev) => ({
      ...prev,
      questionType: type,
      correctAnswer: type === "multiple-choice" ? ["1"] : [],
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const handleAddOption = () => {
    setFormData((prev) => ({ ...prev, options: [...prev.options, ""] }));
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length <= 2) {
      alert("객관식 보기는 최소 2개 이상이어야 합니다.");
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  // 👈 태그 입력 핸들러 (엔터 또는 쉼표 입력 시 태그로 등록)
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = formData.currentTagInput.trim();
      if (val && !formData.correctAnswer.includes(val)) {
        setFormData((prev) => ({
          ...prev,
          correctAnswer: [...prev.correctAnswer, val],
          currentTagInput: "",
        }));
      }
    }
  };

  // 태그 삭제 핸들러
  const handleRemoveTag = (tagToRemove: string) => {
    if (formData.correctAnswer.length <= 1) {
      alert("최소 한 개 이상의 정답이 필요합니다.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      correctAnswer: prev.correctAnswer.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // 만약 인풋창에 입력하다가 엔터를 안 쳤다면 마지막 남은 텍스트도 정답 배열에 포함
    const finalAnswers = [...formData.correctAnswer];
    const leftover = formData.currentTagInput.trim();
    if (leftover && !finalAnswers.includes(leftover)) {
      finalAnswers.push(leftover);
    }

    if (finalAnswers.length === 0) {
      setMessage({ type: "error", text: "최소 한 개 이상의 정답을 입력해주세요." });
      return;
    }

    const submitData = {
      subject: formData.subject,
      examType: formData.examType,
      questionNumber: Number(formData.questionNumber),
      questionType: formData.questionType,
      title: formData.title,
      codeSnippet: formData.codeSnippet,
      options: formData.questionType === "multiple-choice" ? formData.options : [],
      correctAnswer: finalAnswers,
      explanation: formData.explanation,
      ...(editMode && currentEditId ? { _id: currentEditId } : {}),
    };

    try {
      const res = await fetch("/api/questions", {
        method: editMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: `문제가 성공적으로 ${editMode ? "수정" : "등록"}되었습니다!`,
        });
        fetchQuestions();
        if (!editMode) {
          setFormData((prev) => ({
            ...defaultFormData,
            subject: prev.subject,
            examType: prev.examType,
            questionNumber: String(Number(prev.questionNumber) + 1),
            correctAnswer: ["1"],
          }));
        } else {
          setTimeout(() => setIsModalOpen(false), 1000);
        }
      } else {
        const errorData = await res.json();
        setMessage({ type: "error", text: `오류 발생: ${errorData.error || errorData.message}` });
      }
    } catch (error) {
      setMessage({ type: "error", text: "서버와 통신하는 중 문제가 발생했습니다." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말로 이 문제를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/questions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("삭제되었습니다.");
        fetchQuestions();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      alert("오류가 발생했습니다.");
    }
  };

  const handleResetHistory = async (id: string) => {
    if (!confirm("이 문제의 풀이 기록을 완전히 초기화하시겠습니까?")) return;
    try {
      const res = await fetch("/api/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, history: [] }),
      });
      if (res.ok) {
        alert("풀이 기록이 초기화되었습니다.");
        fetchQuestions();
      } else {
        alert("기록 초기화에 실패했습니다.");
      }
    } catch (error) {
      alert("서버 오류가 발생했습니다.");
    }
  };

  const handleResetAllHistory = async () => {
    if (!confirm("⚠️ 경고: 모든 문제의 누적 풀이 기록이 완전히 삭제됩니다. 진행하시겠습니까?"))
      return;
    try {
      const res = await fetch("/api/questions?resetAll=true", { method: "DELETE" });
      if (res.ok) {
        alert("모든 문제의 풀이 기록이 초기화되었습니다.");
        fetchQuestions();
      } else {
        alert("전체 초기화에 실패했습니다.");
      }
    } catch (error) {
      alert("서버 오류가 발생했습니다.");
    }
  };

  const subjects = ["All", ...Array.from(new Set(savedQuestions.map((q) => q.subject)))];
  const examTypes = ["All", ...Array.from(new Set(savedQuestions.map((q) => q.examType)))];

  const filteredQuestions = savedQuestions
    .filter((q) => {
      const matchSubject = filterSubject === "All" || q.subject === filterSubject;
      const matchExamType = filterExamType === "All" || q.examType === filterExamType;

      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        query === "" ||
        q.title.toLowerCase().includes(query) ||
        q.subject.toLowerCase().includes(query) ||
        q._id.toLowerCase().includes(query);

      return matchSubject && matchExamType && matchSearch;
    })
    .sort((a, b) => {
      const aAttempts = a.history?.length || 0;
      const bAttempts = b.history?.length || 0;
      if (sortBy === "attempts-desc") return bAttempts - aAttempts;
      if (sortBy === "attempts-asc") return aAttempts - bAttempts;
      return 0;
    });

  if (!mounted) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-[#121212]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 상단 네비게이션 바 */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center bg-white dark:bg-[#1e1e1e] p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="p-2 bg-gray-100 dark:bg-[#2d2d2d] rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
              📚 문항 및 시험 DB 관리
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 text-sm bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#383838] px-4 py-2 rounded-lg transition-colors cursor-pointer font-bold"
            >
              <Settings size={16} /> 페이지 설정
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 bg-gray-100 dark:bg-[#252526] rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link
              href="/"
              className="flex justify-center items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-[#252526] px-4 py-2 rounded-lg transition-colors"
            >
              <Home size={16} /> 메인으로
            </Link>
          </div>
        </div>

        {/* 문제 목록 대시보드 */}
        <div className="bg-white dark:bg-[#1e1e1e] p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-800 flex flex-col h-[82vh]">
          <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-800 pb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              등록된 문제 목록{" "}
              <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 text-xs px-2 py-1 rounded-full">
                {filteredQuestions.length}개
              </span>
            </h2>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              <PlusCircle size={18} /> 새 문제 추가
            </button>
          </div>

          {/* 검색 및 필터 컨트롤 바 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="relative sm:col-span-2 lg:col-span-1 flex items-center">
              <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="문제 내용 또는 ID 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 text-gray-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 h-full px-1.5 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                  title="검색어 초기화"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="relative flex items-center">
              <ArrowUpDown
                size={16}
                className="absolute left-3 text-gray-400 pointer-events-none"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 appearance-none cursor-pointer text-gray-900 dark:text-white"
              >
                <option value="default">기본 정렬</option>
                <option value="attempts-desc">풀이 많은 순</option>
                <option value="attempts-asc">풀이 적은 순</option>
              </select>
            </div>

            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className={`bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer text-gray-900 dark:text-white transition-all ${isScrolledDown ? "hidden lg:block" : "block"}`}
            >
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "전체 과목 필터" : s}
                </option>
              ))}
            </select>

            <select
              value={filterExamType}
              onChange={(e) => setFilterExamType(e.target.value)}
              className={`bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 cursor-pointer text-gray-900 dark:text-white transition-all ${isScrolledDown ? "hidden lg:block" : "block"}`}
            >
              {examTypes.map((e) => (
                <option key={e} value={e}>
                  {e === "All" ? "전체 회차 필터" : e}
                </option>
              ))}
            </select>
          </div>

          <div
            onScroll={(e) => setIsScrolledDown(e.currentTarget.scrollTop > 20)}
            className="flex-1 overflow-y-auto space-y-3 pr-2"
          >
            {filteredQuestions.length === 0 ? (
              <p className="text-gray-500 text-center py-12">조건에 맞는 문제가 없습니다.</p>
            ) : (
              filteredQuestions.map((q) => {
                const attemptCount = q.history?.length || 0;
                const correctCount = q.history?.filter((h) => h.isCorrect).length || 0;

                return (
                  <div
                    key={q._id}
                    onClick={() => openEditModal(q)}
                    className="flex items-center justify-between bg-gray-50 dark:bg-[#252526] p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors group cursor-pointer"
                  >
                    <div className="overflow-hidden pr-4 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`text-[10px] px-2 py-1 rounded font-bold ${q.questionType === "multiple-choice" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400"}`}
                        >
                          {q.questionType === "multiple-choice" ? "객관식" : "단답형"}
                        </span>
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                          {q.examType}
                        </span>
                        <span className="text-xs text-yellow-600 dark:text-yellow-500 font-bold">
                          {q.subject}
                        </span>

                        {showQuestionId && (
                          <span className="text-[11px] font-mono bg-gray-200/70 dark:bg-black/40 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded animate-fade-in">
                            ID: {q._id}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-800 dark:text-white truncate mb-1">
                        {q.questionNumber}번. {q.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        누적 풀이:{" "}
                        <span className="font-bold text-gray-700 dark:text-gray-300">
                          {attemptCount}
                        </span>
                        번 (정답{" "}
                        <span className="text-green-600 dark:text-green-500">{correctCount}</span>
                        번)
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleResetHistory(q._id)}
                        className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-600 hover:text-white rounded-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                        title="풀이 기록 초기화"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(q._id)}
                        className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition-all duration-200 hover:scale-110 cursor-pointer"
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

        {/* 페이지 설정 모달 */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6 animate-fade-in border border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Settings size={20} className="text-yellow-500" /> 관리 페이지 설정
                </h3>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-[#2d2d2d] rounded-full hover:bg-gray-200 cursor-pointer"
                >
                  <X size={18} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      문제 카드에 ID 표시
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      문제 목록 카드에서 고유 MongoDB ID 가시성을 제어합니다.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowQuestionId(!showQuestionId)}
                    className={`p-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                      showQuestionId
                        ? "bg-yellow-500 text-black shadow-sm"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {showQuestionId ? <Eye size={16} /> : <EyeOff size={16} />}
                    <span>{showQuestionId ? "표시 중 (ON)" : "숨김 (OFF)"}</span>
                  </button>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-500/20 space-y-2">
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">위험 구역</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    모든 문제의 누적 풀이 및 정답 기록을 영구적으로 초기화합니다.
                  </p>
                  <button
                    onClick={() => {
                      setIsSettingsOpen(false);
                      handleResetAllHistory();
                    }}
                    className="w-full flex justify-center items-center gap-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    <AlertTriangle size={15} /> 전체 문제 풀이 기록 초기화 실행
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-3 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 문제 추가/수정 모달 */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col">
              <div className="sticky top-0 z-10 flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editMode ? "문제 수정하기" : "새 문제 추가하기"}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              <div className="p-6">
                {message && (
                  <div
                    className={`p-4 mb-6 rounded-lg ${message.type === "success" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"} flex items-center gap-2 text-sm font-medium`}
                  >
                    {message.type === "success" && <CheckCircle size={18} />} {message.text}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="flex gap-2 p-1.5 bg-gray-100 dark:bg-[#252526] rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleTypeChange("multiple-choice")}
                      className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors cursor-pointer ${formData.questionType === "multiple-choice" ? "bg-white dark:bg-yellow-600 text-gray-900 dark:text-black shadow" : "text-gray-500 dark:text-gray-400 hover:bg-gray-200"}`}
                    >
                      객관식
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange("short-answer")}
                      className={`flex-1 py-2 rounded-md text-sm font-bold transition-colors cursor-pointer ${formData.questionType === "short-answer" ? "bg-white dark:bg-yellow-600 text-gray-900 dark:text-black shadow" : "text-gray-500 dark:text-gray-400 hover:bg-gray-200"}`}
                    >
                      주관식 (단답형)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">
                        과목명
                      </label>
                      <input
                        required
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">
                        기출 회차
                      </label>
                      <input
                        required
                        type="text"
                        name="examType"
                        value={formData.examType}
                        onChange={handleChange}
                        className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">
                      문제 번호
                    </label>
                    <input
                      required
                      type="number"
                      name="questionNumber"
                      value={formData.questionNumber}
                      onChange={handleChange}
                      className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">
                      문제 내용
                    </label>
                    <textarea
                      required
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      rows={3}
                      className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">
                      코드 스니펫 (선택)
                    </label>
                    <textarea
                      name="codeSnippet"
                      value={formData.codeSnippet}
                      onChange={handleChange}
                      rows={4}
                      className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 font-mono text-sm focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  {/* 객관식 보기 동적 추가/삭제 UI */}
                  {formData.questionType === "multiple-choice" && (
                    <div className="space-y-3 p-5 bg-gray-50 dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-800">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          객관식 보기 입력 (최소 2개 이상)
                        </h3>
                        <button
                          type="button"
                          onClick={handleAddOption}
                          className="flex items-center gap-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                        >
                          <Plus size={14} /> 보기 추가
                        </button>
                      </div>

                      {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-white shrink-0">
                            {index + 1}
                          </span>
                          <input
                            required={formData.questionType === "multiple-choice"}
                            type="text"
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            placeholder={`${index + 1}번 보기 입력...`}
                            className="flex-1 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none text-gray-900 dark:text-white"
                          />
                          {formData.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(index)}
                              className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg cursor-pointer transition-colors"
                              title="보기 삭제"
                            >
                              <Minus size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 👈 태그 입력 방식 정답 관리 UI */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">
                      정답 관리 (입력 후 <strong>Enter</strong> 또는 <strong>쉼표(,)</strong>를
                      누르면 태그로 추가됩니다)
                    </label>
                    <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 min-h-[46px]">
                      {formData.correctAnswer.map((tag, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1.5 bg-yellow-500/15 dark:bg-yellow-600/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-yellow-500/30 animate-fade-in"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-red-500 transition-colors cursor-pointer"
                            title="삭제"
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                        name="currentTagInput"
                        value={formData.currentTagInput}
                        onChange={handleChange}
                        onKeyDown={handleTagKeyDown}
                        placeholder={
                          formData.correctAnswer.length === 0
                            ? "정답을 입력하고 Enter를 누르세요..."
                            : "추가 정답 입력..."
                        }
                        className="flex-1 bg-transparent border-none outline-none text-sm min-w-[140px] text-gray-900 dark:text-white placeholder:text-gray-400"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400">
                      예: 객관식인 경우 `1`, 복수 정답인 경우 `HTML`, `html` 각각 입력 후 Enter
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-400">
                      해설 (선택)
                    </label>
                    <textarea
                      name="explanation"
                      value={formData.explanation}
                      onChange={handleChange}
                      rows={4}
                      placeholder="해설을 여러 줄로 입력하세요 (엔터 지원)"
                      className="w-full bg-gray-50 dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 rounded-lg p-2.5 text-sm focus:border-yellow-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white dark:text-black font-bold py-3.5 rounded-xl transition-colors shadow-md text-lg mt-4 cursor-pointer"
                  >
                    {editMode ? "수정 완료" : "새 문제 저장"}
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
