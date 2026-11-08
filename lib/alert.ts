export type AlertType = "info" | "success" | "warning" | "error" | "confirm";

export interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export interface InternalAlertEventDetail extends AlertOptions {
  id: string;
  onResolve: (result: boolean) => void;
}

export const ALERT_EVENT_NAME = "onequiz_site_alert_dialog";

/**
 * 원퀴즈 사이트 전역 모던 커스텀 알림(Alert) & 확인(Confirm) 다이얼로그 유틸리티
 * 
 * 사용법:
 * - 단순 알림:
 *   await alertModal.alert("과목을 선택해주세요.");
 *   await alertModal.info("새로운 공지사항이 있습니다.");
 *   await alertModal.success("성공적으로 저장되었습니다.");
 *   await alertModal.warning("입력 양식을 다시 확인해주세요.");
 *   await alertModal.error("서버 통신 중 오류가 발생했습니다.");
 * 
 * - 확인/취소 모달 (Promise<boolean>):
 *   if (await alertModal.confirm("정말 이 문제를 삭제하시겠습니까?")) {
 *     // 삭제 로직 실행
 *   }
 * 
 *   const ok = await alertModal.confirm({
 *     title: "일괄 상태 변경",
 *     message: "선택한 모든 항목을 활성화하시겠습니까?",
 *     confirmText: "변경",
 *     cancelText: "취소",
 *   });
 */
export const alertModal = {
  show: (options: AlertOptions | string): Promise<boolean> => {
    if (typeof window === "undefined") return Promise.resolve(true);

    const opts: AlertOptions =
      typeof options === "string" ? { message: options, type: "info" } : options;

    return new Promise<boolean>((resolve) => {
      const id = `dialog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const event = new CustomEvent<InternalAlertEventDetail>(ALERT_EVENT_NAME, {
        detail: {
          ...opts,
          id,
          onResolve: resolve,
        },
      });
      window.dispatchEvent(event);
    });
  },

  alert: (message: string, title = "안내"): Promise<boolean> => {
    return alertModal.show({ message, title, type: "info" });
  },

  info: (message: string, title = "안내"): Promise<boolean> => {
    return alertModal.show({ message, title, type: "info" });
  },

  success: (message: string, title = "완료"): Promise<boolean> => {
    return alertModal.show({ message, title, type: "success" });
  },

  warning: (message: string, title = "주의"): Promise<boolean> => {
    return alertModal.show({ message, title, type: "warning" });
  },

  error: (message: string, title = "오류"): Promise<boolean> => {
    return alertModal.show({
      message,
      title,
      type: "error",
      isDestructive: true,
    });
  },

  confirm: (
    messageOrOptions:
      | string
      | {
          title?: string;
          message: string;
          confirmText?: string;
          cancelText?: string;
          isDestructive?: boolean;
        },
    title = "확인"
  ): Promise<boolean> => {
    if (typeof messageOrOptions === "string") {
      return alertModal.show({
        message: messageOrOptions,
        title,
        type: "confirm",
        confirmText: "확인",
        cancelText: "취소",
      });
    }

    return alertModal.show({
      ...messageOrOptions,
      title: messageOrOptions.title || title,
      type: "confirm",
      confirmText: messageOrOptions.confirmText || "확인",
      cancelText: messageOrOptions.cancelText || "취소",
    });
  },
};
