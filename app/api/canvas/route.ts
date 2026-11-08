import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CanvasItem from "@/models/CanvasItem";

// 1. 캔버스 아이템 목록 조회
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("boardId") || "default-room";

    await dbConnect();
    const items = await CanvasItem.find({ boardId }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("GET /api/canvas error:", error);
    return NextResponse.json(
      { error: "캔버스 아이템을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 2. 신규 캔버스 아이템 생성
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || "anonymous@one-quiz.com";
    const authorName = session?.user?.name || (session?.user?.email ? session.user.email.split("@")[0] : "학습자");

    const body = await req.json();
    const {
      boardId = "default-room",
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

    await dbConnect();

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
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "아이템 ID가 필요합니다." }, { status: 400 });
    }

    await dbConnect();

    const updated = await CanvasItem.findByIdAndUpdate(id, updateData, {
      new: true,
      returnDocument: "after",
    });

    if (!updated) {
      return NextResponse.json({ error: "아이템을 찾을 수 없습니다." }, { status: 404 });
    }

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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const boardId = searchParams.get("boardId");
    const clearAll = searchParams.get("clearAll") === "true";

    await dbConnect();

    if (clearAll && boardId) {
      await CanvasItem.deleteMany({ boardId });
      return NextResponse.json({ success: true, message: "캔버스가 초기화되었습니다." });
    }

    if (!id) {
      return NextResponse.json({ error: "삭제할 아이템 ID가 필요합니다." }, { status: 400 });
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
