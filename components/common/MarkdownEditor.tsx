"use client";

import React, { useRef, useState } from "react";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Code,
  FileCode2,
  List,
  ListChecks,
  Quote,
  Link as LinkIcon,
  Table as TableIcon,
  Columns2,
  Pencil,
  Eye,
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

export type MarkdownEditorViewMode = "split" | "edit" | "preview";

export interface MarkdownEditorProps {
  /** 현재 마크다운 원문 문자열 */
  value: string;
  /** 마크다운 문자열 변경 콜백 */
  onChange: (nextValue: string) => void;
  /** 입력란 placeholder */
  placeholder?: string;
  /** textarea 기본 행 수 */
  rows?: number;
  /** 필수 입력 여부 */
  required?: boolean;
  /** 폼 필드 식별자 */
  id?: string;
  name?: string;
  /** 기본 뷰 모드 (데스크톱: split, 좁은 화면: 자동 탭 전환) */
  defaultViewMode?: MarkdownEditorViewMode;
  /** 최상위 래퍼 추가 클래스 */
  className?: string;
  /** 에디터 최소 높이 클래스 */
  minHeightClass?: string;
}

const CODE_LANGUAGES = [
  { label: "Java", value: "java" },
  { label: "Python", value: "python" },
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "SQL", value: "sql" },
  { label: "C", value: "c" },
  { label: "CSS", value: "css" },
  { label: "HTML", value: "html" },
];

/**
 * 좌우 분할(모바일 탭 전환) 및 마크다운 서식 툴바를 제공하는 공통 실시간 에디터
 */
export function MarkdownEditor({
  value,
  onChange,
  placeholder = "마크다운으로 내용을 작성하세요...",
  rows = 12,
  required = false,
  id,
  name,
  defaultViewMode = "split",
  className = "",
  minHeightClass = "min-h-[280px]",
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [viewMode, setViewMode] = useState<MarkdownEditorViewMode>(defaultViewMode);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [selectedLang, setSelectedLang] = useState("java");

  /** 커서/선택 영역을 기준으로 마크다운 구문을 삽입하고 선택 영역을 복원 */
  const insertSyntax = (
    prefix: string,
    suffix = "",
    fallbackText = "",
    blockPrefix = false
  ) => {
    const el = textareaRef.current;
    if (!el) {
      onChange(`${value}${blockPrefix && value && !value.endsWith("\n") ? "\n" : ""}${prefix}${fallbackText}${suffix}`);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const target = selected || fallbackText;

    const needsLeadingNewline =
      blockPrefix && start > 0 && value[start - 1] !== "\n";
    const leading = needsLeadingNewline ? "\n" : "";

    const inserted = `${leading}${prefix}${target}${suffix}`;
    const nextValue = value.slice(0, start) + inserted + value.slice(end);
    onChange(nextValue);

    const selectionStart = start + leading.length + prefix.length;
    const selectionEnd = selectionStart + target.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const insertCodeBlock = (lang: string) => {
    insertSyntax(`\`\`\`${lang}\n`, "\n```", "// 코드를 입력하세요", true);
  };

  const insertAlignedTable = () => {
    const template =
      "| 항목 | 설명 | 비고 |\n| :--- | :---: | ---: |\n| 왼쪽 정렬 | 가운데 정렬 | 오른쪽 정렬 |\n";
    insertSyntax("", "", template, true);
  };

  /** Tab / Shift+Tab 입력 시 마크다운 들여쓰기·내어쓰기 처리 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key !== "Tab" ||
      e.nativeEvent.isComposing ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey
    ) {
      return;
    }

    e.preventDefault();
    const el = e.currentTarget;
    const indent = "  ";
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;

    // 단일 커서에서 Tab: 커서 위치에 공백 2칸 삽입
    if (start === end && !e.shiftKey) {
      const nextValue = value.slice(0, start) + indent + value.slice(end);
      onChange(nextValue);
      const nextPos = start + indent.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(nextPos, nextPos);
      });
      return;
    }

    // 영역 선택 또는 Shift+Tab: 선택된 줄 전체 들여쓰기/내어쓰기
    const lineStart = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
    const endForSearch = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const rawLineEnd = value.indexOf("\n", endForSearch);
    const lineEnd = rawLineEnd === -1 ? value.length : rawLineEnd;

    const lines = value.slice(lineStart, lineEnd).split("\n");
    let firstLineDelta = 0;
    let totalDelta = 0;

    const updatedLines = lines.map((line, idx) => {
      if (e.shiftKey) {
        const match = /^( {1,2}|\t)/.exec(line);
        const removed = match ? match[1].length : 0;
        if (idx === 0) firstLineDelta = -removed;
        totalDelta -= removed;
        return line.slice(removed);
      }
      if (idx === 0) firstLineDelta = indent.length;
      totalDelta += indent.length;
      return `${indent}${line}`;
    });

    const nextValue =
      value.slice(0, lineStart) + updatedLines.join("\n") + value.slice(lineEnd);
    onChange(nextValue);

    const nextStart = Math.max(lineStart, start + firstLineDelta);
    const nextEnd = Math.max(nextStart, end + totalDelta);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextStart, nextEnd);
    });
  };

  return (
    <div
      className={`rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden flex flex-col ${className}`}
    >
      {/* 상단 서식 툴바 + 뷰 전환 탭 */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 bg-surface-container-low border-b border-outline-variant">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap max-w-full py-0.5">
          <ToolbarButton
            title="제목 (H2)"
            onClick={() => insertSyntax("## ", "", "소제목", true)}
          >
            <Heading2 size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="굵게 (**텍스트**)"
            onClick={() => insertSyntax("**", "**", "굵은 텍스트")}
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="기울임 (*텍스트*)"
            onClick={() => insertSyntax("*", "*", "기울임 텍스트")}
          >
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="취소선 (~~텍스트~~)"
            onClick={() => insertSyntax("~~", "~~", "취소선")}
          >
            <Strikethrough size={14} />
          </ToolbarButton>

          <span className="h-4 w-px bg-outline-variant mx-0.5 shrink-0" />

          <ToolbarButton
            title="인라인 코드 (`코드`)"
            onClick={() => insertSyntax("`", "`", "code")}
          >
            <Code size={14} />
          </ToolbarButton>

          <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden shrink-0">
            <select
              aria-label="코드 블록 언어 선택"
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value)}
              className="bg-transparent px-1.5 py-1 text-[11px] font-mono text-on-surface-variant focus:outline-none cursor-pointer"
            >
              {CODE_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => insertCodeBlock(selectedLang)}
              title={`코드 블록 삽입 (\`\`\`${selectedLang})`}
              className="px-2 py-1 text-[11px] font-medium text-on-surface hover:bg-surface-container flex items-center gap-1 border-l border-outline-variant cursor-pointer transition-colors whitespace-nowrap"
            >
              <FileCode2 size={13} className="text-primary" />
              <span>코드블록</span>
            </button>
          </div>

          <span className="h-4 w-px bg-outline-variant mx-0.5 shrink-0" />

          <ToolbarButton
            title="목록 (- 항목)"
            onClick={() => insertSyntax("- ", "", "항목", true)}
          >
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="체크리스트 (- [ ] 할 일)"
            onClick={() => insertSyntax("- [ ] ", "", "체크 항목", true)}
          >
            <ListChecks size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="인용문 (> 텍스트)"
            onClick={() => insertSyntax("> ", "", "인용문", true)}
          >
            <Quote size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="링크 ([제목](URL))"
            onClick={() => insertSyntax("[", "](https://)", "링크 텍스트")}
          >
            <LinkIcon size={14} />
          </ToolbarButton>
          <ToolbarButton
            title="정렬 포함 테이블 삽입"
            onClick={insertAlignedTable}
          >
            <TableIcon size={14} />
          </ToolbarButton>
        </div>

        {/* 모바일(<md): 작성/미리보기 탭 전환 */}
        <div className="flex md:hidden items-center bg-surface-container rounded-lg p-0.5 border border-outline-variant shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab("edit")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              mobileTab === "edit"
                ? "bg-surface-container-lowest text-primary shadow-xs"
                : "text-on-surface-variant"
            }`}
          >
            <Pencil size={12} />
            <span>작성</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("preview")}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              mobileTab === "preview"
                ? "bg-surface-container-lowest text-primary shadow-xs"
                : "text-on-surface-variant"
            }`}
          >
            <Eye size={12} />
            <span>미리보기</span>
          </button>
        </div>

        {/* 데스크톱(>=md): 작성 / 분할 / 미리보기 전환 */}
        <div className="hidden md:flex items-center bg-surface-container rounded-lg p-0.5 border border-outline-variant shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("edit")}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              viewMode === "edit"
                ? "bg-surface-container-lowest text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Pencil size={12} />
            <span>작성</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              viewMode === "split"
                ? "bg-surface-container-lowest text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Columns2 size={12} />
            <span>분할</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
              viewMode === "preview"
                ? "bg-surface-container-lowest text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Eye size={12} />
            <span>미리보기</span>
          </button>
        </div>
      </div>

      {/* 본문 영역: 데스크톱 분할/단일 & 모바일 탭 반응형 */}
      <div
        className={`grid grid-cols-1 ${
          viewMode === "split" ? "md:grid-cols-2 md:divide-x md:divide-outline-variant" : ""
        }`}
      >
        {/* 좌측: 마크다운 입력기 */}
        <div
          className={`${
            mobileTab === "edit" ? "block" : "hidden"
          } ${
            viewMode === "preview" ? "md:hidden" : "md:block"
          }`}
        >
          <textarea
            ref={textareaRef}
            id={id}
            name={name}
            required={required}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full h-full ${minHeightClass} p-3.5 bg-surface-container-lowest text-on-surface text-xs sm:text-[13px] font-mono leading-relaxed focus:outline-none resize-y placeholder:text-on-surface-variant/60`}
          />
        </div>

        {/* 우측: 실시간 마크다운 미리보기 */}
        <div
          className={`${
            mobileTab === "preview" ? "block" : "hidden"
          } ${
            viewMode === "edit" ? "md:hidden" : "md:block"
          } ${minHeightClass} max-h-[520px] overflow-y-auto p-3.5 bg-surface-container-low/40 text-xs sm:text-sm`}
        >
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="ui-caption text-on-surface-variant/70 italic">
              입력한 마크다운 내용이 이곳에 실시간으로 렌더링됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
    >
      {children}
    </button>
  );
}
