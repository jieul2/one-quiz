"use client";

import React, { forwardRef } from "react";

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 스크롤 방향: 세로(vertical), 가로(horizontal), 양방향(both) */
  orientation?: "vertical" | "horizontal" | "both";
  /** 최대 높이 (예: '400px', 'calc(100vh - 200px)') */
  maxHeight?: string | number;
  /** 최대 너비 (예: '100%', '600px') */
  maxWidth?: string | number;
  /** 추가 클래스 */
  className?: string;
  children: React.ReactNode;
}

/**
 * 🌟 범용 커스텀 스크롤 모듈
 * 테마 색상과 반응형에 최적화된 얇고 세련된 스크롤바를 제공합니다.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    { orientation = "vertical", maxHeight, maxWidth, className = "", children, style, ...props },
    ref,
  ) => {
    let overflowClass = "overflow-y-auto overflow-x-hidden";
    if (orientation === "horizontal") {
      overflowClass = "overflow-x-auto overflow-y-hidden";
    } else if (orientation === "both") {
      overflowClass = "overflow-auto";
    }

    return (
      <div
        ref={ref}
        className={`custom-scroll-module ${overflowClass} ${className}`}
        style={{
          maxHeight,
          maxWidth,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);

ScrollArea.displayName = "ScrollArea";
