import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CanvasItem from "@/models/CanvasItem";
import CanvasRoom from "@/models/CanvasRoom";
import { getCollabAccess } from "@/lib/collaborationServer";

async function verifyRoomAccess(boardId: string, userEmail: string) {
  const room = await CanvasRoom.findOne({ roomId: boardId }).lean();
  if (!room) {
    return {
      room: null,
      canRead: false,
      canEdit: false,
      role: null as "owner" | "editor" | "viewer" | null,
    };
  }
  const access = await getCollabAccess(
    "canvas",
    boardId,
    userEmail,
    room.creatorEmail
  );
  return {
    room,
    canRead: access.canRead,
    canEdit: access.canEdit,
    role: access.role,
  };
}

// 1. 캔버스 아이템 목록 조회 (소유자 또는 협업 그룹 멤버만 조회 가능)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("boardId");
    if (!boardId) {
      return NextResponse.json({ error: "boardId가 필요합니다." }, { status: 400 });
    }

    await dbConnect();
    const access = await verifyRoomAccess(boardId, userEmail);
    if (!access.room || !access.canRead) {
      return NextResponse.json(
        { error: "해당 캔버스 회의실에 접근할 권한이 없습니다." },
        { status: 403 }
      );
    }

    const items = await CanvasItem.find({ boardId }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({
      success: true,
      items,
      myRole: access.role,
      canEdit: access.canEdit,
    });
  } catch (error) {
    console.error("GET /api/canvas error:", error);
    return NextResponse.json(
      { error: "캔버스 아이템을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 2. 신규 캔버스 아이템 생성 (소유자 또는 editor 권한 멤버만 허용)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const authorName =
      session.user?.name || userEmail.split("@")[0] || "학습자";

    const body = await req.json();
    const {
      boardId,
      type = "sticky",
      x = 100,
      y = 100,
      width = 220,
      height = 180,
      color = "yellow",
      content = "",
      stickers = [],
      votes = 0,
      meetingStatus = "todo",
    } = body;

    if (!boardId) {
      return NextResponse.json({ error: "boardId가 필요합니다." }, { status: 400 });
    }

    await dbConnect();
    const access = await verifyRoomAccess(boardId, userEmail);
    if (!access.room || !access.canEdit) {
      return NextResponse.json(
        { error: "편집 권한이 없습니다. (읽기 전용 또는 미인가)" },
        { status: 403 }
      );
    }

    const newItem = await CanvasItem.create({
      userEmail,
      boardId,
      type,
      x: Number(x),
      y: Number(y),
      width: Number(width),
      height: Number(height),
      color,
      content,
      authorName,
      stickers,
      votes,
      meetingStatus,
    });

    return NextResponse.json({ success: true, item: newItem }, { status: 201 });
  } catch (error) {
    console.error("POST /api/canvas error:", error);
    return NextResponse.json(
      { error: "캔버스 아이템 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 3. 캔버스 아이템 업데이트 (위치 드래그, 내용 수정, 스티커/투표 등)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "아이템 ID가 필요합니다." }, { status: 400 });
    }

    await dbConnect();

    const existing = await CanvasItem.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: "아이템을 찾을 수 없습니다." }, { status: 404 });
    }

    const access = await verifyRoomAccess(existing.boardId, userEmail);
    if (!access.canEdit) {
      return NextResponse.json(
        { error: "편집 권한이 없습니다." },
        { status: 403 }
      );
    }

    const updated = await CanvasItem.findByIdAndUpdate(id, updateData, {
      new: true,
      returnDocument: "after",
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error("PUT /api/canvas error:", error);
    return NextResponse.json(
      { error: "캔버스 아이템 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 4. 캔버스 아이템 삭제
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const boardId = searchParams.get("boardId");
    const clearAll = searchParams.get("clearAll") === "true";

    await dbConnect();

    if (clearAll && boardId) {
      const access = await verifyRoomAccess(boardId, userEmail);
      if (!access.canEdit) {
        return NextResponse.json(
          { error: "초기화 권한이 없습니다." },
          { status: 403 }
        );
      }
      await CanvasItem.deleteMany({ boardId });
      return NextResponse.json({ success: true, message: "캔버스가 초기화되었습니다." });
    }

    if (!id) {
      return NextResponse.json({ error: "삭제할 아이템 ID가 필요합니다." }, { status: 400 });
    }

    const existing = await CanvasItem.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: "아이템을 찾을 수 없습니다." }, { status: 404 });
    }

    const access = await verifyRoomAccess(existing.boardId, userEmail);
    if (!access.canEdit) {
      return NextResponse.json(
        { error: "삭제 권한이 없습니다." },
        { status: 403 }
      );
    }

    await CanvasItem.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "아이템이 삭제되었습니다." });
  } catch (error) {
    console.error("DELETE /api/canvas error:", error);
    return NextResponse.json(
      { error: "아이템 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
