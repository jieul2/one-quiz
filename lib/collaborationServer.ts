import mongoose from "mongoose";
import CollaborationGroup, {
  ICollaborationGroup,
} from "@/models/CollaborationGroup";
import CanvasRoom from "@/models/CanvasRoom";
import ProjectRoadmap from "@/models/ProjectRoadmap";
import Idea from "@/models/Idea";
import Mindmap from "@/models/Mindmap";
import ProjectSpec from "@/models/ProjectSpec";
import Drawing from "@/models/Drawing";
import { User } from "@/lib/auth";
import type { CollabModuleType, CollabRole } from "@/lib/collaborationTypes";

export interface ResourceOwnerInfo {
  ownerEmail: string;
  ownerName: string;
  targetTitle: string;
}

export interface CollabAccessResult {
  canRead: boolean;
  canEdit: boolean;
  isOwner: boolean;
  role: "owner" | CollabRole | null;
  group: ICollaborationGroup | null;
}

function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && String(id).length === 24;
}

/**
 * 모듈별 실제 소유자 및 제목을 조회합니다.
 */
export async function resolveResourceOwner(
  moduleType: CollabModuleType,
  targetId: string,
  fallbackUser?: { email: string; name?: string | null }
): Promise<ResourceOwnerInfo | null> {
  if (!targetId) return null;

  switch (moduleType) {
    case "canvas": {
      const room = await CanvasRoom.findOne({ roomId: targetId }).lean();
      if (!room) return null;
      return {
        ownerEmail: room.creatorEmail,
        ownerName: room.creatorName || room.creatorEmail.split("@")[0],
        targetTitle: room.title || "캔버스 회의실",
      };
    }
    case "roadmap": {
      const roadmap = await ProjectRoadmap.findOne({
        $or: [
          { projectId: targetId },
          ...(isValidObjectId(targetId) ? [{ _id: targetId }] : []),
        ],
      }).lean();
      if (roadmap) {
        const ownerUser = await User.findOne({ email: roadmap.authorEmail })
          .select("name")
          .lean();
        return {
          ownerEmail: roadmap.authorEmail,
          ownerName:
            ownerUser?.name || roadmap.authorEmail.split("@")[0],
          targetTitle: roadmap.name || "프로젝트 로드맵",
        };
      }
      // 아직 Roadmap 문서가 저장되기 전(Backlog에서 막 전환된 프로젝트)인 경우 Idea에서 확인
      const idea = await Idea.findOne({
        $or: [
          { id: targetId },
          ...(isValidObjectId(targetId) ? [{ _id: targetId }] : []),
        ],
      }).lean();
      if (idea && idea.authorEmail) {
        const ownerUser = await User.findOne({ email: idea.authorEmail })
          .select("name")
          .lean();
        return {
          ownerEmail: idea.authorEmail,
          ownerName: ownerUser?.name || idea.authorEmail.split("@")[0],
          targetTitle: idea.title || "프로젝트 로드맵",
        };
      }
      if (fallbackUser?.email) {
        return {
          ownerEmail: fallbackUser.email,
          ownerName: fallbackUser.name || fallbackUser.email.split("@")[0],
          targetTitle: "프로젝트 로드맵",
        };
      }
      return null;
    }
    case "backlog": {
      const ownerEmail = targetId;
      const ownerUser = await User.findOne({ email: ownerEmail })
        .select("name")
        .lean();
      const displayName =
        ownerUser?.name ||
        (fallbackUser?.email === ownerEmail ? fallbackUser?.name : undefined) ||
        ownerEmail.split("@")[0];
      return {
        ownerEmail,
        ownerName: displayName,
        targetTitle: `${displayName}님의 기능 백로그`,
      };
    }
    case "mindmap": {
      if (!isValidObjectId(targetId)) return null;
      const map = await Mindmap.findById(targetId).lean();
      if (!map) return null;
      const ownerUser = await User.findOne({ email: map.authorEmail })
        .select("name")
        .lean();
      return {
        ownerEmail: map.authorEmail,
        ownerName: ownerUser?.name || map.authorEmail.split("@")[0],
        targetTitle: map.title || "마인드맵",
      };
    }
    case "erd": {
      if (!isValidObjectId(targetId)) return null;
      const spec = await ProjectSpec.findById(targetId).lean();
      if (!spec) return null;
      const ownerUser = await User.findOne({ email: spec.userEmail })
        .select("name")
        .lean();
      return {
        ownerEmail: spec.userEmail,
        ownerName: ownerUser?.name || spec.userEmail.split("@")[0],
        targetTitle: spec.title || "ERD 명세서",
      };
    }
    case "drawing": {
      if (!isValidObjectId(targetId)) return null;
      const drawing = await Drawing.findById(targetId).lean();
      if (!drawing) return null;
      const ownerUser = await User.findOne({ email: drawing.userEmail })
        .select("name")
        .lean();
      return {
        ownerEmail: drawing.userEmail,
        ownerName: ownerUser?.name || drawing.userEmail.split("@")[0],
        targetTitle: drawing.title || "스케치 그림판",
      };
    }
    default:
      return null;
  }
}

/**
 * 특정 모듈 리소스에 대한 사용자의 협업 그룹 접근 권한을 검사합니다.
 */
export async function getCollabAccess(
  moduleType: CollabModuleType,
  targetId: string,
  userEmail: string,
  knownOwnerEmail?: string
): Promise<CollabAccessResult> {
  if (!userEmail || !targetId) {
    return {
      canRead: false,
      canEdit: false,
      isOwner: false,
      role: null,
      group: null,
    };
  }

  const group = await CollaborationGroup.findOne({
    moduleType,
    targetId,
  }).lean<ICollaborationGroup>();

  const ownerEmail = knownOwnerEmail || group?.ownerEmail;
  if (ownerEmail && ownerEmail === userEmail) {
    return {
      canRead: true,
      canEdit: true,
      isOwner: true,
      role: "owner",
      group,
    };
  }

  const member = group?.members?.find((m) => m.email === userEmail);
  if (member) {
    return {
      canRead: true,
      canEdit: member.role === "editor",
      isOwner: false,
      role: member.role,
      group,
    };
  }

  return {
    canRead: false,
    canEdit: false,
    isOwner: false,
    role: null,
    group,
  };
}

/**
 * 사용자가 특정 모듈에서 협업 중인 모든 그룹 정보를 반환합니다.
 */
export async function getUserCollabGroups(
  moduleType: CollabModuleType,
  userEmail: string
) {
  if (!userEmail) return [];
  return CollaborationGroup.find({
    moduleType,
    $or: [{ ownerEmail: userEmail }, { "members.email": userEmail }],
  }).lean<ICollaborationGroup[]>();
}
