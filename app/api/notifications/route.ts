import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";

/**
 * GET /api/notifications
 * 로그인 사용자의 알림 목록 및 미확인/대기 중인 협업 요청 카운트 조회
 */
export async function GET(req: Request) {
  new URL(req.url);
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json(
        { notifications: [], unreadCount: 0, pendingInviteCount: 0 },
        { status: 401 }
      );
    }

    await dbConnect();

    const [notifications, unreadCount, pendingInviteCount] = await Promise.all([
      Notification.find({ recipientEmail: userEmail })
        .sort({ createdAt: -1 })
        .limit(40)
        .lean(),
      Notification.countDocuments({
        recipientEmail: userEmail,
        isRead: false,
      }),
      Notification.countDocuments({
        recipientEmail: userEmail,
        type: "collab_invite",
        actionStatus: "pending",
      }),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      pendingInviteCount,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "알림 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * 단건 읽음 또는 전체 읽음 처리
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
    const { id, markAllRead } = body as { id?: string; markAllRead?: boolean };

    await dbConnect();

    if (markAllRead) {
      await Notification.updateMany(
        { recipientEmail: userEmail, isRead: false },
        { $set: { isRead: true } }
      );
    } else if (id) {
      await Notification.findOneAndUpdate(
        { _id: id, recipientEmail: userEmail },
        { $set: { isRead: true } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      { error: "알림 상태 업데이트 실패" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * 단건 알림 삭제 또는 처리 완료된 읽은 알림 정리
 */
export async function DELETE(req: Request) {
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
    const id = searchParams.get("id");
    const clearResolved = searchParams.get("clearResolved") === "true";

    await dbConnect();

    if (clearResolved) {
      await Notification.deleteMany({
        recipientEmail: userEmail,
        isRead: true,
        actionStatus: { $ne: "pending" },
      });
    } else if (id) {
      await Notification.findOneAndDelete({
        _id: id,
        recipientEmail: userEmail,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/notifications error:", error);
    return NextResponse.json(
      { error: "알림 삭제 실패" },
      { status: 500 }
    );
  }
}
