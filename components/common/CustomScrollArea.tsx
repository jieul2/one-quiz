"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface CustomScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  viewportClassName?: string;
  isIconOnly?: boolean;
  onScroll?: () => void;
}

/**
 * 🌟 우리가 직접 제작한 커스텀 오버레이 스크롤바 (CustomScrollArea)
 * 1. 브라우저/OS 기본 스크롤바(화살표, 회색 트랙 등)를 100% 제거하여 레이아웃 너비 잠식(16px 축소) 방지
 * 2. 아이콘 축소 모드(72px)에서도 아이콘이 잘리지 않고 완벽한 중앙 정렬을 유지
 * 3. 마우스 휠, 트랙패드, 스크롤바 썸 드래그 모두 부드럽게 지원 (60FPS)
 * 4. 테마 토큰(var(--outline-variant), var(--primary))과 완벽히 연동되는 미려한 디자인
 */
export function CustomScrollArea({
  children,
  className = "",
  viewportClassName,
  isIconOnly = false,
  onScroll,
}: CustomScrollAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(30);
  const [thumbTop, setThumbTop] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  // 스크롤 및 뷰포트 크기 변화 측정
  const updateScrollMetrics = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const hasScroll = scrollHeight > clientHeight + 1;
    setCanScroll(hasScroll);

    if (hasScroll) {
      const calculatedThumbHeight = Math.max(
        24,
        (clientHeight / scrollHeight) * clientHeight
      );
      setThumbHeight(calculatedThumbHeight);

      const maxScrollTop = scrollHeight - clientHeight;
      const scrollRatio = maxScrollTop > 0 ? scrollTop / maxScrollTop : 0;
      const calculatedTop = scrollRatio * (clientHeight - calculatedThumbHeight);
      setThumbTop(calculatedTop);
    }
  }, []);

  // 리사이즈 및 돔 변화 감지
  useEffect(() => {
    updateScrollMetrics();
    const el = containerRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      updateScrollMetrics();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateScrollMetrics]);

  // 스크롤 이벤트 핸들러
  const handleScroll = () => {
    updateScrollMetrics();
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 1000);

    if (onScroll) onScroll();
  };

  // 썸(Thumb) 드래그 시작
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    if (containerRef.current) {
      dragStartScrollTop.current = containerRef.current.scrollTop;
    }
  };

  // 드래그 중 및 마우스 업 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const el = containerRef.current;
      const deltaY = e.clientY - dragStartY.current;
      const clientHeight = el.clientHeight;
      const scrollHeight = el.scrollHeight;
      const trackScrollableHeight = clientHeight - thumbHeight;

      if (trackScrollableHeight > 0) {
        const scrollDelta = (deltaY / trackScrollableHeight) * (scrollHeight - clientHeight);
        el.scrollTop = dragStartScrollTop.current + scrollDelta;
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, thumbHeight]);

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 🌟 크로스 브라우저 기본 스크롤바 100% 강제 소멸 스타일 주입 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          [data-custom-scroll-viewport]::-webkit-scrollbar,
          .custom-scroll-viewport::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
            -webkit-appearance: none !important;
          }
          [data-custom-scroll-viewport],
          .custom-scroll-viewport {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
        `
      }} />

      {/* 🌟 실제 스크롤되는 뷰포트 (브라우저 기본 스크롤바는 CSS/인라인으로 100% 숨김) */}
      <div
        ref={containerRef}
        data-custom-scroll-viewport
        onScroll={handleScroll}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        className={`w-full h-full overflow-y-auto overflow-x-hidden scrollbar-none scrollbar-hide custom-scroll-viewport overscroll-contain select-none md:select-auto ${
          viewportClassName !== undefined ? viewportClassName : (isIconOnly ? "px-2" : "px-3")
        }`}
      >
        {children}
      </div>

      {/* 🌟 우리가 직접 제작한 커스텀 오버레이 스크롤바 트랙 & 썸 */}
      {canScroll && (
        <div
          ref={trackRef}
          className={`absolute right-0.5 top-1 bottom-1 w-1 transition-opacity duration-300 pointer-events-none ${
            isHovered || isScrolling || isDragging ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            onMouseDown={handleThumbMouseDown}
            style={{
              height: `${thumbHeight}px`,
              transform: `translateY(${thumbTop}px)`,
            }}
            className={`w-full rounded-full transition-colors pointer-events-auto cursor-grab active:cursor-grabbing ${
              isDragging
                ? "bg-primary"
                : isHovered
                ? "bg-outline-variant hover:bg-primary"
                : "bg-outline-variant/60"
            }`}
          />
        </div>
      )}
    </div>
  );
}
