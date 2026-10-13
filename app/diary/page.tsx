"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  BookOpen,
  Plus,
  Lock,
  Calendar,
  Edit3,
  Moon,
  Sun,
  Home,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  X,
  UploadCloud,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "";

interface DiaryItemType {
  _id?: string;
  title: string;
  content: string;
  images?: string[];
}

interface DiaryType {
  _id: string;
  title?: string;
  content?: string;
  weather?: string;
  items?: DiaryItemType[];
  createdAt: string;
}

// 👈 날씨 옵션 (선택 시 해당 아이콘만 색상이 진하게 채워짐)
const WEATHER_OPTIONS = [
  { id: "sunny", icon: Sun, activeColor: "text-amber-500 scale-125" },
  { id: "cloudy", icon: Cloud, activeColor: "text-sky-500 scale-125" },
  { id: "rainy", icon: CloudRain, activeColor: "text-blue-600 scale-125" },
  { id: "snowy", icon: Snowflake, activeColor: "text-indigo-500 scale-125" },
  { id: "windy", icon: Wind, activeColor: "text-teal-600 scale-125" },
];

export default function DiaryPage() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [diaries, setDiaries] = useState<DiaryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [newWeather, setNewWeather] = useState("sunny");
  const [newDiaryItems, setNewDiaryItems] = useState<DiaryItemType[]>([
    { title: "", content: "", images: [] },
  ]);

  const [editingDiaryId, setEditingDiaryId] = useState<string | null>(null);
  const [editWeather, setEditWeather] = useState("sunny");
  const [editItems, setEditItems] = useState<DiaryItemType[]>([]);

  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDiaries = async () => {
    try {
      const res = await fetch("/api/diary");
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
      if (status === "authenticated") {
        setIsLoading(true);
        try {
          const res = await fetch("/api/diary");
          if (res.ok && isMounted) {
            const data = await res.json();
            setDiaries(data);
          }
        } catch (e) {
          console.error(e);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else if (status === "unauthenticated") {
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [status]);

  if (!mounted) return null;

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#121212] flex flex-col items-center justify-center p-4 text-center text-gray-800 dark:text-gray-200 gap-3">
        <Loader2 size={36} className="animate-spin text-blue-500" />
        <p className="text-xs font-bold tracking-wider text-gray-500 dark:text-gray-400">
          일기장 데이터를 안전하게 불러오는 중...
        </p>
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
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
              나만의 비밀 일기장
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              일기장을 확인하려면 로그인이 필요합니다.
            </p>
          </div>
          <button
            onClick={() => signIn()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md text-sm cursor-pointer"
          >
            로그인하기
          </button>
          <div>
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
            >
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
    const isValid = newDiaryItems.some((item) => item.title.trim() && item.content.trim());
    if (!isValid) {
      alert("최소 한 개 이상의 항목에 제목과 내용을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newDiaryItems, weather: newWeather }),
      });

      if (res.ok) {
        setNewDiaryItems([{ title: "", content: "", images: [] }]);
        setNewWeather("sunny");
        fetchDiaries();
      } else {
        const data = await res.json();
        alert(data.error || "작성 실패");
      }
    } catch (e) {
      alert("서버 오류");
    }
  };

  const handleUpdate = async (diaryId: string) => {
    try {
      const res = await fetch("/api/diary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: diaryId, items: editItems, weather: editWeather }),
      });

      const data = await res.json();
      if (res.ok) {
        setEditingDiaryId(null);
        fetchDiaries();
      } else {
        alert(data.error || "수정 실패");
      }
    } catch (e) {
      alert("서버 오류");
    }
  };

  const handleNewCloudinaryUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert("Cloudinary 환경 변수가 설정되지 않았습니다.");
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          uploadedUrls.push(data.secure_url);
        }
      }

      setNewDiaryItems((prev) => {
        const newItems = [...prev];
        if (!newItems[index].images) newItems[index].images = [];
        newItems[index].images = Array.from(new Set([...newItems[index].images!, ...uploadedUrls]));
        return newItems;
      });
    } catch (error) {
      console.error(error);
      alert("이미지 업로드 오류");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleEditCloudinaryUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      alert("Cloudinary 환경 변수가 설정되지 않았습니다.");
      return;
    }

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          uploadedUrls.push(data.secure_url);
        }
      }

      setEditItems((prev) => {
        const newItems = [...prev];
        if (!newItems[index].images) newItems[index].images = [];
        newItems[index].images = Array.from(new Set([...newItems[index].images!, ...uploadedUrls]));
        return newItems;
      });
    } catch (error) {
      console.error(error);
      alert("이미지 업로드 오류");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const toggleCard = (diaryId: string) => {
    setOpenCards((prev) => ({
      ...prev,
      [diaryId]: !prev[diaryId],
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] p-4 md:p-8 text-gray-800 dark:text-gray-200 transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 상단 헤더 */}
        <div className="flex justify-between items-center bg-white dark:bg-[#1e1e1e] p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-extrabold text-gray-900 dark:text-white">
                📖 나만의 일기장
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                계정: <span className="font-bold text-blue-500">{session.user?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2.5 bg-gray-100 dark:bg-[#2d2d2d] rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              title="테마 변경"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
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
          <form
            onSubmit={handleCreate}
            className="bg-white dark:bg-[#1e1e1e] p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-800 space-y-4"
          >
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Plus size={16} className="text-blue-500" /> 오늘의 일기 작성하기
              </h2>
              <span className="text-[11px] text-gray-400">오늘의 날씨 아이콘을 선택하세요</span>
            </div>

            {/* 👈 컴팩트한 순수 루시드 아이콘 선택 UI */}
            <div className="flex items-center gap-4 py-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">날씨</label>
              <div className="flex items-center gap-4">
                {WEATHER_OPTIONS.map((opt) => {
                  const IconComponent = opt.icon;
                  const isSelected = newWeather === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNewWeather(opt.id)}
                      className={`transition-all cursor-pointer ${
                        isSelected
                          ? `${opt.activeColor}`
                          : "text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400"
                      }`}
                    >
                      <IconComponent size={20} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-1">
              {newDiaryItems.map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-[#252526] p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 relative group"
                >
                  <span className="text-xs font-extrabold text-blue-500">항목 #{index + 1}</span>

                  <input
                    type="text"
                    placeholder="제목을 입력하세요..."
                    value={item.title}
                    onChange={(e) => {
                      const newItems = [...newDiaryItems];
                      newItems[index].title = e.target.value;
                      setNewDiaryItems(newItems);
                    }}
                    className="w-full p-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <textarea
                    rows={3}
                    placeholder="내용을 입력하세요..."
                    value={item.content}
                    onChange={(e) => {
                      const newItems = [...newDiaryItems];
                      newItems[index].content = e.target.value;
                      setNewDiaryItems(newItems);
                    }}
                    className="w-full p-2.5 bg-white dark:bg-[#1e1e1e] border border-gray-300 dark:border-gray-700 rounded-lg text-sm resize-none text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />

                  {/* 사진 업로드 영역 */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-1.5 w-max px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-blue-500/30">
                      <UploadCloud size={15} /> 사진 첨부하기
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleNewCloudinaryUpload(index, e)}
                        className="hidden"
                      />
                    </label>

                    {item.images && item.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.images.map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 group"
                          >
                            <img
                              src={imgUrl}
                              alt="업로드 이미지"
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setNewDiaryItems((prev) => {
                                  const newItems = [...prev];
                                  newItems[index].images = newItems[index].images?.filter(
                                    (_, i) => i !== imgIdx,
                                  );
                                  return newItems;
                                });
                              }}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setNewDiaryItems([...newDiaryItems, { title: "", content: "", images: [] }])
                }
                className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-dashed border-blue-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={16} /> 새로운 항목 추가하기 (+)
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUploading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow cursor-pointer"
              >
                {isUploading ? "사진 업로드 중..." : "일기 저장하기"}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl flex items-center justify-between text-blue-600 dark:text-blue-400">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="shrink-0" />
              <div>
                <p className="text-xs font-bold">오늘의 일기를 이미 작성하셨습니다.</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  아래 일기 카드를 펼쳐서 <b>[수정하기]</b>를 누르면 날씨 및 항목을 수정할 수
                  있습니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 작성한 일기 목록 */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            작성한 일기 목록{" "}
            <span className="text-blue-500 font-extrabold">{diaries.length}개</span>
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

              const formattedDate = diaryDate.toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });

              const diaryItems =
                diary.items && Array.isArray(diary.items)
                  ? diary.items
                  : [
                      {
                        title: diary.title || "제목 없음",
                        content: diary.content || "",
                        images: [],
                      },
                    ];

              // 👈 카드 헤더 배지용 아이콘 (색상이 채워진 형태)
              const currentWeatherData =
                WEATHER_OPTIONS.find((w) => w.id === (diary.weather || "sunny")) ||
                WEATHER_OPTIONS[0];
              const WeatherIcon = currentWeatherData.icon;

              const isEditing = editingDiaryId === diary._id;
              const isOpen = openCards[diary._id] || isEditing;

              return (
                <div
                  key={diary._id}
                  className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-all"
                >
                  {/* 카드 헤더 */}
                  <div
                    onClick={() => !isEditing && toggleCard(diary._id)}
                    className="flex justify-between items-center p-5 bg-gray-50/50 dark:bg-[#1e1e1e] hover:bg-gray-100/60 dark:hover:bg-[#252526] transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Calendar size={14} className="text-blue-500" /> {formattedDate}
                      </span>
                      {/* 👈 텍스트 없이 컴팩트한 색칠된 날씨 아이콘 배지 */}
                      <span className={`flex items-center ${currentWeatherData.activeColor}`}>
                        <WeatherIcon size={18} />
                      </span>
                      {isToday && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 font-bold px-2 py-0.5 rounded-full">
                          오늘
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {isToday && (
                        <div>
                          {!isEditing ? (
                            <button
                              onClick={() => {
                                setEditingDiaryId(diary._id);
                                setEditWeather(diary.weather || "sunny");
                                setEditItems(JSON.parse(JSON.stringify(diaryItems)));
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-[#2d2d2d] text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Edit3 size={14} /> 수정하기
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
                                disabled={isUploading}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded-xl font-bold cursor-pointer shadow"
                              >
                                {isUploading ? "업로드 중..." : "저장하기"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => toggleCard(diary._id)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                      >
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* 카드 본문 */}
                  {isOpen && (
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 space-y-4 animate-fade-in">
                      {isEditing ? (
                        <div className="space-y-4 pt-1">
                          {/* 👈 수정 모드 컴팩트 아이콘 선택 */}
                          <div className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-800">
                            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              날씨 변경
                            </label>
                            <div className="flex items-center gap-4">
                              {WEATHER_OPTIONS.map((opt) => {
                                const IconComponent = opt.icon;
                                const isSelected = editWeather === opt.id;
                                return (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setEditWeather(opt.id)}
                                    className={`transition-all cursor-pointer ${
                                      isSelected
                                        ? `${opt.activeColor}`
                                        : "text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400"
                                    }`}
                                  >
                                    <IconComponent size={20} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {editItems.map((item, index) => (
                            <div
                              key={index}
                              className="bg-gray-50 dark:bg-[#252526] p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3"
                            >
                              <span className="text-xs font-extrabold text-blue-500">
                                항목 #{index + 1}
                              </span>
                              <input
                                type="text"
                                placeholder="제목을 입력하세요..."
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

                              <div className="space-y-2 pt-2">
                                <label className="flex items-center gap-1.5 w-max px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-blue-500/30">
                                  <UploadCloud size={15} /> 사진 추가
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleEditCloudinaryUpload(index, e)}
                                    className="hidden"
                                  />
                                </label>

                                {item.images && item.images.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    {item.images.map((imgUrl, imgIdx) => (
                                      <div
                                        key={imgIdx}
                                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 group"
                                      >
                                        <img
                                          src={imgUrl}
                                          alt="업로드 이미지"
                                          className="w-full h-full object-cover"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditItems((prev) => {
                                              const newItems = [...prev];
                                              newItems[index].images = newItems[
                                                index
                                              ].images?.filter((_, i) => i !== imgIdx);
                                              return newItems;
                                            });
                                          }}
                                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() =>
                              setEditItems([...editItems, { title: "", content: "", images: [] }])
                            }
                            className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-dashed border-blue-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus size={16} /> 새로운 항목 추가하기 (+)
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {diaryItems.map((item, index) => (
                            <div key={index} className="space-y-2 last:mb-0">
                              <h3 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-[10px] shrink-0">
                                  {index + 1}
                                </span>
                                {item.title}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed pl-7">
                                {item.content}
                              </p>

                              {item.images && item.images.length > 0 && (
                                <div className="pl-7 pt-1 flex flex-wrap items-center gap-2">
                                  {item.images.map((img, imgIdx) => (
                                    <button
                                      key={imgIdx}
                                      onClick={() => setViewingImage(img)}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-[#2d2d2d] hover:bg-gray-200 dark:hover:bg-[#383838] text-blue-500 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                    >
                                      <ImageIcon size={13} /> 사진 보기 ({imgIdx + 1})
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black transition-colors cursor-pointer z-10"
            >
              <X size={20} />
            </button>
            <img
              src={viewingImage}
              alt="확대 이미지"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
