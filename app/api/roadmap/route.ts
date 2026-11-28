import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ProjectRoadmap from "@/models/ProjectRoadmap";
import Idea from "@/models/Idea";
import { withAudit } from "@/lib/withAudit";
import { getCollabAccess, getUserCollabGroups } from "@/lib/collaborationServer";

// 1. 로드맵 조회 (단건 또는 본인+협업 수락된 공유 로드맵 목록)
async function handleGet(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const listMode = url.searchParams.get("list") === "true";

  const groups = await getUserCollabGroups("roadmap", userEmail);
  const groupByProjectId = new Map(groups.map((g) => [g.targetId, g]));
  const sharedProjectIds = groups
    .filter((g) => g.ownerEmail !== userEmail)
    .map((g) => g.targetId);

  if (listMode) {
    const [roadmaps, sharedIdeas] = await Promise.all([
      ProjectRoadmap.find({
        $or: [
          { authorEmail: userEmail },
          { "members.email": userEmail },
          ...(sharedProjectIds.length > 0
            ? [{ projectId: { $in: sharedProjectIds } }]
            : []),
        ],
      })
        .sort({ updatedAt: -1 })
        .lean(),
      sharedProjectIds.length > 0
        ? Idea.find({ id: { $in: sharedProjectIds } }).lean()
        : Promise.resolve([]),
    ]);

    const resultMap = new Map<string, Record<string, unknown>>();

    for (const r of roadmaps) {
      const pid = String(r.projectId || r._id);
      const isOwner = r.authorEmail === userEmail;
      const group = groupByProjectId.get(pid);
      const groupMember = group?.members?.find((m) => m.email === userEmail);
      const legacyMember = r.members?.find((m) => m.email === userEmail);
      const collabRole = isOwner
        ? "owner"
        : groupMember?.role || legacyMember?.role || "viewer";

      resultMap.set(pid, {
        ...r,
        projectId: pid,
        isOwner,
        isShared: !isOwner || (group?.members?.length || r.members?.length || 0) > 0,
        collabRole,
        ownerName: group?.ownerName || r.authorEmail.split("@")[0],
        memberCount: (group?.members?.length || r.members?.length || 0) + 1,
      });
    }

    // 백로그에서 전환된 직후 아직 ProjectRoadmap 문서가 생성되기 전인 공유 프로젝트도 목록에 포함
    for (const group of groups) {
      if (group.ownerEmail !== userEmail && !resultMap.has(group.targetId)) {
        const linkedIdea = sharedIdeas.find((i) => i.id === group.targetId);
        const member = group.members?.find((m) => m.email === userEmail);
        resultMap.set(group.targetId, {
          projectId: group.targetId,
          authorEmail: group.ownerEmail,
          name: linkedIdea?.title || group.targetTitle,
          description: linkedIdea?.description || "",
          startDate: linkedIdea?.startDate || "2026-10-15",
          endDate: linkedIdea?.endDate || "2026-11-04",
          createdAt: group.createdAt,
          isOwner: false,
          isShared: true,
          collabRole: member?.role || "viewer",
          ownerName: group.ownerName,
          memberCount: (group.members?.length || 0) + 1,
          items: [],
        });
      }
    }

    return NextResponse.json(Array.from(resultMap.values()), { status: 200 });
  }

  if (projectId) {
    const isSharedAccess = sharedProjectIds.includes(projectId);
    const roadmap = await ProjectRoadmap.findOne({
      projectId,
      $or: [
        { authorEmail: userEmail },
        { "members.email": userEmail },
        ...(isSharedAccess ? [{ projectId }] : []),
      ],
    }).lean();

    if (!roadmap) {
      return NextResponse.json(null, { status: 200 });
    }

    const isOwner = roadmap.authorEmail === userEmail;
    const group = groupByProjectId.get(projectId);
    const groupMember = group?.members?.find((m) => m.email === userEmail);
    const legacyMember = roadmap.members?.find((m) => m.email === userEmail);
    const collabRole = isOwner
      ? "owner"
      : groupMember?.role || legacyMember?.role || "viewer";

    return NextResponse.json(
      {
        ...roadmap,
        isOwner,
        isShared: !isOwner || (group?.members?.length || roadmap.members?.length || 0) > 0,
        collabRole,
        ownerName: group?.ownerName || roadmap.authorEmail.split("@")[0],
      },
      { status: 200 }
    );
  }

  const roadmap = await ProjectRoadmap.findOne({
    $or: [{ authorEmail: userEmail }, { "members.email": userEmail }],
  }).lean();
  return NextResponse.json(roadmap || null, { status: 200 });
}

// 2. 로드맵 생성/동기화 (소유자 및 editor 권한 협업자 허용)
async function handlePost(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const body = await req.json();
  const projectId = body.projectId || body.id || "proj-1";

  const existing = await ProjectRoadmap.findOne({ projectId }).lean();
  const access = await getCollabAccess(
    "roadmap",
    projectId,
    userEmail,
    existing?.authorEmail
  );

  if (existing) {
    const legacyMember = existing.members?.find((m) => m.email === userEmail);
    const canEdit =
      access.canEdit ||
      existing.authorEmail === userEmail ||
      legacyMember?.role === "editor" ||
      legacyMember?.role === "admin";

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: "로드맵 편집 권한이 없습니다." },
        { status: 403 }
      );
    }

    const updated = await ProjectRoadmap.findOneAndUpdate(
      { _id: existing._id },
      {
        $set: {
          name: body.name || existing.name || "프로젝트 로드맵",
          description:
            body.description !== undefined
              ? body.description
              : existing.description || "",
          startDate: body.startDate || existing.startDate || "2026-10-15",
          endDate: body.endDate || existing.endDate || "2026-11-04",
          isPublic:
            body.isPublic !== undefined ? body.isPublic : existing.isPublic,
          items: body.items || [],
        },
      },
      { returnDocument: "after" }
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  }

  // 아직 ProjectRoadmap 문서가 없지만 협업자로 접근해 처음 저장하는 경우 원래 백로그/그룹 소유자 유지
  const targetOwnerEmail =
    access.group?.ownerEmail && access.canEdit
      ? access.group.ownerEmail
      : userEmail;

  const roadmapData = {
    authorEmail: targetOwnerEmail,
    projectId,
    name: body.name || "프로젝트 로드맵",
    description: body.description || "",
    startDate: body.startDate || "2026-10-15",
    endDate: body.endDate || "2026-11-04",
    isPublic: body.isPublic !== undefined ? body.isPublic : false,
    members:
      access.group?.members?.map((m) => ({
        email: m.email,
        name: m.name,
        role: m.role,
      })) ||
      body.members ||
      [],
    items: body.items || [],
  };

  const created = await ProjectRoadmap.findOneAndUpdate(
    { authorEmail: targetOwnerEmail, projectId },
    roadmapData,
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  return NextResponse.json({ success: true, data: created }, { status: 200 });
}

export const GET = withAudit(handleGet, "로드맵 데이터 조회");
export const POST = withAudit(handlePost, "로드맵 데이터 동기화 및 저장");
