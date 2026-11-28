"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark, oneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { getThemeById } from "@/lib/themes/themeList";

export interface MarkdownRendererProps {
  /** 렌더링할 마크다운 원문 문자열 */
  content: string;
  /** 외부에서 테마 ID를 명시할 경우 사용 (미지정 시 next-themes 현재 테마 자동 참조) */
  currentTheme?: string;
  /** 래퍼 컨테이너 추가 클래스 */
  className?: string;
}

/**
 * DB 이스케이프(\\n) 및 CRLF 개행을 정규화합니다.
 * 멀티라인 코드 블록 내부의 문자열 리터럴("\\n")은 훼손하지 않습니다.
 */
export function normalizeMarkdownContent(raw: string): string {
  if (!raw) return "";
  const unified = raw.replace(/\r\n?/g, "\n");

  const fencedParts = unified.split(/(```[\s\S]*?```)/g);
  return fencedParts
    .map((part) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        if (!part.includes("\n") && part.includes("\\n")) {
          return part.replace(/\\n/g, "\n");
        }
        return part;
      }

      const inlineParts = part.split(/(`[^`]*`)/g);
      return inlineParts
        .map((segment) => {
          if (segment.startsWith("`") && segment.endsWith("`")) {
            return segment;
          }
          return segment.replace(/\\n/g, "\n");
        })
        .join("");
    })
    .join("");
}

function getTableAlignClass(align?: string, style?: React.CSSProperties): string {
  const resolved = align || (typeof style?.textAlign === "string" ? style.textAlign : undefined);
  if (resolved === "center") return "text-center";
  if (resolved === "right") return "text-right";
  if (resolved === "left") return "text-left";
  return "text-left";
}

function omitExtraProps<T extends { node?: unknown; ref?: unknown }>(
  props: T
): Omit<T, "node" | "ref"> {
  const rest = { ...props };
  delete rest.node;
  delete rest.ref;
  return rest;
}

/**
 * 24-테마 시맨틱 토큰과 GFM/개행/코드 하이라이팅을 지원하는 공통 마크다운 렌더러
 */
export function MarkdownRenderer({
  content,
  currentTheme,
  className = "",
}: MarkdownRendererProps) {
  const { theme: activeTheme } = useTheme();
  const resolvedThemeId = currentTheme ?? activeTheme ?? "light";
  const isDark = getThemeById(resolvedThemeId).type === "dark";

  const cleanCodeStyle = useMemo(() => {
    const baseStyle = isDark ? atomDark : oneLight;
    const overridden: Record<string, React.CSSProperties> = {};
    for (const key in baseStyle) {
      if (Object.prototype.hasOwnProperty.call(baseStyle, key)) {
        const entry = baseStyle[key];
        overridden[key] = {
          ...entry,
          background: "transparent",
          backgroundColor: "transparent",
          ...(entry.fontFamily
            ? { fontFamily: 'var(--font-mono, "D2Coding", monospace)' }
            : {}),
        };
      }
    }
    return overridden;
  }, [isDark]);

  const normalizedContent = useMemo(
    () => normalizeMarkdownContent(content),
    [content]
  );

  const components = useMemo<Components>(
    () => ({
      h1({ children, className: cls, ...props }) {
        return (
          <h1
            className={`text-xl sm:text-2xl font-bold text-on-surface mt-5 mb-2.5 first:mt-0 leading-snug ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </h1>
        );
      },
      h2({ children, className: cls, ...props }) {
        return (
          <h2
            className={`text-lg sm:text-xl font-bold text-on-surface mt-4 mb-2 first:mt-0 pb-1.5 border-b border-outline-variant/60 leading-snug ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </h2>
        );
      },
      h3({ children, className: cls, ...props }) {
        return (
          <h3
            className={`text-base sm:text-lg font-bold text-on-surface mt-3.5 mb-1.5 first:mt-0 leading-snug ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </h3>
        );
      },
      h4({ children, className: cls, ...props }) {
        return (
          <h4
            className={`text-sm sm:text-base font-bold text-on-surface mt-3 mb-1 first:mt-0 ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </h4>
        );
      },
      p({ children, className: cls, ...props }) {
        return (
          <p className={`mb-2.5 last:mb-0 leading-relaxed ${cls || ""}`} {...omitExtraProps(props)}>
            {children}
          </p>
        );
      },
      strong({ children, className: cls, ...props }) {
        return (
          <strong className={`font-bold text-on-surface ${cls || ""}`} {...omitExtraProps(props)}>
            {children}
          </strong>
        );
      },
      em({ children, className: cls, ...props }) {
        return (
          <em className={`italic ${cls || ""}`} {...omitExtraProps(props)}>
            {children}
          </em>
        );
      },
      del({ children, className: cls, ...props }) {
        return (
          <del
            className={`line-through text-on-surface-variant/80 ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </del>
        );
      },
      blockquote({ children, className: cls, ...props }) {
        return (
          <blockquote
            className={`my-3 pl-3.5 pr-3 py-2 border-l-2 border-primary/60 bg-surface-container-low/60 rounded-r-lg text-on-surface-variant ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </blockquote>
        );
      },
      ul({ children, className: cls, ...props }) {
        const isTaskList = cls?.includes("contains-task-list");
        return (
          <ul
            className={`mb-2.5 last:mb-0 space-y-1 ${
              isTaskList ? "list-none pl-1" : "list-disc pl-5"
            } ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </ul>
        );
      },
      ol({ children, className: cls, ...props }) {
        return (
          <ol
            className={`list-decimal pl-5 mb-2.5 last:mb-0 space-y-1 ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </ol>
        );
      },
      li({ children, className: cls, ...props }) {
        const isTaskItem = cls?.includes("task-list-item");
        return (
          <li
            className={`leading-relaxed ${
              isTaskItem ? "list-none flex items-start gap-2" : ""
            } ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </li>
        );
      },
      input({ type, checked, className: cls, ...props }) {
        if (type === "checkbox") {
          return (
            <input
              type="checkbox"
              checked={Boolean(checked)}
              readOnly
              className={`mt-1 h-3.5 w-3.5 shrink-0 rounded border-outline-variant accent-primary pointer-events-none ${cls || ""}`}
              {...omitExtraProps(props)}
            />
          );
        }
        return <input type={type} checked={checked} className={cls} {...omitExtraProps(props)} />;
      },
      hr({ className: cls, ...props }) {
        return (
          <hr
            className={`my-4 border-t border-outline-variant ${cls || ""}`}
            {...omitExtraProps(props)}
          />
        );
      },
      a({ children, href, className: cls, ...props }) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-primary underline underline-offset-2 hover:opacity-80 break-all ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </a>
        );
      },
      img({ alt, className: cls, ...props }) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={alt || ""}
            className={`max-w-full h-auto rounded-lg border border-outline-variant my-2 ${cls || ""}`}
            {...omitExtraProps(props)}
          />
        );
      },
      code({ className: cls, children, style: inlineStyle, ...props }) {
        const match = /language-([\w-]+)/.exec(cls || "");
        const rawText = String(children);
        const strippedText = rawText.replace(/\n$/, "");
        const isBlock = Boolean(match) || rawText.includes("\n");

        if (match) {
          return (
            <SyntaxHighlighter
              style={cleanCodeStyle}
              language={match[1]}
              PreTag="div"
              customStyle={{
                background: "transparent",
                backgroundColor: "transparent",
                margin: 0,
                padding: 0,
                border: "none",
              }}
              codeTagProps={{
                style: {
                  background: "transparent",
                  backgroundColor: "transparent",
                  fontFamily: 'var(--font-mono, "D2Coding", ui-monospace, SFMono-Regular, monospace)',
                },
              }}
            >
              {strippedText}
            </SyntaxHighlighter>
          );
        }

        if (isBlock) {
          return (
            <code
              className={`block font-mono text-xs sm:text-[13px] text-on-surface leading-relaxed whitespace-pre ${cls || ""}`}
              style={inlineStyle}
              {...omitExtraProps(props)}
            >
              {strippedText}
            </code>
          );
        }

        return (
          <code
            className={`px-1.5 py-0.5 rounded bg-surface-container-low text-primary font-mono text-[0.85em] border border-outline-variant ${cls || ""}`}
            style={inlineStyle}
            {...omitExtraProps(props)}
          >
            {children}
          </code>
        );
      },
      pre({ children, className: cls }) {
        return (
          <div
            className={`bg-transparent p-0 my-2 first:mt-0 last:mb-0 overflow-x-auto ${cls || ""}`}
          >
            {children}
          </div>
        );
      },
      table({ children, className: cls, ...props }) {
        return (
          <div className="overflow-x-auto my-3 rounded-xl border border-outline-variant shadow-xs">
            <table
              className={`w-full border-collapse text-xs sm:text-sm ${cls || ""}`}
              {...omitExtraProps(props)}
            >
              {children}
            </table>
          </div>
        );
      },
      thead({ children, className: cls, ...props }) {
        return (
          <thead
            className={`bg-surface-container-low text-on-surface ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </thead>
        );
      },
      tbody({ children, className: cls, ...props }) {
        return (
          <tbody className={`divide-y divide-outline-variant ${cls || ""}`} {...omitExtraProps(props)}>
            {children}
          </tbody>
        );
      },
      tr({ children, className: cls, ...props }) {
        return (
          <tr
            className={`border-b border-outline-variant last:border-b-0 ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </tr>
        );
      },
      th({ children, align, style: cellStyle, className: cls, ...props }) {
        const alignClass = getTableAlignClass(align, cellStyle);
        return (
          <th
            align={align}
            style={cellStyle}
            className={`border-b border-r last:border-r-0 border-outline-variant px-3.5 py-2.5 font-bold ${alignClass} ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </th>
        );
      },
      td({ children, align, style: cellStyle, className: cls, ...props }) {
        const alignClass = getTableAlignClass(align, cellStyle);
        return (
          <td
            align={align}
            style={cellStyle}
            className={`border-r last:border-r-0 border-outline-variant px-3.5 py-2.5 text-on-surface-variant ${alignClass} ${cls || ""}`}
            {...omitExtraProps(props)}
          >
            {children}
          </td>
        );
      },
    }),
    [cleanCodeStyle]
  );

  return (
    <div className={`min-w-0 break-words text-on-surface ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
}
