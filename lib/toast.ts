export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  id?: string;
  message: string;
  type?: ToastType;
  duration?: number;
}

export const TOAST_EVENT_NAME = "onequiz_toast";

/**
 * 전역 비차단형 플로팅 토스트(Non-blocking Toast) 발송 유틸리티
 * 
 * 사용법:
 * toast.success("저장되었습니다.");
 * toast.error("오류가 발생했습니다.");
 * toast.warning("경고 메시지");
 * toast.info("안내 메시지");
 */
export const toast = {
  show: (message: string, type: ToastType = "info", duration = 3000) => {
    if (typeof window === "undefined") return;
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const event = new CustomEvent<ToastOptions>(TOAST_EVENT_NAME, {
      detail: { id, message, type, duration },
    });
    window.dispatchEvent(event);
  },
  success: (message: string, duration = 3000) => {
    toast.show(message, "success", duration);
  },
  error: (message: string, duration = 4000) => {
    toast.show(message, "error", duration);
  },
  warning: (message: string, duration = 3500) => {
    toast.show(message, "warning", duration);
  },
  info: (message: string, duration = 3000) => {
    toast.show(message, "info", duration);
  },
};

