import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CanvasRoom from "@/models/CanvasRoom";
import CanvasItem from "@/models/CanvasItem";
import CollaborationGroup from "@/models/CollaborationGroup";
import CollaborationInvite from "@/models/CollaborationInvite";
import { getUserCollabGroups } from "@/lib/collaborationServer";

// 1. 회의실 목록 조회 (본인 생성 + 협업 수락한 공유 회의실만 반환)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();

    const groups = await getUserCollabGroups("canvas", userEmail);
    const groupByRoomId = new Map(groups.map((g) => [g.targetId, g]));
    const sharedRoomIds = groups
      .filter((g) => g.ownerEmail !== userEmail)
      .map((g) => g.targetId);

    const rooms = await CanvasRoom.find({
      $or: [
        { creatorEmail: userEmail },
        ...(sharedRoomIds.length > 0 ? [{ roomId: { $in: sharedRoomIds } }] : []),
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = rooms.map((room) => {
      const isOwner = room.creatorEmail === userEmail;
      const group = groupByRoomId.get(room.roomId);
      const member = group?.members?.find((m) => m.email === userEmail);
      const memberCount = (group?.members?.length || 0) + 1;

      return {
        ...room,
        isOwner,
        isShared: !isOwner || (group?.members?.length || 0) > 0,
        collabRole: isOwner ? "owner" : member?.role || "viewer",
        memberCount,
        ownerName: group?.ownerName || room.creatorName || "회원",
      };
    });

    return NextResponse.json({
      success: true,
      rooms: formatted,
    });
  } catch (error) {
    console.error("GET /api/canvas/rooms error:", error);
    return NextResponse.json(
      { error: "회의실 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 2. 새 회의실 생성 (개인 격리)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const creatorEmail = session?.user?.email;
    if (!creatorEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const creatorName =
      session.user?.name || creatorEmail.split("@")[0] || "학습자";

    const body = await req.json();
    const { title, description = "", category = "브레인스토밍" } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "회의실 이름을 입력해주세요." }, { status: 400 });
    }

    const roomId = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    await dbConnect();

    const newRoom = await CanvasRoom.create({
      roomId,
      title: title.trim(),
      description: description.trim(),
      category,
      creatorEmail,
      creatorName,
    });

    return NextResponse.json(
      {
        success: true,
        room: {
          ...newRoom.toObject(),
          isOwner: true,
          isShared: false,
          collabRole: "owner",
          memberCount: 1,
          ownerName: creatorName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/canvas/rooms error:", error);
    return NextResponse.json(
      { error: "회의실 개설 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 3. 회의실 삭제 (소유자 전용)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json({ error: "회의실 ID가 필요합니다." }, { status: 400 });
    }

    await dbConnect();

    const deleted = await CanvasRoom.findOneAndDelete({
      roomId,
      creatorEmail: userEmail,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "삭제할 회의실이 없거나 삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    await Promise.all([
      CanvasItem.deleteMany({ boardId: roomId }),
      CollaborationGroup.deleteMany({ moduleType: "canvas", targetId: roomId }),
      CollaborationInvite.deleteMany({ moduleType: "canvas", targetId: roomId }),
    ]);

    return NextResponse.json({ success: true, message: "회의실이 삭제되었습니다." });
  } catch (error) {
    console.error("DELETE /api/canvas/rooms error:", error);
    return NextResponse.json(
      { error: "회의실 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
