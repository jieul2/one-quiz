"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  X,
  Check,
  XCircle,
  CheckCheck,
  Trash2,
  ArrowRight,
  Users,
  ShieldAlert,
  Loader2,
  UserCheck,
  UserX,
  MessageSquare,
} from "lucide-react";
import {
  COLLAB_MODULE_META,
  getCollabModuleHref,
  dispatchNotificationsUpdated,
  dispatchCollabUpdated,
  type NotificationItem,
} from "@/lib/collaborationTypes";
import { toast } from "@/lib/toast";
import { useMounted } from "@/lib/hooks/useMounted";

interface NotificationCenterWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  isLoading: boolean;
  isAdmin: boolean;
  pendingFeedbackCount: number;
  onRefresh: () => Promise<void> | void;
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(isoDate).toLocaleDateString("ko-KR");
}

export function NotificationCenterWidget({
  isOpen,
  onClose,
  notifications,
  isLoading,
  isAdmin,
  pendingFeedbackCount,
  onRefresh,
}: NotificationCenterWidgetProps) {
  const mounted = useMounted();
  const router = useRouter();
  const [filterTab, setFilterTab] = useState<"all" | "invites" | "updates">("all");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  if (!mounted || !isOpen) return null;

  const pendingInvites = notifications.filter(
    (n) => n.type === "collab_invite" && n.actionStatus === "pending"
  );

  const filteredNotifications = notifications.filter((n) => {
    if (filterTab === "invites") {
      return n.type === "collab_invite";
    }
    if (filterTab === "updates") {
      return n.type !== "collab_invite";
    }
    return true;
  });

  const handleRespondInvite = async (
    notif: NotificationItem,
    action: "accept" | "reject",
    reason?: string
  ) => {
    if (!notif.inviteId) return;
    setProcessingId(notif._id);
    try {
      const res = await fetch("/api/collaboration/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          inviteId: notif.inviteId,
          rejectReason: reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "요청 처리에 실패했습니다.");
        return;
      }

      toast.success(
        action === "accept"
          ? `[${notif.targetTitle}] 협업 그룹에 참여했습니다.`
          : "협업 요청을 거절했습니다. 요청자에게 알림이 전송되었습니다."
      );
      setRejectingId(null);
      setRejectReason("");
      await onRefresh();
      dispatchNotificationsUpdated();
      dispatchCollabUpdated(notif.moduleType);
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkRead = async (id?: string, markAllRead?: boolean) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, markAllRead }),
      });
      await onRefresh();
      dispatchNotificationsUpdated();
    } catch {}
  };

  const handleClearResolved = async () => {
    try {
      await fetch("/api/notifications?clearResolved=true", {
        method: "DELETE",
      });
      await onRefresh();
      dispatchNotificationsUpdated();
    } catch {}
  };

  const handleDeleteOne = async (id: string) => {
    try {
      await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      await onRefresh();
      dispatchNotificationsUpdated();
    } catch {}
  };

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-end md:items-end justify-center md:justify-start">
      {/* 배경 딤 */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* 알림 위젯 카드 */}
      <div
        role="dialog"
        aria-label="알림 및 협업 요청 센터"
        className="relative z-10 w-full max-w-md md:ml-20 md:mb-4 mx-3 mb-20 bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden text-on-surface"
      >
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-primary" />
            <h3 className="ui-card-title text-on-surface">알림 &amp; 협업 요청</h3>
            {pendingInvites.length > 0 && (
              <span className="ui-badge px-2 py-0.5 rounded-full bg-primary text-on-primary font-mono">
                대기 {pendingInvites.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleMarkRead(undefined, true)}
              className="px-2 py-1 rounded-lg text-[11px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer flex items-center gap-1"
              title="모든 알림 읽음 처리"
            >
              <CheckCheck size={13} />
              <span>모두 읽음</span>
            </button>
            <button
              type="button"
              onClick={handleClearResolved}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="읽은 알림 정리"
            >
              <Trash2 size={13} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 관리자 대기 피드백 알림 배너 */}
        {isAdmin && pendingFeedbackCount > 0 && (
          <Link
            href="/settings/feedback"
            onClick={onClose}
            className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-2 hover:bg-amber-500/15 transition-colors shrink-0"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <MessageSquare size={14} className="shrink-0" />
              <span>미확인 사용자 피드백 · 오류 신고 {pendingFeedbackCount}건</span>
            </div>
            <ArrowRight size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
          </Link>
        )}

        {/* 필터 탭 */}
        <div className="px-4 py-2 border-b border-outline-variant/60 flex items-center gap-1.5 bg-surface-container-lowest shrink-0">
          {[
            { id: "all" as const, label: `전체 (${notifications.length})` },
            {
              id: "invites" as const,
              label: `협업 요청 (${notifications.filter((n) => n.type === "collab_invite").length})`,
            },
            {
              id: "updates" as const,
              label: `결과/안내 (${notifications.filter((n) => n.type !== "collab_invite").length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                filterTab === tab.id
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 알림 리스트 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scroll-module">
          {isLoading && notifications.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
              <Loader2 size={20} className="animate-spin text-primary" />
              <span className="ui-caption">알림을 불러오는 중...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center space-y-1.5">
              <Bell size={24} className="mx-auto text-on-surface-variant/40" />
              <p className="ui-body font-medium text-on-surface-variant">
                도착한 알림이 없습니다.
              </p>
              <p className="ui-caption">
                다른 회원의 협업 요청이나 수락/거절 결과가 이곳에 표시됩니다.
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const modMeta = COLLAB_MODULE_META[notif.moduleType];
              const isPendingInvite =
                notif.type === "collab_invite" && notif.actionStatus === "pending";
              const isBusy = processingId === notif._id;
              const canJump =
                notif.type !== "collab_rejected" &&
                notif.type !== "collab_removed" &&
                notif.actionStatus !== "rejected";

              return (
                <div
                  key={notif._id}
                  onClick={() => {
                    if (!notif.isRead && !isPendingInvite) {
                      handleMarkRead(notif._id);
                    }
                  }}
                  className={`rounded-xl border p-3 space-y-2 transition-colors ${
                    !notif.isRead
                      ? "bg-primary/5 border-primary/30"
                      : "bg-surface-container-low/50 border-outline-variant"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="ui-badge px-2 py-0.5 rounded-md bg-surface-container text-primary border border-outline-variant font-semibold">
                        {modMeta?.label || notif.moduleType}
                      </span>

                      {notif.role && (
                        <span className="ui-badge px-1.5 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant">
                          {notif.role === "editor" ? "편집 가능" : "읽기 전용"}
                        </span>
                      )}

                      {notif.type === "collab_accepted" && (
                        <span className="ui-badge px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <UserCheck size={11} /> 수락됨
                        </span>
                      )}
                      {notif.type === "collab_rejected" && (
                        <span className="ui-badge px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-600 dark:text-red-400 flex items-center gap-1">
                          <UserX size={11} /> 거절됨
                        </span>
                      )}
                      {(notif.type === "collab_removed" ||
                        notif.type === "collab_left") && (
                        <span className="ui-badge px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <ShieldAlert size={11} /> 안내
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-on-surface-variant">
                        {formatRelativeTime(notif.createdAt)}
                      </span>
                      {!isPendingInvite && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOne(notif._id);
                          }}
                          className="p-0.5 rounded text-on-surface-variant/70 hover:text-error cursor-pointer"
                          title="알림 삭제"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                      {!notif.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                      <span>{notif.title}</span>
                    </p>
                    <p className="ui-caption text-on-surface-variant leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* 협업 요청 수락 / 거절 액션 위젯 */}
                  {isPendingInvite && (
                    <div className="pt-1.5 space-y-2 border-t border-outline-variant/60">
                      {rejectingId === notif._id ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="거절 사유 (선택 입력)"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingId(null);
                                setRejectReason("");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-surface-container text-xs text-on-surface-variant cursor-pointer"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() =>
                                handleRespondInvite(notif, "reject", rejectReason)
                              }
                              className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
                            >
                              {isBusy ? "처리 중..." : "거절 확정"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-on-surface-variant flex items-center gap-1 truncate">
                            <Users size={12} className="text-primary shrink-0" />
                            <span className="truncate">{notif.targetTitle}</span>
                          </span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setRejectingId(notif._id)}
                              className="px-2.5 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <XCircle size={12} />
                              <span>거절</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRespondInvite(notif, "accept")}
                              className="px-3 py-1 rounded-lg bg-primary text-on-primary hover:opacity-90 text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                              <span>수락</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 이미 처리된 초대 상태 또는 이동 링크 */}
                  {!isPendingInvite && (
                    <div className="flex items-center justify-between pt-1">
                      {notif.type === "collab_invite" && (
                        <span
                          className={`text-[11px] font-semibold ${
                            notif.actionStatus === "accepted"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {notif.actionStatus === "accepted"
                            ? "수락 완료됨"
                            : "거절 완료됨"}
                        </span>
                      )}

                      {canJump && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!notif.isRead) handleMarkRead(notif._id);
                            onClose();
                            router.push(
                              getCollabModuleHref(notif.moduleType, notif.targetId)
                            );
                          }}
                          className="ml-auto text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>모듈 열기</span>
                          <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
