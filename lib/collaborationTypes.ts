export type CollabModuleType =
  | "canvas"
  | "roadmap"
  | "backlog"
  | "mindmap"
  | "erd"
  | "drawing";

export type CollabRole = "editor" | "viewer";

export interface CollabMemberInfo {
  email: string;
  name: string;
  role: CollabRole;
  joinedAt?: string;
}

export interface CollabInviteInfo {
  _id: string;
  moduleType: CollabModuleType;
  targetId: string;
  targetTitle: string;
  role: CollabRole;
  senderEmail: string;
  senderName: string;
  receiverEmail: string;
  receiverName: string;
  message?: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  rejectReason?: string;
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  recipientEmail: string;
  senderEmail: string;
  senderName: string;
  type:
    | "collab_invite"
    | "collab_accepted"
    | "collab_rejected"
    | "collab_removed"
    | "collab_left"
    | "collab_role_changed"
    | "system";
  moduleType: CollabModuleType;
  targetId: string;
  targetTitle: string;
  inviteId?: string;
  role?: CollabRole;
  title: string;
  message: string;
  actionStatus: "pending" | "accepted" | "rejected" | "none";
  isRead: boolean;
  createdAt: string;
}

export const COLLAB_MODULE_META: Record<
  CollabModuleType,
  { label: string; route: string }
> = {
  canvas: { label: "캔버스 회의실", route: "/canvas" },
  roadmap: { label: "프로젝트 로드맵", route: "/projects" },
  backlog: { label: "기능 백로그", route: "/ideas" },
  mindmap: { label: "2D 마인드맵", route: "/mindmap" },
  erd: { label: "ERD 명세서", route: "/erd" },
  drawing: { label: "스케치 그림판", route: "/drawing" },
};

export function getCollabModuleHref(
  moduleType: CollabModuleType,
  targetId: string
): string {
  const base = COLLAB_MODULE_META[moduleType]?.route || "/";
  if (moduleType === "backlog") {
    return `${base}?workspace=${encodeURIComponent(targetId)}`;
  }
  return `${base}?id=${encodeURIComponent(targetId)}`;
}

export function dispatchNotificationsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("onequiz:notifications-updated"));
  }
}

export function dispatchCollabUpdated(moduleType?: CollabModuleType): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("onequiz:collab-updated", { detail: { moduleType } })
    );
  }
}
