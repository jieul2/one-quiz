import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, User } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CollaborationInvite from "@/models/CollaborationInvite";
import CollaborationGroup from "@/models/CollaborationGroup";
import Notification from "@/models/Notification";
import ProjectRoadmap from "@/models/ProjectRoadmap";
import {
  COLLAB_MODULE_META,
  type CollabModuleType,
  type CollabRole,
} from "@/lib/collaborationTypes";
import { resolveResourceOwner } from "@/lib/collaborationServer";

const VALID_MODULES: CollabModuleType[] = [
  "canvas",
  "roadmap",
  "backlog",
  "mindmap",
  "erd",
  "drawing",
];

function isValidModule(m: string | null): m is CollabModuleType {
  return Boolean(m && VALID_MODULES.includes(m as CollabModuleType));
}

/**
 * GET /api/collaboration/invites?moduleType=...&targetId=...
 * 해당 모듈/리소스의 협업 그룹 멤버 및 대기 중인 초대 목록 조회
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const moduleType = searchParams.get("moduleType");
    const targetId = searchParams.get("targetId");

    await dbConnect();

    if (isValidModule(moduleType) && targetId) {
      const ownerInfo = await resolveResourceOwner(moduleType, targetId, {
        email: userEmail,
        name: session.user?.name,
      });

      const group = await CollaborationGroup.findOne({
        moduleType,
        targetId,
      }).lean();

      const isOwner =
        ownerInfo?.ownerEmail === userEmail || group?.ownerEmail === userEmail;
      const memberEntry = group?.members?.find((m) => m.email === userEmail);

      if (!isOwner && !memberEntry) {
        return NextResponse.json(
          { error: "접근 권한이 없습니다." },
          { status: 403 }
        );
      }

      const pendingInvites = await CollaborationInvite.find({
        moduleType,
        targetId,
        status: "pending",
      })
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({
        success: true,
        isOwner,
        myRole: isOwner ? "owner" : memberEntry?.role || null,
        owner: {
          email: group?.ownerEmail || ownerInfo?.ownerEmail || userEmail,
          name:
            group?.ownerName ||
            ownerInfo?.ownerName ||
            userEmail.split("@")[0],
        },
        targetTitle:
          group?.targetTitle || ownerInfo?.targetTitle || "공유 워크스페이스",
        members: group?.members || [],
        pendingInvites,
      });
    }

    // 전체: 내가 받은 대기 중인 초대 + 내가 협업 중인 그룹 목록
    const [incomingInvites, outgoingInvites, groups] = await Promise.all([
      CollaborationInvite.find({
        receiverEmail: userEmail,
        status: "pending",
      })
        .sort({ createdAt: -1 })
        .lean(),
      CollaborationInvite.find({
        senderEmail: userEmail,
        status: "pending",
      })
        .sort({ createdAt: -1 })
        .lean(),
      CollaborationGroup.find({
        $or: [{ ownerEmail: userEmail }, { "members.email": userEmail }],
      })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      incomingInvites,
      outgoingInvites,
      groups,
    });
  } catch (error) {
    console.error("GET /api/collaboration/invites error:", error);
    return NextResponse.json(
      { error: "협업 정보 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collaboration/invites
 * 회원 검색 결과 대상에게 특정 모듈 리소스 협업 요청 전송
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const senderEmail = session?.user?.email;
    if (!senderEmail) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      moduleType,
      targetId,
      targetTitle: bodyTitle,
      receiverEmail,
      role = "editor",
      message = "",
    } = body as {
      moduleType: string;
      targetId: string;
      targetTitle?: string;
      receiverEmail: string;
      role?: CollabRole;
      message?: string;
    };

    if (!isValidModule(moduleType) || !targetId || !receiverEmail) {
      return NextResponse.json(
        { error: "모듈, 대상 ID, 초대할 회원을 모두 선택해주세요." },
        { status: 400 }
      );
    }

    if (receiverEmail === senderEmail) {
      return NextResponse.json(
        { error: "본인에게는 협업 요청을 보낼 수 없습니다." },
        { status: 400 }
      );
    }

    await dbConnect();

    const receiver = await User.findOne({ email: receiverEmail })
      .select("name email")
      .lean();
    if (!receiver || !receiver.email) {
      return NextResponse.json(
        { error: "초대할 회원을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const ownerInfo = await resolveResourceOwner(moduleType, targetId, {
      email: senderEmail,
      name: session.user?.name,
    });

    if (!ownerInfo) {
      return NextResponse.json(
        { error: "공유할 대상을 찾을 수 없습니다. 먼저 저장 후 시도해주세요." },
        { status: 404 }
      );
    }

    const existingGroup = await CollaborationGroup.findOne({
      moduleType,
      targetId,
    }).lean();

    const isOwner = ownerInfo.ownerEmail === senderEmail;
    const isEditorMember = existingGroup?.members?.some(
      (m) => m.email === senderEmail && m.role === "editor"
    );

    if (!isOwner && !isEditorMember) {
      return NextResponse.json(
        { error: "이 리소스에 협업자를 초대할 권한이 없습니다." },
        { status: 403 }
      );
    }

    if (
      ownerInfo.ownerEmail === receiverEmail ||
      existingGroup?.members?.some((m) => m.email === receiverEmail)
    ) {
      return NextResponse.json(
        { error: "이미 해당 모듈 협업 그룹에 참여 중인 회원입니다." },
        { status: 409 }
      );
    }

    const duplicatePending = await CollaborationInvite.findOne({
      moduleType,
      targetId,
      receiverEmail,
      status: "pending",
    });
    if (duplicatePending) {
      return NextResponse.json(
        { error: "이미 수락 대기 중인 협업 요청이 있습니다." },
        { status: 409 }
      );
    }

    const senderName =
      session.user?.name || senderEmail.split("@")[0] || "회원";
    const receiverName =
      receiver.name || receiver.email.split("@")[0] || "회원";
    const resolvedTitle = (bodyTitle || ownerInfo.targetTitle).trim();
    const normalizedRole: CollabRole = role === "viewer" ? "viewer" : "editor";
    const moduleLabel = COLLAB_MODULE_META[moduleType].label;

    const invite = await CollaborationInvite.create({
      moduleType,
      targetId,
      targetTitle: resolvedTitle,
      role: normalizedRole,
      senderEmail,
      senderName,
      receiverEmail,
      receiverName,
      message: String(message || "").trim(),
      status: "pending",
    });

    await Notification.create({
      recipientEmail: receiverEmail,
      senderEmail,
      senderName,
      type: "collab_invite",
      moduleType,
      targetId,
      targetTitle: resolvedTitle,
      inviteId: String(invite._id),
      role: normalizedRole,
      title: `${senderName}님의 ${moduleLabel} 협업 요청`,
      message:
        String(message || "").trim() ||
        `[${resolvedTitle}] ${
          normalizedRole === "editor" ? "편집 가능" : "읽기 전용"
        } 협업에 초대했습니다.`,
      actionStatus: "pending",
      isRead: false,
    });

    return NextResponse.json(
      {
        success: true,
        message: `${receiverName}님에게 협업 요청을 보냈습니다.`,
        invite,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/collaboration/invites error:", error);
    return NextResponse.json(
      { error: "협업 요청 전송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/collaboration/invites
 * 협업 요청 수락 / 거절 / 취소 / 멤버 권한 변경 / 멤버 내보내기 / 나가기
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { action, inviteId, moduleType, targetId, memberEmail, role, rejectReason } =
      body as {
        action:
          | "accept"
          | "reject"
          | "cancel"
          | "updateRole"
          | "removeMember"
          | "leave";
        inviteId?: string;
        moduleType?: CollabModuleType;
        targetId?: string;
        memberEmail?: string;
        role?: CollabRole;
        rejectReason?: string;
      };

    await dbConnect();
    const currentUserName =
      session.user?.name || userEmail.split("@")[0] || "회원";

    // 1. 수락 또는 거절 (수신자 전용)
    if (action === "accept" || action === "reject") {
      if (!inviteId) {
        return NextResponse.json(
          { error: "초대 ID가 필요합니다." },
          { status: 400 }
        );
      }

      const invite = await CollaborationInvite.findById(inviteId);
      if (!invite) {
        return NextResponse.json(
          { error: "협업 요청을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
      if (invite.receiverEmail !== userEmail) {
        return NextResponse.json(
          { error: "본인에게 온 요청만 처리할 수 있습니다." },
          { status: 403 }
        );
      }
      if (invite.status !== "pending") {
        return NextResponse.json(
          { error: "이미 처리된 협업 요청입니다." },
          { status: 409 }
        );
      }

      const moduleLabel = COLLAB_MODULE_META[invite.moduleType].label;

      if (action === "accept") {
        invite.status = "accepted";
        invite.respondedAt = new Date();
        await invite.save();

        const ownerInfo = await resolveResourceOwner(
          invite.moduleType,
          invite.targetId,
          { email: invite.senderEmail, name: invite.senderName }
        );

        const group = await CollaborationGroup.findOneAndUpdate(
          { moduleType: invite.moduleType, targetId: invite.targetId },
          {
            $setOnInsert: {
              moduleType: invite.moduleType,
              targetId: invite.targetId,
              ownerEmail: ownerInfo?.ownerEmail || invite.senderEmail,
              ownerName: ownerInfo?.ownerName || invite.senderName,
            },
            $set: {
              targetTitle: ownerInfo?.targetTitle || invite.targetTitle,
            },
          },
          { upsert: true, returnDocument: "after" }
        );

        const alreadyInMembers = group.members.some(
          (m) => m.email === userEmail
        );
        if (!alreadyInMembers && group.ownerEmail !== userEmail) {
          group.members.push({
            email: userEmail,
            name: currentUserName,
            role: invite.role,
            joinedAt: new Date(),
          });
          await group.save();
        }

        // 프로젝트 로드맵일 경우 ProjectRoadmap.members에도 동기화
        if (invite.moduleType === "roadmap") {
          await ProjectRoadmap.findOneAndUpdate(
            { projectId: invite.targetId },
            {
              $pull: { members: { email: userEmail } },
            }
          );
          await ProjectRoadmap.findOneAndUpdate(
            { projectId: invite.targetId },
            {
              $push: {
                members: {
                  email: userEmail,
                  name: currentUserName,
                  role: invite.role,
                },
              },
            }
          );
        }

        await Notification.updateMany(
          { inviteId: String(invite._id), recipientEmail: userEmail },
          { $set: { actionStatus: "accepted", isRead: true } }
        );

        await Notification.create({
          recipientEmail: invite.senderEmail,
          senderEmail: userEmail,
          senderName: currentUserName,
          type: "collab_accepted",
          moduleType: invite.moduleType,
          targetId: invite.targetId,
          targetTitle: invite.targetTitle,
          inviteId: String(invite._id),
          role: invite.role,
          title: `${currentUserName}님이 협업 요청을 수락했습니다`,
          message: `[${moduleLabel} · ${invite.targetTitle}] 협업 그룹에 합류했습니다.`,
          actionStatus: "none",
          isRead: false,
        });

        return NextResponse.json({
          success: true,
          message: `[${invite.targetTitle}] 협업 그룹에 참여했습니다.`,
          invite,
          group,
        });
      }

      // 거절 처리
      invite.status = "rejected";
      invite.rejectReason = String(rejectReason || "").trim();
      invite.respondedAt = new Date();
      await invite.save();

      await Notification.updateMany(
        { inviteId: String(invite._id), recipientEmail: userEmail },
        { $set: { actionStatus: "rejected", isRead: true } }
      );

      await Notification.create({
        recipientEmail: invite.senderEmail,
        senderEmail: userEmail,
        senderName: currentUserName,
        type: "collab_rejected",
        moduleType: invite.moduleType,
        targetId: invite.targetId,
        targetTitle: invite.targetTitle,
        inviteId: String(invite._id),
        title: `${currentUserName}님이 협업 요청을 거절했습니다`,
        message: invite.rejectReason
          ? `[${moduleLabel} · ${invite.targetTitle}] 거절 사유: ${invite.rejectReason}`
          : `[${moduleLabel} · ${invite.targetTitle}] 협업 요청이 거절되었습니다.`,
        actionStatus: "none",
        isRead: false,
      });

      return NextResponse.json({
        success: true,
        message: "협업 요청을 거절하고 요청자에게 알림을 보냈습니다.",
        invite,
      });
    }

    // 2. 발신자의 초대 취소
    if (action === "cancel") {
      if (!inviteId) {
        return NextResponse.json(
          { error: "초대 ID가 필요합니다." },
          { status: 400 }
        );
      }
      const invite = await CollaborationInvite.findById(inviteId);
      if (!invite || invite.senderEmail !== userEmail) {
        return NextResponse.json(
          { error: "취소할 권한이 없습니다." },
          { status: 403 }
        );
      }
      if (invite.status !== "pending") {
        return NextResponse.json(
          { error: "대기 중인 요청만 취소할 수 있습니다." },
          { status: 409 }
        );
      }
      invite.status = "cancelled";
      await invite.save();

      await Notification.deleteMany({
        inviteId: String(invite._id),
        type: "collab_invite",
      });

      return NextResponse.json({
        success: true,
        message: "협업 요청을 취소했습니다.",
      });
    }

    // 3. 멤버 권한 변경 / 내보내기 / 나가기
    if (!isValidModule(moduleType || null) || !targetId) {
      return NextResponse.json(
        { error: "모듈 및 대상 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const group = await CollaborationGroup.findOne({ moduleType, targetId });
    if (!group) {
      return NextResponse.json(
        { error: "협업 그룹을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const moduleLabel = COLLAB_MODULE_META[moduleType!].label;

    if (action === "leave") {
      if (group.ownerEmail === userEmail) {
        return NextResponse.json(
          { error: "소유자는 협업 그룹에서 나갈 수 없습니다." },
          { status: 400 }
        );
      }
      group.members = group.members.filter((m) => m.email !== userEmail);
      await group.save();

      if (moduleType === "roadmap") {
        await ProjectRoadmap.findOneAndUpdate(
          { projectId: targetId },
          { $pull: { members: { email: userEmail } } }
        );
      }

      await Notification.create({
        recipientEmail: group.ownerEmail,
        senderEmail: userEmail,
        senderName: currentUserName,
        type: "collab_left",
        moduleType: moduleType!,
        targetId,
        targetTitle: group.targetTitle,
        title: `${currentUserName}님이 협업 그룹에서 나갔습니다`,
        message: `[${moduleLabel} · ${group.targetTitle}] 협업 참여를 종료했습니다.`,
        actionStatus: "none",
        isRead: false,
      });

      return NextResponse.json({
        success: true,
        message: "협업 그룹에서 나갔습니다.",
      });
    }

    // 소유자 전용 작업 (권한 변경 / 멤버 내보내기)
    if (group.ownerEmail !== userEmail) {
      return NextResponse.json(
        { error: "소유자만 멤버 권한을 관리할 수 있습니다." },
        { status: 403 }
      );
    }

    if (!memberEmail) {
      return NextResponse.json(
        { error: "대상 멤버 이메일이 필요합니다." },
        { status: 400 }
      );
    }

    if (action === "updateRole") {
      const nextRole: CollabRole = role === "viewer" ? "viewer" : "editor";
      group.members = group.members.map((m) =>
        m.email === memberEmail ? { ...m, role: nextRole } : m
      );
      await group.save();

      if (moduleType === "roadmap") {
        await ProjectRoadmap.findOneAndUpdate(
          { projectId: targetId, "members.email": memberEmail },
          { $set: { "members.$.role": nextRole } }
        );
      }

      await Notification.create({
        recipientEmail: memberEmail,
        senderEmail: userEmail,
        senderName: currentUserName,
        type: "collab_role_changed",
        moduleType: moduleType!,
        targetId,
        targetTitle: group.targetTitle,
        role: nextRole,
        title: `협업 권한이 변경되었습니다`,
        message: `[${moduleLabel} · ${group.targetTitle}] 권한이 '${
          nextRole === "editor" ? "편집 가능" : "읽기 전용"
        }'(으)로 변경되었습니다.`,
        actionStatus: "none",
        isRead: false,
      });

      return NextResponse.json({
        success: true,
        message: "멤버 권한이 변경되었습니다.",
        members: group.members,
      });
    }

    if (action === "removeMember") {
      group.members = group.members.filter((m) => m.email !== memberEmail);
      await group.save();

      if (moduleType === "roadmap") {
        await ProjectRoadmap.findOneAndUpdate(
          { projectId: targetId },
          { $pull: { members: { email: memberEmail } } }
        );
      }

      await Notification.create({
        recipientEmail: memberEmail,
        senderEmail: userEmail,
        senderName: currentUserName,
        type: "collab_removed",
        moduleType: moduleType!,
        targetId,
        targetTitle: group.targetTitle,
        title: `협업 공유가 해제되었습니다`,
        message: `[${moduleLabel} · ${group.targetTitle}] 협업 그룹에서 제외되었습니다.`,
        actionStatus: "none",
        isRead: false,
      });

      return NextResponse.json({
        success: true,
        message: "멤버를 협업 그룹에서 제외했습니다.",
        members: group.members,
      });
    }

    return NextResponse.json(
      { error: "지원하지 않는 작업입니다." },
      { status: 400 }
    );
  } catch (error) {
    console.error("PATCH /api/collaboration/invites error:", error);
    return NextResponse.json(
      { error: "협업 상태 변경 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
