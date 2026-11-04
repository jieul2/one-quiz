/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import {
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Search,
  PenSquare,
  FilePlus,
  Lock,
  BookOpen,
  Folder,
  X,
  UploadCloud,
  Loader2,
  Image as ImageIcon,
  Edit3,
  Calendar,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";

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

interface NoteItem {
  id: string;
  folder: string;
  title: string;
  content: string;
  updatedAt: string;
}

const WEATHER_OPTIONS = [
  { id: "sunny", label: "맑음", icon: Sun },
  { id: "cloudy", label: "흐림", icon: Cloud },
  { id: "rainy", label: "비", icon: CloudRain },
  { id: "snowy", label: "눈", icon: Snowflake },
  { id: "windy", label: "바람", icon: Wind },
];

export function DiaryView({ initialTab = "diary" }: { initialTab?: "diary" | "notes" }) {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"diary" | "notes">(initialTab);
  const [diaries, setDiaries] = useState<DiaryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // 저장 상태 인디케이터 관리
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>("");

  // 일기 카드 펼침/접힘 상태 (기본 디폴트: 모두 접혀있음)
  const [expandedDiaryIds, setExpandedDiaryIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedDiaryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // New Diary form state
  const [weather, setWeather] = useState("sunny");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);

  // Edit Diary state (당일 일기 수정)
  const [editingDiary, setEditingDiary] = useState<DiaryType | null>(null);
  const [editWeather, setEditWeather] = useState("sunny");
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [isEditUploading, setIsEditUploading] = useState(false);

  // Image Lightbox Viewer
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Notes state (localStorage backed)
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("전체");
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  // 로컬스토리지 노트 로드
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("onequiz_notes_data");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) setNotes(parsed);
          } catch {}
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // 일기 데이터 로드
  const fetchDiaries = async () => {
    try {
      const res = await fetch("/api/diary");
      if (res.ok) {
        const data = await res.json();
        setDiaries(data);
      }
    } catch (e) {
      console.error("Failed to load diaries:", e);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadDiaries() {
      if (status === "authenticated") {
        try {
          const res = await fetch("/api/diary");
          if (res.ok && !ignore) {
            const data = await res.json();
            setDiaries(data);
          }
        } catch (e) {
          console.error("Failed to load diaries:", e);
        } finally {
          if (!ignore) setIsLoading(false);
        }
      } else if (status === "unauthenticated") {
        if (!ignore) setIsLoading(false);
      }
    }
    loadDiaries();
    return () => {
      ignore = true;
    };
  }, [status]);

  // Cloudinary 사진 업로드 핸들러 (신규 작성용)
  const handleCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      toast.warning("Cloudinary 환경 변수가 설정되지 않았습니다.");
      return;
    }

    setIsUploading(true);
    const newUrls: string[] = [];

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
          if (data.secure_url) {
            newUrls.push(data.secure_url);
          }
        } else {
          console.error("Cloudinary upload failed for file:", file.name);
        }
      }

      setImages((prev) => Array.from(new Set([...prev, ...newUrls])));
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      toast.error("사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Cloudinary 사진 업로드 핸들러 (수정용)
  const handleEditCloudinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      toast.warning("Cloudinary 환경 변수가 설정되지 않았습니다.");
      return;
    }

    setIsEditUploading(true);
    const newUrls: string[] = [];

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
          if (data.secure_url) {
            newUrls.push(data.secure_url);
          }
        }
      }

      setEditImages((prev) => Array.from(new Set([...prev, ...newUrls])));
    } catch (err) {
      console.error("Cloudinary upload error:", err);
      toast.error("사진 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsEditUploading(false);
      e.target.value = "";
    }
  };

  // 신규 일기 작성 제출
  const handleCreateDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSubmitting(true);
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weather,
          items: [{ title: title.trim(), content: content.trim(), images }],
        }),
      });
      if (res.ok) {
        setTitle("");
        setContent("");
        setImages([]);
        setShowWriteModal(false);
        await fetchDiaries();
        const now = new Date();
        setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        setSaveStatus("saved");
        toast.success("오늘의 일기가 성공적으로 등록되었습니다!");
      } else {
        setSaveStatus("error");
        const err = await reloadResError(res);
        toast.error(err || "일기 등록에 실패했습니다. (하루 1회 작성 제한)");
      }
    } catch {
      setSaveStatus("error");
      toast.error("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 일기 수정 모달 열기
  const handleOpenEditModal = (diary: DiaryType) => {
    setEditingDiary(diary);
    setEditWeather(diary.weather || "sunny");
    const firstItem = diary.items && diary.items[0];
    setEditTitle(firstItem?.title || diary.title || "");
    setEditContent(firstItem?.content || diary.content || "");
    setEditImages(firstItem?.images || []);
  };

  // 일기 수정 제출
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDiary) return;
    if (!editTitle.trim() || !editContent.trim()) {
      toast.warning("제목과 내용을 입력해주세요.");
      return;
    }

    setIsEditSubmitting(true);
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/diary", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDiary._id,
          weather: editWeather,
          items: [
            {
              title: editTitle.trim(),
              content: editContent.trim(),
              images: editImages,
            },
          ],
        }),
      });

      if (res.ok) {
        setEditingDiary(null);
        await fetchDiaries();
        const now = new Date();
        setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
        setSaveStatus("saved");
        toast.success("일기가 성공적으로 수정되었습니다.");
      } else {
        setSaveStatus("error");
        const err = await reloadResError(res);
        toast.error(err || "일기 수정에 실패했습니다. (자정이 지난 일기는 수정 불가)");
      }
    } catch {
      setSaveStatus("error");
      toast.error("서버 통신 오류가 발생했습니다.");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const reloadResError = async (res: Response) => {
    try {
      const json = await res.json();
      return json.error || json.message;
    } catch {
      return null;
    }
  };

  // 특정 일기가 오늘 작성된 것인지 확인 (당일 수정 가능 여부 판단)
  const isTodayDiary = (createdAt: string) => {
    const d = new Date(createdAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  };

  // 검색 필터링된 일기
  const filteredDiaries = diaries.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchWeather = (d.weather || "").toLowerCase().includes(q);
    const matchItems = d.items?.some(
      (it) => it.title.toLowerCase().includes(q) || it.content.toLowerCase().includes(q)
    );
    const matchLegacy = (d.title || "").toLowerCase().includes(q) || (d.content || "").toLowerCase().includes(q);
    return matchWeather || matchItems || matchLegacy;
  });

  return (
    <div className="flex flex-col w-full gap-space-lg text-on-surface">
      {/* 1. 상단 액션 바 (라운딩 박스 없이 플랫 헤더) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-outline-variant">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight">
            일기
          </h1>
          {/* 탭 전환 스위처 */}
          <div className="flex items-center bg-surface-container-low p-0.5 rounded-md border border-outline-variant">
            <button
              onClick={() => setActiveTab("diary")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                activeTab === "diary"
                  ? "bg-surface-container text-on-surface font-semibold"
                  : "text-on-surface-variant hover:text-on-surface font-light"
              }`}
            >
              학습 일기
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                activeTab === "notes"
                  ? "bg-surface-container text-on-surface font-semibold"
                  : "text-on-surface-variant hover:text-on-surface font-light"
              }`}
            >
              지식 노트
            </button>
          </div>
        </div>

        {/* 우측 도구 버튼들 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 저장 상태 인디케이터 */}
          <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />

          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              placeholder="일기 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-low pl-8 pr-3 py-1.5 rounded-md border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary w-36 sm:w-44 font-medium"
            />
          </div>

          {activeTab === "diary" ? (
            <>
              {filteredDiaries.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (expandedDiaryIds.size === filteredDiaries.length) {
                      setExpandedDiaryIds(new Set());
                    } else {
                      setExpandedDiaryIds(new Set(filteredDiaries.map((d) => d._id)));
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface text-xs font-medium border border-outline-variant transition-colors cursor-pointer"
                  title={expandedDiaryIds.size === filteredDiaries.length ? "모든 일기 접기" : "모든 일기 펼치기"}
                >
                  <ChevronsUpDown className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {expandedDiaryIds.size === filteredDiaries.length ? "모두 접기" : "모두 펼치기"}
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  setTitle("");
                  setContent("");
                  setImages([]);
                  setShowWriteModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
              >
                <PenSquare className="w-3.5 h-3.5" />
                <span>오늘의 일기 쓰기</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                const titlePrompt = prompt("새 노트 제목을 입력하세요:");
                if (titlePrompt) {
                  const newN: NoteItem = {
                    id: Date.now().toString(),
                    folder: selectedFolder === "전체" ? "일반" : selectedFolder,
                    title: titlePrompt,
                    content: "내용을 입력하세요...",
                    updatedAt: "2026-11-04",
                  };
                  setNotes([newN, ...notes]);
                  setSelectedNote(newN);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>새 노트</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 메인 탭 컨텐츠 */}
      {activeTab === "diary" ? (
        /* ================= DIARY SECTION ================= */
        <div className="flex flex-col gap-space-md">
          {!session ? (
            <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant flex flex-col items-center gap-3">
              <Lock className="w-12 h-12 text-on-surface-variant opacity-40" />
              <p className="font-headline-sm font-bold text-on-surface">로그인이 필요한 기능입니다</p>
              <p className="text-body-sm text-on-surface-variant">
                하루 1회 나만의 학습 일기를 기록하고 회고해보세요.
              </p>
              <button
                onClick={() => signIn()}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-body-sm shadow-xs cursor-pointer"
              >
                로그인하러 가기
              </button>
            </div>
          ) : isLoading ? (
            <div className="p-12 text-center text-on-surface-variant flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span>일기 데이터를 불러오는 중...</span>
            </div>
          ) : filteredDiaries.length === 0 ? (
            <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant flex flex-col items-center gap-3">
              <BookOpen className="w-12 h-12 text-on-surface-variant opacity-40" />
              <p className="font-headline-sm font-bold text-on-surface">작성된 일기가 없습니다</p>
              <p className="text-body-sm text-on-surface-variant">
                오늘 공부하며 느낀 점이나 배운 핵심 개념, 스크린샷 사진을 첫 일기로 남겨보세요.
              </p>
              <button
                onClick={() => {
                  setTitle("");
                  setContent("");
                  setImages([]);
                  setShowWriteModal(true);
                }}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-body-sm shadow-xs cursor-pointer"
              >
                + 첫 일기 작성하기
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
              {filteredDiaries.map((diary) => {
                const isToday = isTodayDiary(diary.createdAt);
                const isExpanded = expandedDiaryIds.has(diary._id);
                const dateFormatted = new Date(diary.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                });

                const weatherObj = WEATHER_OPTIONS.find((w) => w.id === diary.weather);
                const WeatherIcon = weatherObj?.icon || Sun;

                // 항목 목록 정규화
                const itemsList =
                  diary.items && diary.items.length > 0
                    ? diary.items
                    : [
                        {
                          title: diary.title || "오늘의 학습 기록",
                          content: diary.content || "",
                          images: [],
                        },
                      ];

                const primaryItem = itemsList[0];
                const totalImageCount = itemsList.reduce(
                  (acc, it) => acc + (it.images?.length || 0),
                  0
                );

                // 🌟 [상태 1] 접혀있는 카드 (기본 디폴트 - 모든 카드가 일정한 크기 h-[156px] 유지)
                if (!isExpanded) {
                  return (
                    <div
                      key={diary._id}
                      onClick={() => toggleExpand(diary._id)}
                      className="h-[156px] p-3 rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col justify-between hover:border-primary/50 transition-colors cursor-pointer group shadow-2xs"
                      title="클릭하여 일기 상세 내용 열기"
                    >
                      {/* 카드 상단 헤더 */}
                      <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2 gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="font-semibold text-xs text-on-surface truncate">
                            {dateFormatted}
                          </span>
                          {isToday && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                              오늘
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container text-[11px] font-medium text-on-surface-variant border border-outline-variant">
                            <WeatherIcon className="w-3 h-3 text-primary" />
                            <span>{weatherObj?.label || "맑음"}</span>
                          </div>
                        </div>
                      </div>

                      {/* 카드 중간 미리보기 (제목 1줄 + 내용 2줄 말줄임) */}
                      <div className="flex-1 my-1.5 overflow-hidden">
                        <h4 className="font-semibold text-xs sm:text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                          {primaryItem.title}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant font-light line-clamp-2 leading-relaxed mt-1">
                          {primaryItem.content || "기록된 회고 내용이 없습니다."}
                        </p>
                      </div>

                      {/* 카드 하단 메타 및 열기 컨트롤 */}
                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/60 text-xs text-on-surface-variant">
                        <div className="flex items-center gap-1.5">
                          {totalImageCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] bg-surface-container border border-outline-variant px-1.5 py-0.5 rounded font-medium text-on-surface-variant">
                              <ImageIcon size={11} className="text-primary" />
                              <span>사진 {totalImageCount}장</span>
                            </span>
                          )}
                          {isToday && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(diary);
                              }}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[10px] font-medium border border-outline-variant transition-colors cursor-pointer"
                              title="오늘 일기 수정"
                            >
                              <Edit3 size={10} />
                              <span>수정</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5 text-[11px] text-primary font-medium group-hover:underline">
                          <span>열기</span>
                          <ChevronDown size={13} />
                        </div>
                      </div>
                    </div>
                  );
                }

                // 🌟 [상태 2] 열린 카드 (카드를 열었을 때 전체 본문 및 사진 갤러리 표시)
                return (
                  <div
                    key={diary._id}
                    className="min-h-[156px] p-3.5 sm:p-4 rounded-lg bg-surface-container-lowest border border-primary/50 ring-1 ring-primary/20 flex flex-col justify-between transition-all gap-3 shadow-sm"
                  >
                    {/* 카드 헤더 */}
                    <div className="flex items-center justify-between border-b border-outline-variant/60 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span className="font-semibold text-xs sm:text-sm text-on-surface">
                          {dateFormatted}
                        </span>
                        {isToday && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                            오늘
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* 날씨 뱃지 */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-container text-[11px] font-medium text-on-surface-variant border border-outline-variant">
                          <WeatherIcon className="w-3 h-3 text-primary" />
                          <span>{weatherObj?.label || "맑음"}</span>
                        </div>

                        {/* 당일 일기 수정 버튼 */}
                        {isToday && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(diary)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[11px] font-medium border border-outline-variant transition-colors cursor-pointer"
                            title="오늘 일기 수정"
                          >
                            <Edit3 size={11} />
                            <span>수정</span>
                          </button>
                        )}

                        {/* 상단 접기 버튼 */}
                        <button
                          type="button"
                          onClick={() => toggleExpand(diary._id)}
                          className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-surface-container-low hover:bg-surface-container text-on-surface-variant text-[11px] font-medium border border-outline-variant transition-colors cursor-pointer"
                          title="카드 접기"
                        >
                          <ChevronUp size={12} />
                          <span>접기</span>
                        </button>
                      </div>
                    </div>

                    {/* 카드 본문 전체 항목들 */}
                    <div className="space-y-3">
                      {itemsList.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1.5">
                          <h4 className="font-semibold text-sm sm:text-base text-on-surface leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-xs sm:text-sm text-on-surface-variant font-light whitespace-pre-wrap leading-relaxed">
                            {item.content}
                          </p>

                          {/* Cloudinary 사진 갤러리 그리드 */}
                          {item.images && item.images.length > 0 && (
                            <div className="pt-2">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant mb-1.5">
                                <ImageIcon size={13} className="text-primary" />
                                <span>첨부된 사진 ({item.images.length}장)</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {item.images.map((imgUrl, imgIdx) => (
                                  <div
                                    key={imgIdx}
                                    onClick={() => setViewingImage(imgUrl)}
                                    className="relative aspect-video rounded-md overflow-hidden border border-outline-variant bg-surface-container-low cursor-pointer group shadow-2xs hover:border-primary transition-all"
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={`학습 사진 ${imgIdx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <Maximize2 size={15} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 카드 하단 접기 컨트롤 */}
                    <div className="flex items-center justify-end pt-2 border-t border-outline-variant/60">
                      <button
                        type="button"
                        onClick={() => toggleExpand(diary._id)}
                        className="flex items-center gap-1 text-[11px] text-on-surface-variant hover:text-on-surface font-medium cursor-pointer"
                      >
                        <span>접기</span>
                        <ChevronUp size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ================= NOTES SECTION (원퀴즈 폴더 스타일) ================= */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-start">
          {/* Folders List (Col 4) */}
          <div className="md:col-span-4 p-space-md bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xs flex flex-col gap-2">
            <span className="font-label-sm text-on-surface-variant font-bold px-1">폴더 목록</span>
            {["전체", "일반", "기출 요약", "스터디 노트"].map((folderName) => {
              const count = folderName === "전체" ? notes.length : notes.filter((n) => n.folder === folderName).length;
              return (
                <button
                  key={folderName}
                  onClick={() => setSelectedFolder(folderName)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-body-sm transition-colors cursor-pointer ${
                    selectedFolder === folderName
                      ? "bg-surface-container text-on-surface font-bold border border-outline-variant/60 shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-primary" />
                    <span>{folderName}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container-high font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Notes List & Editor (Col 8) */}
          <div className="md:col-span-8 flex flex-col gap-space-sm">
            {notes.filter((n) => selectedFolder === "전체" || n.folder === selectedFolder).length === 0 ? (
              <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant flex flex-col items-center gap-2">
                <FilePlus className="w-8 h-8 text-on-surface-variant opacity-40 mb-1" />
                <p className="text-sm font-semibold text-on-surface">작성된 지식 노트가 없습니다</p>
                <p className="text-xs text-on-surface-variant font-light">
                  {selectedFolder !== "전체" ? `"${selectedFolder}" 폴더에 노트가 없습니다.` : "학습한 핵심 개념이나 요약 노트를 기록해보세요."}
                </p>
              </div>
            ) : (
              notes
                .filter((n) => selectedFolder === "전체" || n.folder === selectedFolder)
                .map((note) => (
                  <div
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`p-space-md rounded-2xl border transition-all cursor-pointer ${
                      selectedNote?.id === note.id
                        ? "bg-surface-container-low border-primary ring-1 ring-primary/20"
                        : "bg-surface-container-lowest border-outline-variant hover:bg-surface-container-low/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-headline-sm font-bold text-on-surface">{note.title}</span>
                      <span className="text-[11px] text-on-surface-variant font-mono">{note.updatedAt}</span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant line-clamp-2 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* 3. 🌟 새 일기 작성 모달 (Cloudinary 사진 업로드 기능 포함) */}
      {showWriteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl p-5 sm:p-6 flex flex-col gap-4 text-on-surface">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2.5">
              <span className="font-semibold text-base text-on-surface">오늘의 학습 일기</span>
              <button
                onClick={() => setShowWriteModal(false)}
                className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDiary} className="flex flex-col gap-3.5 text-xs sm:text-sm">
              {/* 날씨 선택 */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface-variant text-xs">오늘의 날씨:</span>
                <div className="flex items-center gap-1.5">
                  {WEATHER_OPTIONS.map((w) => {
                    const Icon = w.icon;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setWeather(w.id)}
                        className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                          weather === w.id
                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                            : "border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface"
                        }`}
                        title={w.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 제목 */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface text-xs">
                  일기 제목 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="예: 기출 30문제 풀이 및 취약점 분석"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-surface-container-low p-2 rounded-md border border-outline-variant text-on-surface focus:outline-none focus:border-primary font-medium text-xs sm:text-sm"
                />
              </div>

              {/* 내용 */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface text-xs">
                  오늘의 회고 내용 <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="오늘 어떤 내용을 학습했고, 어떤 점을 보완해야 할지 기록하세요..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="bg-surface-container-low p-2 rounded-md border border-outline-variant text-on-surface focus:outline-none focus:border-primary resize-none font-normal leading-relaxed text-xs sm:text-sm"
                />
              </div>

              {/* 🌟 Cloudinary 사진 업로드 컨트롤 */}
              <div className="space-y-2 pt-1 border-t border-outline-variant/60">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface text-xs">학습 사진 첨부</span>
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-md text-xs font-medium transition-colors cursor-pointer">
                    <UploadCloud size={13} className="text-primary" />
                    <span>사진 추가 (Cloudinary)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleCloudinaryUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {isUploading && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 text-primary text-xs font-medium animate-pulse">
                    <Loader2 size={13} className="animate-spin" />
                    <span>Cloudinary로 사진을 안전하게 업로드하는 중입니다...</span>
                  </div>
                )}

                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {images.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative w-14 h-14 rounded-md overflow-hidden border border-outline-variant bg-surface-container group shadow-2xs"
                      >
                        <img src={imgUrl} alt="업로드 이미지" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="사진 삭제"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowWriteModal(false)}
                  className="px-3 py-1.5 rounded-md text-on-surface-variant hover:bg-surface-container font-medium text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-4 py-1.5 rounded-md bg-primary text-on-primary font-bold text-xs hover:opacity-90 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "저장 중..." : "등록하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. 🌟 일기 수정 모달 (당일 일기 수정 & 사진 추가/삭제) */}
      {editingDiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl p-5 sm:p-6 flex flex-col gap-4 text-on-surface">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2.5">
              <span className="font-semibold text-base text-on-surface">오늘의 일기 수정</span>
              <button
                onClick={() => setEditingDiary(null)}
                className="p-1 rounded-md hover:bg-surface-container text-on-surface-variant cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3.5 text-xs sm:text-sm">
              {/* 날씨 선택 */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface-variant text-xs">날씨:</span>
                <div className="flex items-center gap-1.5">
                  {WEATHER_OPTIONS.map((w) => {
                    const Icon = w.icon;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setEditWeather(w.id)}
                        className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
                          editWeather === w.id
                            ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                            : "border-outline-variant bg-surface-container-low hover:bg-surface-container text-on-surface"
                        }`}
                        title={w.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 제목 */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface text-xs">일기 제목</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-surface-container-low p-2 rounded-md border border-outline-variant text-on-surface focus:outline-none focus:border-primary font-medium text-xs sm:text-sm"
                />
              </div>

              {/* 내용 */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface text-xs">회고 내용</label>
                <textarea
                  required
                  rows={4}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="bg-surface-container-low p-2 rounded-md border border-outline-variant text-on-surface focus:outline-none focus:border-primary resize-none font-normal leading-relaxed text-xs sm:text-sm"
                />
              </div>

              {/* 🌟 수정 모달 내 사진 관리 */}
              <div className="space-y-2 pt-1 border-t border-outline-variant/60">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface text-xs">첨부 사진 ({editImages.length})</span>
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant rounded-md text-xs font-medium transition-colors cursor-pointer">
                    <UploadCloud size={13} className="text-primary" />
                    <span>사진 추가 (Cloudinary)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleEditCloudinaryUpload}
                      disabled={isEditUploading}
                      className="hidden"
                    />
                  </label>
                </div>

                {isEditUploading && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-primary/10 text-primary text-xs font-medium animate-pulse">
                    <Loader2 size={13} className="animate-spin" />
                    <span>새 사진을 업로드하고 있습니다...</span>
                  </div>
                )}

                {editImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {editImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative w-14 h-14 rounded-md overflow-hidden border border-outline-variant bg-surface-container group shadow-2xs"
                      >
                        <img src={imgUrl} alt="첨부 이미지" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEditImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="사진 삭제"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 하단 버튼 */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setEditingDiary(null)}
                  className="px-3 py-1.5 rounded-md text-on-surface-variant hover:bg-surface-container font-medium text-xs cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting || isEditUploading}
                  className="px-4 py-1.5 rounded-md bg-primary text-on-primary font-bold text-xs hover:opacity-90 disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isEditSubmitting ? "수정 중..." : "수정 완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. 🌟 사진 확대 라이트박스 팝업 */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-lg flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white p-2 rounded-full transition-colors cursor-pointer z-10 shadow-lg"
              title="닫기"
            >
              <X size={18} />
            </button>
            <img
              src={viewingImage}
              alt="확대 이미지"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
