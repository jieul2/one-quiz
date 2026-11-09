"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import {
  BookOpen,
  Plus,
  Clock,
  Eye,
  ThumbsUp,
  Search,
  X,
} from "lucide-react";
import { toast } from "@/lib/toast";

interface BlogPostItem {
  _id: string;
  authorEmail: string;
  authorName: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  readTime: number;
  views: number;
  likes: string[];
  createdAt: string;
}

const DEFAULT_CATEGORIES = ["전체", "기술/개발", "생산성/라이프", "트렌드/이슈", "기획/디자인", "회고"];

export function BlogView() {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  const [articles, setArticles] = useState<BlogPostItem[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 🌟 관리자 카테고리 설정 연동 (동적 로드)
  useEffect(() => {
    let ignore = false;
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories?type=blog");
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
  const [writeTitle, setWriteTitle] = useState("");
  const [writeCategory, setWriteCategory] = useState<string>("기술/개발");
  const [writeExcerpt, setWriteExcerpt] = useState("");
  const [writeContent, setWriteContent] = useState("");
  const [writeTags, setWriteTags] = useState("");

  // 상세 뷰어 모달
  const [selectedArticle, setSelectedArticle] = useState<BlogPostItem | null>(null);

  const loadArticles = async () => {
    try {
      const catParam = selectedCategory !== "전체" ? `&category=${encodeURIComponent(selectedCategory)}` : "";
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";
      const res = await fetch(`/api/blog?limit=24${catParam}${searchParam}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.posts || []);
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
        const res = await fetch(`/api/blog?limit=24${catParam}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setArticles(data.posts || []);
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
  }, [selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadArticles();
  };

  // 아티클 생성
  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!writeTitle.trim() || !writeContent.trim()) {
      toast.error("제목과 본문을 작성해주세요.");
      return;
    }

    const tagsArray = writeTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    try {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: writeTitle,
          category: writeCategory,
          excerpt: writeExcerpt,
          content: writeContent,
          tags: tagsArray,
        }),
      });

      if (res.ok) {
        toast.success("블로그 아티클이 성공적으로 발행되었습니다!");
        setIsWriteOpen(false);
        setWriteTitle("");
        setWriteExcerpt("");
        setWriteContent("");
        setWriteTags("");
        loadArticles();
      } else {
        const err = await res.json();
        toast.error(err.error || "발행 실패");
      }
    } catch {
      toast.error("네트워크 오류");
    }
  };

  // 상세 열기 & 조회수 증가
  const handleOpenDetail = async (post: BlogPostItem) => {
    setSelectedArticle(post);
    try {
      const res = await fetch(`/api/blog/${post._id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedArticle(data.post);
        setArticles((prev) => prev.map((a) => (a._id === post._id ? data.post : a)));
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
      const res = await fetch(`/api/blog/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_like" }),
      });

      if (res.ok) {
        const data = await res.json();
        if (selectedArticle && selectedArticle._id === postId) {
          setSelectedArticle({ ...selectedArticle, likes: data.likes });
        }
        setArticles((prev) =>
          prev.map((a) => (a._id === postId ? { ...a, likes: data.likes } : a))
        );
      }
    } catch {
      toast.error("오류 발생");
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* ================= 1. 상단 플랫 헤더 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="ui-page-title text-on-surface">인사이트 & 테크 블로그</h1>
            <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              BLOG
            </span>
          </div>
          <p className="ui-page-subtitle block mt-0.5">
            기술 아티클, 업무 노하우, 생산성 인사이트 및 다양한 생각과 기록을 공유하는 블로그 공간입니다.
          </p>
        </div>

        <button
          onClick={() => setIsWriteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-on-primary font-medium ui-button hover:opacity-90 transition-all cursor-pointer shadow-xs"
        >
          <Plus size={13} />
          <span>아티클 작성</span>
        </button>
      </div>

      {/* ================= 2. 카테고리 & 검색 필터 ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest border border-outline-variant rounded-xl p-3">
        {/* 카테고리 칩 */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap sm:flex-wrap py-1 max-w-full shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0 whitespace-nowrap ${
                selectedCategory === cat
                  ? "bg-primary text-on-primary shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 검색 폼 */}
        <form onSubmit={handleSearch} className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="아티클 검색..."
            className="pl-8 pr-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-xs text-on-surface outline-hidden focus:border-primary"
          />
        </form>
      </div>

      {/* ================= 3. 아티클 카드 그리드 ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full p-12 text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
            <span className="ui-caption text-on-surface-variant">아티클을 불러오는 중...</span>
          </div>
        ) : articles.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-surface-container-lowest border border-outline-variant rounded-xl space-y-2">
            <BookOpen size={28} className="mx-auto text-on-surface-variant/40" />
            <p className="ui-body text-on-surface">발행된 블로그 아티클이 없습니다.</p>
            <p className="ui-caption text-on-surface-variant">첫 번째 학습 아티클을 작성해보세요!</p>
          </div>
        ) : (
          articles.map((item) => (
            <div
              key={item._id}
              onClick={() => handleOpenDetail(item)}
              className="group p-5 bg-surface-container-lowest hover:bg-surface-container-low border border-outline-variant hover:border-primary/50 rounded-xl transition-all cursor-pointer flex flex-col justify-between space-y-3.5 shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="ui-badge px-2 py-0.5 rounded font-bold bg-primary/10 text-primary">
                    {item.category}
                  </span>
                  <span className="text-[11px] text-on-surface-variant flex items-center gap-1 font-mono">
                    <Clock size={11} />
                    {item.readTime}분 읽기
                  </span>
                </div>

                <h3 className="ui-card-title text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </h3>

                <p className="ui-caption text-on-surface-variant line-clamp-3 leading-relaxed">
                  {item.excerpt || (item.content ? item.content.slice(0, 120) : "")}
                </p>
              </div>

              <div className="pt-3 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant">
                <span className="font-semibold text-on-surface">{item.authorName}</span>
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {item.views}
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <ThumbsUp size={12} />
                    {item.likes?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= 모달: 아티클 작성 ================= */}
      {isWriteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
              <h3 className="ui-section-title text-on-surface">블로그 아티클 발행</h3>
              <button
                onClick={() => setIsWriteOpen(false)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateArticle} className="space-y-3">
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
                    태그 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    value={writeTags}
                    onChange={(e) => setWriteTags(e.target.value)}
                    placeholder="예: CS지식, 정처기, 코딩테스트"
                    className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  아티클 제목 *
                </label>
                <input
                  type="text"
                  value={writeTitle}
                  onChange={(e) => setWriteTitle(e.target.value)}
                  placeholder="지식을 전달할 수 있는 매력적인 제목을 입력하세요"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  한 줄 요약 (Excerpt)
                </label>
                <input
                  type="text"
                  value={writeExcerpt}
                  onChange={(e) => setWriteExcerpt(e.target.value)}
                  placeholder="목록 카드에 노출될 1~2줄 요약 설명"
                  className="w-full px-3 py-2 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface outline-hidden focus:border-primary"
                />
              </div>

              <div>
                <label className="block ui-caption font-semibold text-on-surface mb-1">
                  본문 (마크다운 지원) *
                </label>
                <textarea
                  value={writeContent}
                  onChange={(e) => setWriteContent(e.target.value)}
                  placeholder="# 대제목&#10;## 소제목&#10;학습한 내용, 코드 블록, 정리 사항을 자유롭게 작성하세요."
                  className="w-full px-3 py-2 h-64 bg-surface-container-low border border-outline-variant rounded-md text-xs text-on-surface font-mono outline-hidden focus:border-primary resize-none leading-relaxed"
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
                  아티클 발행
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 모달: 아티클 상세 리더 ================= */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-outline-variant shrink-0">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="ui-badge px-2 py-0.5 rounded font-bold bg-primary/10 text-primary">
                    {selectedArticle.category}
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">
                    ⏱️ {selectedArticle.readTime}분 분량
                  </span>
                </div>
                <h1 className="ui-page-title text-on-surface">{selectedArticle.title}</h1>
                <div className="text-xs text-on-surface-variant flex items-center gap-2">
                  <span className="font-semibold text-on-surface">{selectedArticle.authorName}</span>
                  <span>• {new Date(selectedArticle.createdAt).toLocaleDateString()}</span>
                  <span>• 조회 {selectedArticle.views}</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedArticle(null)}
                className="p-1 rounded-md text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 마크다운 본문 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-on-surface leading-relaxed text-xs">
              <div className="prose dark:prose-invert max-w-none prose-sm leading-relaxed">
                <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
              </div>

              {/* 태그 */}
              {selectedArticle.tags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-outline-variant">
                  {selectedArticle.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-surface-container text-primary font-mono text-[11px]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* 좋아요 액션 */}
              <div className="pt-4 flex justify-center">
                <button
                  onClick={() => handleToggleLike(selectedArticle._id)}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full border transition-all cursor-pointer text-xs font-semibold ${
                    userEmail && selectedArticle.likes?.includes(userEmail)
                      ? "bg-primary text-on-primary border-primary shadow-md"
                      : "bg-surface-container text-on-surface hover:border-primary"
                  }`}
                >
                  <ThumbsUp size={14} />
                  <span>도움이 됐어요 {selectedArticle.likes?.length || 0}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
