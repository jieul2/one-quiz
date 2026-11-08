import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CanvasRoom from "@/models/CanvasRoom";
import CanvasItem from "@/models/CanvasItem";

const DEFAULT_ROOMS = [
  {
    roomId: "default-room",
    title: "메인 브레인스토밍 룸",
    description: "원퀴즈 기본 아이디어 회의실입니다.",
    category: "브레인스토밍",
    creatorEmail: "system@one-quiz.com",
    creatorName: "원퀴즈 시스템",
  },
  {
    roomId: "exam-strategy-room",
    title: "2026 합격 전략 기획실",
    description: "기출문제 공략 및 학습 일정 조율을 위한 회의 공간",
    category: "시험대비",
    creatorEmail: "system@one-quiz.com",
    creatorName: "원퀴즈 시스템",
  },
];

// 1. 회의실 목록 조회
export async function GET() {
  try {
    await dbConnect();
    const customRooms = await CanvasRoom.find({}).sort({ createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      rooms: [...DEFAULT_ROOMS, ...customRooms],
    });
  } catch (error) {
    console.error("GET /api/canvas/rooms error:", error);
    return NextResponse.json(
      { error: "회의실 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 2. 새 회의실 생성
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const creatorEmail = session?.user?.email || "anonymous@one-quiz.com";
    const creatorName =
      session?.user?.name || (session?.user?.email ? session.user.email.split("@")[0] : "학습자");

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

    return NextResponse.json({ success: true, room: newRoom }, { status: 201 });
  } catch (error) {
    console.error("POST /api/canvas/rooms error:", error);
    return NextResponse.json(
      { error: "회의실 개설 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 3. 회의실 삭제
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get("roomId");

    if (!roomId || roomId === "default-room" || roomId === "exam-strategy-room") {
      return NextResponse.json({ error: "기본 회의실은 삭제할 수 없습니다." }, { status: 400 });
    }

    await dbConnect();

    // 해당 방의 아이템 및 방 삭제
    await CanvasItem.deleteMany({ boardId: roomId });
    await CanvasRoom.findOneAndDelete({ roomId });

    return NextResponse.json({ success: true, message: "회의실이 삭제되었습니다." });
  } catch (error) {
    console.error("DELETE /api/canvas/rooms error:", error);
    return NextResponse.json(
      { error: "회의실 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
