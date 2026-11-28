"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Mail,
  UserPlus,
  Users,
  Copy,
  Crown,
  Trash2,
  LogOut,
  Loader2,
  Clock,
  Send,
} from "lucide-react";
import {
  COLLAB_MODULE_META,
  getCollabModuleHref,
  dispatchNotificationsUpdated,
  type CollabModuleType,
  type CollabRole,
  type CollabMemberInfo,
  type CollabInviteInfo,
} from "@/lib/collaborationTypes";
import { toast } from "@/lib/toast";
import { useMounted } from "@/lib/hooks/useMounted";

export interface CollaborationShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleType: CollabModuleType;
  targetId: string;
  targetTitle: string;
  onChanged?: () => void;
}

export function CollaborationShareModal({
  isOpen,
  onClose,
  moduleType,
  targetId,
  targetTitle,
  onChanged,
}: CollaborationShareModalProps) {
  const mounted = useMounted();
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  const [myRole, setMyRole] = useState<"owner" | CollabRole | null>("owner");
  const [owner, setOwner] = useState<{ email: string; name: string } | null>(null);
  const [members, setMembers] = useState<CollabMemberInfo[]>([]);
  const [pendingInvites, setPendingInvites] = useState<CollabInviteInfo[]>([]);

  // 보안 강화를 위해 전체 회원 목록 노출 없이 정확한 이메일 직접 입력으로 초대
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CollabRole>("editor");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCollabInfo = useCallback(async () => {
    if (!targetId) return;
    setIsLoadingInfo(true);
    try {
      const res = await fetch(
        `/api/collaboration/invites?moduleType=${encodeURIComponent(
          moduleType
        )}&targetId=${encodeURIComponent(targetId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setIsOwner(Boolean(data.isOwner));
        setMyRole(data.myRole || null);
        setOwner(data.owner || null);
        setMembers(Array.isArray(data.members) ? data.members : []);
        setPendingInvites(
          Array.isArray(data.pendingInvites) ? data.pendingInvites : []
        );
      }
    } catch (err) {
      console.error("Failed to load collaboration info:", err);
    } finally {
      setIsLoadingInfo(false);
    }
  }, [moduleType, targetId]);

  useEffect(() => {
    if (!isOpen || !targetId) return;
    const timer = setTimeout(() => {
      loadCollabInfo();
      setInviteEmail("");
      setInviteMessage("");
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, targetId, loadCollabInfo]);

  if (!mounted || !isOpen) return null;

  const moduleLabel = COLLAB_MODULE_META[moduleType]?.label || moduleType;
  const canInvite = isOwner || myRole === "editor";

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) {
      toast.error("초대할 회원의 이메일을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/collaboration/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleType,
          targetId,
          targetTitle,
          receiverEmail: trimmedEmail,
          role: inviteRole,
          message: inviteMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "협업 요청 전송에 실패했습니다.");
        return;
      }

      toast.success(data.message || "협업 요청을 보냈습니다.");
      setInviteEmail("");
      setInviteMessage("");
      await loadCollabInfo();
      dispatchNotificationsUpdated();
      onChanged?.();
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const res = await fetch("/api/collaboration/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", inviteId }),
      });
      if (res.ok) {
        toast.info("협업 요청을 취소했습니다.");
        await loadCollabInfo();
        dispatchNotificationsUpdated();
      }
    } catch {}
  };

  const handleRoleChange = async (memberEmail: string, role: CollabRole) => {
    try {
      const res = await fetch("/api/collaboration/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateRole",
          moduleType,
          targetId,
          memberEmail,
          role,
        }),
      });
      if (res.ok) {
        toast.success("멤버 권한이 변경되었습니다.");
        await loadCollabInfo();
        onChanged?.();
      }
    } catch {}
  };

  const handleRemoveMember = async (memberEmail: string) => {
    try {
      const res = await fetch("/api/collaboration/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "removeMember",
          moduleType,
          targetId,
          memberEmail,
        }),
      });
      if (res.ok) {
        toast.info("멤버를 협업 그룹에서 제외했습니다.");
        await loadCollabInfo();
        onChanged?.();
      }
    } catch {}
  };

  const handleLeaveGroup = async () => {
    try {
      const res = await fetch("/api/collaboration/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "leave",
          moduleType,
          targetId,
        }),
      });
      if (res.ok) {
        toast.info("협업 그룹에서 나갔습니다.");
        onChanged?.();
        onClose();
      }
    } catch {}
  };

  const handleCopyShareLink = async () => {
    try {
      const url = `${window.location.origin}${getCollabModuleHref(
        moduleType,
        targetId
      )}`;
      await navigator.clipboard.writeText(url);
      toast.success("협업 전용 링크를 클립보드에 복사했습니다.");
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-label="협업 공유 관리"
        className="relative z-10 w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-on-surface"
      >
        {/* 헤더 */}
        <div className="px-5 py-3.5 border-b border-outline-variant bg-surface-container-low flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <UserPlus size={16} className="text-primary shrink-0" />
              <h3 className="ui-card-title text-on-surface truncate">
                {moduleLabel} 협업 공유
              </h3>
            </div>
            <p className="ui-caption truncate mt-0.5">
              대상: {targetTitle} (이 모듈의 해당 작업물만 공유됩니다)
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container text-xs font-semibold flex items-center gap-1 cursor-pointer"
              title="바로가기 링크 복사"
            >
              <Copy size={12} className="text-primary" />
              <span>링크</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scroll-module">
          {/* 1. 이메일 직접 입력으로 협업 요청 (타 회원 목록 비노출 보안 정책) */}
          {canInvite ? (
            <form onSubmit={handleSendInvite} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-on-surface">
                  초대할 회원 이메일 입력
                </label>
                <p className="ui-caption mt-0.5">
                  보안을 위해 전체 회원 목록은 표시되지 않습니다. 협업할 회원의 가입 이메일을 정확히 입력해주세요.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                  />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as CollabRole)
                  }
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs font-semibold text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="editor">편집 가능 (Editor)</option>
                  <option value="viewer">읽기 전용 (Viewer)</option>
                </select>
              </div>

              <input
                type="text"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="초대 메시지 (선택)"
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant text-xs text-on-surface focus:outline-none focus:border-primary"
              />

              <button
                type="submit"
                disabled={isSubmitting || !inviteEmail.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={13} />
                )}
                <span>협업 요청 보내기</span>
              </button>
            </form>
          ) : (
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant ui-caption">
              현재 읽기 전용(Viewer) 권한으로 참여 중입니다. 새 멤버 초대는 소유자 또는 편집자만 가능합니다.
            </div>
          )}

          {/* 2. 대기 중인 협업 요청 목록 */}
          {pendingInvites.length > 0 && (
            <div className="space-y-2 pt-3 border-t border-outline-variant">
              <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                <Clock size={13} className="text-amber-500" />
                <span>수락 대기 중인 요청 ({pendingInvites.length})</span>
              </div>
              <div className="space-y-1.5">
                {pendingInvites.map((inv) => (
                  <div
                    key={inv._id}
                    className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-on-surface">
                        {inv.receiverName}
                      </span>
                      <span className="text-on-surface-variant ml-1.5">
                        ({inv.receiverEmail}) ·{" "}
                        {inv.role === "editor" ? "편집 가능" : "읽기 전용"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelInvite(inv._id)}
                      className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer shrink-0"
                    >
                      요청 취소
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. 현재 협업 그룹 멤버 */}
          <div className="space-y-2 pt-3 border-t border-outline-variant">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface">
                <Users size={14} className="text-primary" />
                <span>협업 그룹 멤버 ({members.length + 1}명)</span>
              </div>
              {!isOwner && myRole && (
                <button
                  type="button"
                  onClick={handleLeaveGroup}
                  className="text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LogOut size={12} />
                  <span>그룹 나가기</span>
                </button>
              )}
            </div>

            {isLoadingInfo ? (
              <div className="py-4 flex items-center justify-center text-on-surface-variant gap-2 text-xs">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span>불러오는 중...</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {owner && (
                  <div className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Crown size={13} className="text-amber-500 shrink-0" />
                      <span className="font-bold text-on-surface truncate">
                        {owner.name}
                      </span>
                      <span className="text-[11px] text-on-surface-variant truncate">
                        ({owner.email})
                      </span>
                    </div>
                    <span className="ui-badge px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold shrink-0">
                      소유자
                    </span>
                  </div>
                )}

                {members.length === 0 ? (
                  <p className="ui-caption py-2">
                    아직 수락한 협업 멤버가 없습니다. 위에서 이메일을 입력해 초대해보세요.
                  </p>
                ) : (
                  members.map((m) => (
                    <div
                      key={m.email}
                      className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-on-surface truncate">
                          {m.name}
                        </p>
                        <p className="text-[11px] text-on-surface-variant truncate">
                          {m.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOwner ? (
                          <>
                            <select
                              value={m.role}
                              onChange={(e) =>
                                handleRoleChange(
                                  m.email,
                                  e.target.value as CollabRole
                                )
                              }
                              className="px-2 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant text-[11px] font-semibold cursor-pointer"
                            >
                              <option value="editor">편집 가능</option>
                              <option value="viewer">읽기 전용</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m.email)}
                              className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-500 hover:bg-surface-container cursor-pointer"
                              title="멤버 내보내기"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <span className="ui-badge px-2 py-0.5 rounded-md bg-surface-container text-on-surface-variant">
                            {m.role === "editor" ? "편집 가능" : "읽기 전용"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
