"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  MessageSquareText,
  Search,
  Plus,
  ThumbsUp,
  Eye,
  MessageCircle,
  Calendar,
  Send,
  X,
  CalendarPlus,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface CommentData {
  id: string;
  authorEmail: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface PostData {
  _id: string;
  authorEmail: string;
  authorName: string;
  category: "자유" | "질문답변" | "정보공유" | "일상·라이프" | "프로젝트" | "스터디모집" | "시험후기";
  title: string;
  content: string;
  tags: string[];
  views: number;
  likes: string[];
  comments: CommentData[];
  linkedCalendarDate?: string;
  createdAt: string;
}

const CATEGORIES = ["전체", "자유", "질문답변", "정보공유", "일상·라이프", "프로젝트", "스터디모집", "시험후기"];

export function BoardView() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  const [posts, setPosts] = useState<PostData[]>([]);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"latest" | "popular">("latest");
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 관리자 페이지에서 CRUD된 동적 카테고리 실시간 연동
  useEffect(() => {
    let ignore = false;
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories?type=board");
        if (res.ok && !ignore) {
          const data = await res.json();
          if (Array.isArray(data.categories) && data.categories.length > 0) {
            const names = data.categories.map((c: { name: string }) => c.name);
            setCategories(["전체", ...names]);
          }
        }
      } catch {}
    }
    fetchCategories();
    return () => {
      ignore = true;
    };
  }, []);

  // 글쓰기 모달
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [writeCategory, setWriteCategory] = useState<string>("자유");
  const [writeTitle, setWriteTitle] = useState("");
  const [writeContent, setWriteContent] = useState("");
  const [writeTags, setWriteTags] = useState("");
  const [writeCalendarDate, setWriteCalendarDate] = useState("");

  // 상세 모달
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [commentInput, setCommentInput] = useState("");

  const loadPosts = async () => {
    try {
      const catParam = selectedCategory !== "전체" ? `&category=${encodeURIComponent(selectedCategory)}` : "";
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/board?sort=${sortOption}${catParam}${searchParam}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const catParam = selectedCategory !== "전체" ? `&category=${encodeURIComponent(selectedCategory)}` : "";
        const res = await fetch(`/api/board?sort=${sortOption}${catParam}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setPosts(data.posts || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [selectedCategory, sortOption]);

  // 검색 엔터
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPosts();
  };

  // 글 등록
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeTitle.trim() || !writeContent.trim()) {
      toast.error("제목과 내용을 입력해주세요.");
      return;
    }

    const tagsArray = writeTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: writeCategory,
          title: writeTitle,
          content: writeContent,
          tags: tagsArray,
          linkedCalendarDate: writeCalendarDate || null,
        }),
      });

      if (res.ok) {
        toast.success("게시글이 성공적으로 등록되었습니다!");
        setIsWriteOpen(false);
        setWriteTitle("");
        setWriteContent("");
        setWriteTags("");
        setWriteCalendarDate("");
        loadPosts();
      } else {
        const err = await res.json();
        toast.error(err.error || "등록 실패");
      }
    } catch {
      toast.error("네트워크 오류");
    }
  };

  // 상세 열기 & 조회수 증가
  const handleOpenDetail = async (post: PostData) => {
    setSelectedPost(post);
    try {
      const res = await fetch(`/api/board/${post._id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPost(data.post);
        setPosts((prev) => prev.map((p) => (p._id === post._id ? data.post : p)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 좋아요 토글
  const handleToggleLike = async (postId: string) => {
    if (!userEmail) {
      toast.info("로그인이 필요합니다.");
      return;
    }

    try {
      const res = await fetch(`/api/board/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_like" }),
      });

      if (res.ok) {
        const data = await res.json();
        if (selectedPost && selectedPost._id === postId) {
          setSelectedPost({ ...selectedPost, likes: data.likes });
        }
        setPosts((prev) =>
          prev.map((p) => (p._id === postId ? { ...p, likes: data.likes } : p))
        );
      }
    } catch {
      toast.error("오류 발생");
    }
  };

  // 댓글 등록
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedPost) return;

    try {
      const res = await fetch(`/api/board/${selectedPost._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add_comment", commentText: commentInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedPost({ ...selectedPost, comments: data.comments });
        setPosts((prev) =>
          prev.map((p) => (p._id === selectedPost._id ? { ...p, comments: data.comments } : p))
        );
        setCommentInput("");
        toast.success("댓글이 등록되었습니다.");
      }
    } catch {
      toast.error("댓글 등록 실패");
    }
  };

  // 캘린더에 일정 등록 연계
  const handleAddToCalendar = async (dateStr: string, title: string) => {
    if (!userEmail) {
      toast.info("로그인이 필요합니다.");
      return;
    }

    try {
      const startDate = new Date(dateStr);
      startDate.setHours(9, 0, 0, 0);
      const endDate = new Date(dateStr);
      endDate.setHours(18, 0, 0, 0);

      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[커뮤니티] ${title}`,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          category: "exam",
          description: "원퀴즈 커뮤니티 게시판에서 등록된 스터디/시험 일정입니다.",
        }),
      });

      if (res.ok) {
        toast.success(`📅 '${dateStr}' 일정이 개인 캘린더에 성공적으로 등록되었습니다!`);
      } else {
        toast.error("캘린더 일정 등록 실패");
      }
    } catch {
      toast.error("네트워크 오류");
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* ================= 1. 상단 플랫 헤더 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="ui-page-title text-on-surface">커뮤니티 광장</h1>
            <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              COMMUNITY
            </span>
          </div>
          <p className="ui-page-subtitle block mt-0.5">
            자유로운 소통과 토론, 질문과 정보 공유, 프로젝트 동료 모집까지 폭넓은 이야기를 나누세요.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/calendar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface font-medium ui-button transition-colors cursor-pointer"
          >
            <Calendar size={13} className="text-primary" />
            <span>캘린더 보기</span>
          </Link>

          <button
            onClick={() => setIsWriteOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary font-medium ui-button hover:opacity-90 transition-all cursor-pointer shadow-xs"
          >
            <Plus size={13} />
            <span>글쓰기</span>
          </button>
        </div>
      </div>

      {/* ================= 2. 카테고리 & 검색 필터 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl p-3">
        {/* 카테고리 칩 */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 검색 및 정렬 */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="게시판 검색..."
              className="pl-8 pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-on-surface outline-hidden focus:border-primary"
            />
          </form>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as "latest" | "popular")}
            className="px-2.5 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-on-surface outline-hidden cursor-pointer"
          >
            <option value="latest">최신순</option>
            <option value="popular">조회순</option>
          </select>
        </div>
      </div>

      {/* ================= 3. 게시글 목록 ================= */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="p-12 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
            <span className="ui-caption text-on-surface-variant">게시글을 불러오는 중...</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center bg-surface-container-lowest border border-outline-variant rounded-xl space-y-2">
            <MessageSquareText size={28} className="mx-auto text-on-surface-variant/40" />
            <p className="ui-body text-on-surface">등록된 게시글이 없습니다.</p>
            <p className="ui-caption text-on-surface-variant">첫 번째 글을 작성하여 스터디원들과 소통해보세요!</p>
          </div>
        ) : (
          posts.map((post) => {
            const hasLiked = userEmail && post.likes?.includes(userEmail);

            return (
              <div
                key={post._id}
                onClick={() => handleOpenDetail(post)}
                className="p-4 bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant hover:border-primary/50 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="ui-badge px-2 py-0.5 rounded bg-surface-container text-primary font-bold">
                      {post.category}
                    </span>
                    <h3 className="ui-card-title text-on-surface group-hover:text-primary transition-colors truncate">
                      {post.title}
                    </h3>
                    {post.linkedCalendarDate && (
                      <span className="ui-badge px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        <Calendar size={10} />
                        {post.linkedCalendarDate}
                      </span>
                    )}
                  </div>

                  <p className="ui-caption text-on-surface-variant line-clamp-1">{post.content}</p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-on-surface-variant pt-1">
                    <span className="font-semibold text-on-surface">{post.authorName}</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    {Array.isArray(post.tags) && post.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {post.tags.slice(0, 3).map((tg) => (
                          <span key={tg} className="text-primary font-mono">
                            #{tg}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 반응 메타 */}
                <div className="flex items-center gap-3 text-xs text-on-surface-variant shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant">
                  <span className="flex items-center gap-1">
                    <Eye size={13} />
                    {post.views}
                  </span>
                  <span className={`flex items-center gap-1 ${hasLiked ? "text-primary font-bold" : ""}`}>
                    <ThumbsUp size={13} />
                    {post.likes?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle size={13} />
                    {post.comments?.length || 0}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================= 모달: 글쓰기 ================= */}
      {isWriteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <h3 className="ui-section-title text-on-surface">커뮤니티 글 작성</h3>
              <button
                onClick={() => setIsWriteOpen(false)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block ui-caption font-semibold text-on-surface mb-1">
                    카테고리 *
                  </label>
                  <select
                    value={writeCategory}
                    onChange={(e) => setWriteCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary font-medium"
                  >
                    {categories
                      .filter((c) => c !== "전체")
                      .map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block ui-caption font-semibold text-on-surface mb-1">
                    캘린더 연계 일정 (선택)
                  </label>
                  <input
                    type="date"
                    value={writeCalendarDate}
                    onChange={(e) => setWriteCalendarDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  제목 *
                </label>
                <input
                  type="text"
                  value={writeTitle}
                  onChange={(e) => setWriteTitle(e.target.value)}
                  placeholder="게시글 제목을 입력하세요"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={writeTags}
                  onChange={(e) => setWriteTags(e.target.value)}
                  placeholder="예: 정보처리기사, SQL, 실기합격"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  내용 *
                </label>
                <textarea
                  value={writeContent}
                  onChange={(e) => setWriteContent(e.target.value)}
                  placeholder="내용을 작성하세요..."
                  className="w-full px-3 py-2 h-44 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsWriteOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-surface-container text-on-surface-variant hover:bg-surface-container-high ui-button cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-primary text-on-primary font-medium ui-button hover:opacity-90 cursor-pointer shadow-xs"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 모달: 게시글 상세 뷰어 ================= */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-outline-variant shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="ui-badge px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                    {selectedPost.category}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {new Date(selectedPost.createdAt).toLocaleString()}
                  </span>
                </div>
                <h2 className="ui-section-title text-on-surface">{selectedPost.title}</h2>
                <div className="text-xs text-on-surface-variant flex items-center gap-2">
                  <span className="font-semibold text-on-surface">{selectedPost.authorName}</span>
                  <span>조회 {selectedPost.views}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedPost(null)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 본문 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* 캘린더 연계 배너 */}
              {selectedPost.linkedCalendarDate && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                    <Calendar size={14} />
                    <span>연계 일정: {selectedPost.linkedCalendarDate}</span>
                  </div>
                  <button
                    onClick={() =>
                      handleAddToCalendar(selectedPost.linkedCalendarDate!, selectedPost.title)
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 cursor-pointer shadow-xs"
                  >
                    <CalendarPlus size={12} />
                    <span>내 캘린더에 추가</span>
                  </button>
                </div>
              )}

              {/* 본문 내용 */}
              <div className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                {selectedPost.content}
              </div>

              {/* 태그 */}
              {selectedPost.tags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2">
                  {selectedPost.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-[11px]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* 좋아요 버튼 */}
              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => handleToggleLike(selectedPost._id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer text-xs font-semibold ${
                    userEmail && selectedPost.likes?.includes(userEmail)
                      ? "bg-primary text-on-primary border-primary shadow-md"
                      : "bg-surface-container text-on-surface hover:border-primary"
                  }`}
                >
                  <ThumbsUp size={14} />
                  <span>좋아요 {selectedPost.likes?.length || 0}</span>
                </button>
              </div>

              {/* 댓글 섹션 */}
              <div className="pt-4 border-t border-outline-variant space-y-3">
                <h4 className="ui-card-title text-on-surface flex items-center gap-1.5">
                  <MessageCircle size={14} />
                  댓글 ({selectedPost.comments?.length || 0})
                </h4>

                <div className="space-y-2">
                  {selectedPost.comments?.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-lg bg-surface-container-low text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                        <span className="font-semibold text-on-surface">{c.authorName}</span>
                        <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-on-surface leading-normal">{c.content}</p>
                    </div>
                  ))}
                </div>

                {/* 댓글 작성 폼 */}
                <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="따뜻한 댓글을 남겨보세요..."
                    className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-on-surface outline-hidden focus:border-primary"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-primary text-on-primary rounded-lg hover:opacity-90 cursor-pointer"
                  >
                    <Send size={14} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
