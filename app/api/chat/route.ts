import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";
import { chatEmitter } from "@/lib/chatEmitter";

// 1. 채팅 메시지 조회 (특정 그룹 + 채널)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId") || "global";
    const channelName = searchParams.get("channel") || "일반";
    const limit = Number(searchParams.get("limit")) || 50;

    await dbConnect();

    const messages = await ChatMessage.find({ groupId, channelName })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("GET /api/chat error:", error);
    return NextResponse.json(
      { error: "채팅 메시지를 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

// 2. 새 메시지 전송
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { groupId = "global", content } = body;
    const channelName = body.channelName || body.channel || "일반";

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "메시지 내용을 입력해주세요." }, { status: 400 });
    }

    const senderEmail = session?.user?.email || "anonymous@one-quiz.com";
    const senderName =
      session?.user?.name || (session?.user?.email ? session.user.email.split("@")[0] : "학습자");

    await dbConnect();

    const newMsg = await ChatMessage.create({
      groupId,
      channelName,
      senderEmail,
      senderName,
      content: content.trim(),
    });

    const msgObj = typeof newMsg.toObject === "function" ? newMsg.toObject() : newMsg;
    const sanitizedMsg = {
      ...msgObj,
      _id: String(newMsg._id),
    };

    // 🌟 실시간 SSE 이벤트 브로드캐스트 (A PC -> B PC 즉시 동기화)
    try {
      chatEmitter.emit("new_message", sanitizedMsg);
    } catch (emitterErr) {
      console.error("ChatEmitter broadcast error:", emitterErr);
    }

    return NextResponse.json({ success: true, message: sanitizedMsg }, { status: 201 });
  } catch (error) {
    console.error("POST /api/chat error:", error);
    return NextResponse.json(
      { error: "메시지 전송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
