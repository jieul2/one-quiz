"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { TOAST_EVENT_NAME, ToastOptions, ToastType } from "@/lib/toast";

type ToastItem = Required<ToastOptions>;

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastOptions>;
      if (!customEvent.detail) return;

      const { id, message, type = "info", duration = 3000 } = customEvent.detail;
      const toastId = id || `toast-${Date.now()}`;

      const newToast: ToastItem = {
        id: toastId,
        message,
        type,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(toastId);
        }, duration);
      }
    };

    window.addEventListener(TOAST_EVENT_NAME, handleToastEvent);
    return () => {
      window.removeEventListener(TOAST_EVENT_NAME, handleToastEvent);
    };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const { icon: Icon, borderColor, iconColor, badgeText } = getToastStyles(toast.type);

  return (
    <div
      role="alert"
      className={`pointer-events-auto bg-surface-container-lowest border ${borderColor} rounded-lg p-3 shadow-lg flex items-start gap-2.5 transition-all duration-200 animate-fade-in`}
    >
      <div className="shrink-0 mt-0.5">
        <Icon size={16} className={iconColor} />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-bold ${iconColor} uppercase tracking-wider`}>
            {badgeText}
          </span>
        </div>
        <p className="text-xs text-on-surface font-normal leading-relaxed whitespace-pre-wrap break-words">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="p-1 -mr-1 -mt-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded cursor-pointer transition-colors shrink-0"
        title="알림 닫기"
      >
        <X size={13} />
      </button>
    </div>
  );
}

function getToastStyles(type: ToastType) {
  switch (type) {
    case "success":
      return {
        icon: CheckCircle2,
        borderColor: "border-emerald-500/30",
        iconColor: "text-emerald-500",
        badgeText: "완료",
      };
    case "error":
      return {
        icon: AlertCircle,
        borderColor: "border-destructive/30",
        iconColor: "text-destructive",
        badgeText: "오류",
      };
    case "warning":
      return {
        icon: AlertTriangle,
        borderColor: "border-amber-500/30",
        iconColor: "text-amber-500",
        badgeText: "주의",
      };
    case "info":
    default:
      return {
        icon: Info,
        borderColor: "border-primary/30",
        iconColor: "text-primary",
        badgeText: "안내",
      };
  }
}
