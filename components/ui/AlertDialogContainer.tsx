"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
} from "lucide-react";
import {
  ALERT_EVENT_NAME,
  AlertOptions,
  AlertType,
  InternalAlertEventDetail,
  alertModal,
} from "@/lib/alert";

interface ActiveDialog extends AlertOptions {
  id: string;
  onResolve: (result: boolean) => void;
}

export function AlertDialogContainer() {
  const [currentDialog, setCurrentDialog] = useState<ActiveDialog | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);

  const handleResolve = useCallback(
    (result: boolean) => {
      if (currentDialog) {
        currentDialog.onResolve(result);
        setCurrentDialog(null);
      }
    },
    [currentDialog]
  );

  // 전역 이벤트 리스너 등록 & window.alert 폴리필
  useEffect(() => {
    const handleAlertEvent = (e: Event) => {
      const customEvent = e as CustomEvent<InternalAlertEventDetail>;
      if (!customEvent.detail) return;

      // 이전 열려있던 다이얼로그가 있으면 false로 정리
      setCurrentDialog((prev) => {
        if (prev) prev.onResolve(false);
        return customEvent.detail;
      });
    };

    window.addEventListener(ALERT_EVENT_NAME, handleAlertEvent);

    // 브라우저 기본 window.alert를 사이트 전역 모던 다이얼로그로 안전하게 치환
    const originalAlert = window.alert;
    window.alert = (message?: unknown) => {
      alertModal.info(String(message ?? ""));
    };

    return () => {
      window.removeEventListener(ALERT_EVENT_NAME, handleAlertEvent);
      window.alert = originalAlert;
    };
  }, []);

  // 다이얼로그 열릴 때 확인 버튼에 자동 포커스 & 키보드 엔터/ESC 제어
  useEffect(() => {
    if (currentDialog) {
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          handleResolve(false);
        } else if (e.key === "Enter") {
          e.preventDefault();
          handleResolve(true);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [currentDialog, handleResolve]);

  if (!currentDialog) return null;

  const type = currentDialog.type || "info";
  const isConfirm = type === "confirm";
  const { icon: Icon, iconColor, bgIconColor, badgeText, badgeClass } =
    getDialogStyles(type, currentDialog.isDestructive);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => handleResolve(false)}
    >
      <div
        className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 닫기 X 버튼 */}
        <button
          type="button"
          onClick={() => handleResolve(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          title="닫기"
        >
          <X size={16} />
        </button>

        {/* 상단 헤더: 아이콘 + 뱃지 + 제목 */}
        <div className="flex items-start gap-3.5 pr-6">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${bgIconColor}`}
          >
            <Icon size={22} className={iconColor} />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`ui-badge px-2 py-0.5 rounded-md font-semibold text-[11px] ${badgeClass}`}>
                {badgeText}
              </span>
            </div>
            <h3 className="ui-section-title text-on-surface font-bold">
              {currentDialog.title || (isConfirm ? "확인" : "안내")}
            </h3>
          </div>
        </div>

        {/* 본문 메시지 */}
        <div className="pl-1">
          <p className="ui-body text-on-surface leading-relaxed whitespace-pre-wrap break-words">
            {currentDialog.message}
          </p>
        </div>

        {/* 하단 버튼 액션 바 */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/60">
          {isConfirm && (
            <button
              type="button"
              onClick={() => handleResolve(false)}
              className="ui-button px-4 py-2 rounded-xl border border-outline-variant hover:bg-surface-container-high text-on-surface text-xs font-medium transition-colors"
            >
              {currentDialog.cancelText || "취소"}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => handleResolve(true)}
            className={`ui-button px-5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
              currentDialog.isDestructive
                ? "bg-error text-white hover:bg-error/90"
                : "bg-primary text-on-primary hover:bg-primary/90"
            }`}
          >
            {currentDialog.confirmText || "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}

function getDialogStyles(type: AlertType, isDestructive?: boolean) {
  if (isDestructive || type === "error") {
    return {
      icon: AlertCircle,
      iconColor: "text-error",
      bgIconColor: "bg-error/10 border-error/20",
      badgeText: "오류",
      badgeClass: "bg-error/15 text-error border border-error/30",
    };
  }

  switch (type) {
    case "success":
      return {
        icon: CheckCircle2,
        iconColor: "text-emerald-600 dark:text-emerald-400",
        bgIconColor: "bg-emerald-500/10 border-emerald-500/20",
        badgeText: "완료",
        badgeClass:
          "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        iconColor: "text-amber-600 dark:text-amber-400",
        bgIconColor: "bg-amber-500/10 border-amber-500/20",
        badgeText: "주의",
        badgeClass:
          "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
      };
    case "confirm":
      return {
        icon: HelpCircle,
        iconColor: "text-primary",
        bgIconColor: "bg-primary/10 border-primary/20",
        badgeText: "확인 요청",
        badgeClass: "bg-primary/15 text-primary border border-primary/30",
      };
    case "info":
    default:
      return {
        icon: Info,
        iconColor: "text-primary",
        bgIconColor: "bg-primary/10 border-primary/20",
        badgeText: "안내",
        badgeClass: "bg-primary/15 text-primary border border-primary/30",
      };
  }
}
