"use client";

import React, { ReactNode } from "react";

export interface PageHeaderProps {
  title: string | ReactNode;
  badge?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/**
 * 🌟 전역 공통 표준 페이지 헤더 컴포넌트
 * 모든 페이지에서 통일된 H1 타이틀, 뱃지, 액션 버튼 레이아웃을 제공합니다.
 */
export function PageHeader({ title, badge, subtitle, actions, className = "" }: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-outline-variant ${className}`}
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1 w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {typeof title === "string" ? <h1 className="ui-page-title break-keep min-w-0">{title}</h1> : title}
          {badge && (
            <span className="ui-badge px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono shrink-0">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="ui-page-subtitle break-keep text-xs sm:text-sm text-on-surface-variant">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap py-0.5 max-w-full w-full md:w-auto md:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
