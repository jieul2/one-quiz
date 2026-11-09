import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, User } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Feedback from "@/models/Feedback";
import { sendFeedbackNotificationEmail } from "@/lib/email";

// 1. 피드백 등록 (모든 사용자/게스트 가능)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { type, title, content, rating, userEmail, userName } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "제목과 내용을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const email = session?.user?.email || userEmail || "anonymous@one-quiz.com";
    const name = session?.user?.name || userName || "학습자";

    await dbConnect();

    const newFeedback = await Feedback.create({
      userEmail: email,
      userName: name,
      type: type || "feedback",
      title: title.trim(),
      content: content.trim(),
      rating: Number(rating) || 5,
      status: "pending",
    });

    // 비동기 관리자 이메일 발송 (응답 지연 방지)
    sendFeedbackNotificationEmail({
      type: newFeedback.type,
      title: newFeedback.title,
      content: newFeedback.content,
      userEmail: email,
      userName: name,
      rating: newFeedback.rating,
    }).catch((err) => console.error("Email send error:", err));

    return NextResponse.json(
      { success: true, feedback: newFeedback },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json(
      { error: "피드백 접수 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 2. 피드백 목록 조회 (관리자 또는 본인 내역)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    await dbConnect();

    // 관리자 권한 확인 (세션 JWT 또는 DB User role 확인)
    let isAdmin = session.user.role === "admin";
    if (!isAdmin && session.user.email) {
      const dbUser = await User.findOne({ email: session.user.email });
      if (dbUser?.role === "admin") {
        isAdmin = true;
      }
    }

    const { searchParams } = new URL(req.url);
    const tab = searchParams.get("tab") || "active"; // "active" | "completed" | "all"
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const query: Record<string, unknown> = {};

    // 일반 사용자는 본인이 작성한 피드백만 조회 가능
    if (!isAdmin) {
      query.userEmail = session.user.email;
    }

    // 탭별 기본 상태 필터링
    if (tab === "active") {
      query.status = { $in: ["pending", "in_progress"] };
    } else if (tab === "completed") {
      query.status = { $in: ["resolved", "dismissed"] };
    }

    // 세부 상태 필터가 명시된 경우 덮어쓰기
    if (status && status !== "ALL") {
      query.status = status;
    }

    if (type && type !== "ALL") {
      query.type = type;
    }
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { content: { $regex: search.trim(), $options: "i" } },
        { userEmail: { $regex: search.trim(), $options: "i" } },
        { userName: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const baseUserQuery = !isAdmin ? { userEmail: session.user.email } : {};

    const skip = (page - 1) * limit;
    const [
      feedbacks,
      total,
      pendingCount,
      inProgressCount,
      resolvedCount,
      allCount,
    ] = await Promise.all([
      Feedback.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Feedback.countDocuments(query),
      Feedback.countDocuments({ ...baseUserQuery, status: "pending" }),
      Feedback.countDocuments({ ...baseUserQuery, status: "in_progress" }),
      Feedback.countDocuments({ ...baseUserQuery, status: { $in: ["resolved", "dismissed"] } }),
      Feedback.countDocuments(baseUserQuery),
    ]);

    const activeCount = pendingCount + inProgressCount;
    const completedCount = resolvedCount;

    return NextResponse.json({
      feedbacks,
      total,
      activeCount,
      completedCount,
      allCount,
      pendingCount,
      inProgressCount,
      resolvedCount,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json(
      { error: "피드백 목록을 가져오지 못했습니다." },
      { status: 500 }
    );
  }
}

// 3. 관리자 피드백 상태 변경 및 답변 등록
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    await dbConnect();

    // 관리자 권한 확인 (세션 JWT 또는 DB User role 확인)
    let isAdmin = session.user.role === "admin";
    if (!isAdmin && session.user.email) {
      const dbUser = await User.findOne({ email: session.user.email });
      if (dbUser?.role === "admin") {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const body = await req.json();
    const { _id, status, adminReply } = body;

    if (!_id) {
      return NextResponse.json({ error: "피드백 ID가 필요합니다." }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (typeof adminReply === "string") {
      updateData.adminReply = adminReply;
      updateData.repliedAt = new Date();
    }

    const updated = await Feedback.findByIdAndUpdate(_id, updateData, {
      returnDocument: "after",
    });

    if (!updated) {
      return NextResponse.json({ error: "해당 피드백을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, feedback: updated });
  } catch (error) {
    console.error("PUT /api/feedback error:", error);
    return NextResponse.json(
      { error: "피드백 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
