import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Mindmap from "@/models/Mindmap";
import CollaborationGroup from "@/models/CollaborationGroup";
import CollaborationInvite from "@/models/CollaborationInvite";
import { withAudit } from "@/lib/withAudit";
import { getCollabAccess, getUserCollabGroups } from "@/lib/collaborationServer";

// 1. 마인드맵 목록 조회 (본인 소유 + 협업 수락된 마인드맵만 조회)
async function handleGet() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();

  const groups = await getUserCollabGroups("mindmap", userEmail);
  const groupById = new Map(groups.map((g) => [g.targetId, g]));
  const sharedIds = groups
    .filter((g) => g.ownerEmail !== userEmail)
    .map((g) => g.targetId);

  const maps = await Mindmap.find({
    $or: [
      { authorEmail: userEmail },
      ...(sharedIds.length > 0 ? [{ _id: { $in: sharedIds } }] : []),
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const formatted = maps.map((m) => {
    const idStr = String(m._id);
    const isOwner = m.authorEmail === userEmail;
    const group = groupById.get(idStr);
    const member = group?.members?.find((item) => item.email === userEmail);

    return {
      ...m,
      isOwner,
      isShared: !isOwner || (group?.members?.length || 0) > 0,
      collabRole: isOwner ? "owner" : member?.role || "viewer",
      ownerName: group?.ownerName || m.authorEmail.split("@")[0],
      memberCount: (group?.members?.length || 0) + 1,
    };
  });

  return NextResponse.json(formatted, { status: 200 });
}

// 2. 마인드맵 생성
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

  if (Array.isArray(body)) {
    await Mindmap.deleteMany({ authorEmail: userEmail });
    const items = body.map((m) => ({
      authorEmail: userEmail,
      title: m.title,
      nodeCount: m.nodeCount || 5,
      lastEdited: m.lastEdited || new Date().toISOString().slice(0, 10),
      rootNode: m.rootNode || m.title,
      branches: m.branches || [],
    }));
    const created = await Mindmap.insertMany(items);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  }

  const newMap = await Mindmap.create({
    authorEmail: userEmail,
    title: body.title,
    nodeCount: body.nodeCount || 5,
    lastEdited: body.lastEdited || new Date().toISOString().slice(0, 10),
    rootNode: body.rootNode || body.title,
    branches: body.branches || [],
    nodes: body.nodes || [],
  });

  return NextResponse.json({ success: true, data: newMap }, { status: 201 });
}

// 3. 마인드맵 수정 (소유자 또는 editor 권한 협업자 허용)
async function handlePut(req: Request) {
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
  const { id, _id, ...updateFields } = body;
  const mapId = String(_id || id || "");

  if (!mapId) {
    return NextResponse.json(
      { success: false, error: "마인드맵 ID가 필요합니다." },
      { status: 400 }
    );
  }

  const existing = await Mindmap.findById(mapId).lean();
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "마인드맵을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const access = await getCollabAccess(
    "mindmap",
    mapId,
    userEmail,
    existing.authorEmail
  );
  if (!access.canEdit) {
    return NextResponse.json(
      { success: false, error: "마인드맵 편집 권한이 없습니다." },
      { status: 403 }
    );
  }

  const updated = await Mindmap.findByIdAndUpdate(
    mapId,
    {
      ...updateFields,
      authorEmail: existing.authorEmail,
      lastEdited: new Date().toISOString().slice(0, 10),
    },
    { returnDocument: "after" }
  );

  return NextResponse.json({ success: true, data: updated }, { status: 200 });
}

// 4. 마인드맵 삭제 (소유자 전용)
async function handleDelete(req: Request) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "ID is required" },
      { status: 400 }
    );
  }

  const deleted = await Mindmap.findOneAndDelete({
    _id: id,
    authorEmail: userEmail,
  });
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "마인드맵을 찾을 수 없거나 삭제 권한이 없습니다." },
      { status: 404 }
    );
  }

  await Promise.all([
    CollaborationGroup.deleteMany({ moduleType: "mindmap", targetId: id }),
    CollaborationInvite.deleteMany({ moduleType: "mindmap", targetId: id }),
  ]);

  return NextResponse.json({ success: true }, { status: 200 });
}

export const GET = withAudit(handleGet, "마인드맵 목록 조회");
export const POST = withAudit(handlePost, "마인드맵 등록");
export const PUT = withAudit(handlePut, "마인드맵 수정");
export const DELETE = withAudit(handleDelete, "마인드맵 삭제");
