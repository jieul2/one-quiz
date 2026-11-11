import { NextRequest } from "next/server";
import { chatEmitter } from "@/lib/chatEmitter";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId") || "global";
  const channel = searchParams.get("channel") || "";

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  let isClosed = false;

  const safeWrite = async (text: string) => {
    if (isClosed) return;
    try {
      await writer.write(encoder.encode(text));
    } catch {
      isClosed = true;
      cleanup();
    }
  };

  // 1. 초기 연결 수립 핑
  safeWrite(": connected\n\n");

  // 2. 실시간 새 메시지 이벤트 리스너
  const onNewMessage = (msg: { groupId?: string; channelName?: string; [key: string]: unknown }) => {
    if (isClosed) return;
    // 채널이 지정되어 있으면 해당 채널만, 없으면 해당 그룹 전체 메시지 전달
    if (msg.groupId === groupId && (!channel || msg.channelName === channel)) {
      safeWrite(`data: ${JSON.stringify(msg)}\n\n`);
    }
  };

  chatEmitter.on("new_message", onNewMessage);

  // 3. 15초 주기 하트비트 (Keep-alive 프록시 타임아웃 차단)
  const heartbeat = setInterval(() => {
    safeWrite(": ping\n\n");
  }, 15000);

  const cleanup = () => {
    if (isClosed) return;
    isClosed = true;
    clearInterval(heartbeat);
    chatEmitter.off("new_message", onNewMessage);
    try {
      writer.close();
    } catch {}
  };

  req.signal.addEventListener("abort", cleanup);

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
