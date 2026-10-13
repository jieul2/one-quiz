import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Idea, { IHistoryChange } from "@/models/Idea";
import { withAudit } from "@/lib/withAudit";

// 1. 조회
async function handleGet() {
  await dbConnect();
  const ideas = await Idea.find({}).sort({ createdAt: -1 });
  return NextResponse.json(ideas, { status: 200 });
}

// 2. 생성
async function handlePost(req: Request) {
  const session = await getServerSession(authOptions);
  await dbConnect();
  const body = await req.json();

  const newDocData = {
    ...body,
    authorEmail: body.authorEmail || session?.user?.email || undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: body.status === "completed" ? new Date() : null,
    historyLogs: [{ message: "✨ 최초 아이디어 생성", changes: [], updatedAt: new Date() }],
  };

  const newIdea = await Idea.create(newDocData);
  return NextResponse.json({ success: true, data: newIdea }, { status: 201 });
}

// 3. 수정 및 커밋 히스토리 기록
async function handlePut(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 },
    );
  }

  await dbConnect();
  const body = await req.json();
  const { _id, status, priority, title, description, commitMessage } = body;
  if (!_id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

  const existing = await Idea.findById(_id);
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "admin";
  const isAuthor = existing.authorEmail && existing.authorEmail === session.user.email;

  if (!isAdmin && !isAuthor) {
    return NextResponse.json({ success: false, error: "권한이 없습니다." }, { status: 403 });
  }

  // 변경된 필드 감지 (Diff 비교)
  const changes: IHistoryChange[] = [];
  if (existing.title !== title) {
    changes.push({ field: "제목 (Title)", oldValue: existing.title, newValue: title });
  }
  if (existing.description !== description) {
    changes.push({
      field: "설명 (Description)",
      oldValue: existing.description || "(없음)",
      newValue: description || "(없음)",
    });
  }
  if (isAdmin && existing.status !== status) {
    changes.push({ field: "상태 (Status)", oldValue: existing.status, newValue: status });
  }
  if (isAdmin && existing.priority !== priority) {
    changes.push({ field: "우선순위 (Priority)", oldValue: existing.priority, newValue: priority });
  }

  const finalStatus = isAdmin ? status : existing.status;
  const finalPriority = isAdmin ? priority : existing.priority;

  const updateData: {
    title: string;
    description?: string;
    status: string;
    priority: string;
    updatedAt: Date;
    completedAt?: Date | null;
  } = {
    title,
    description,
    status: finalStatus,
    priority: finalPriority,
    updatedAt: new Date(),
  };

  // 완료일 처리
  if (finalStatus === "completed" && existing.status !== "completed") {
    updateData.completedAt = new Date();
  } else if (finalStatus !== "completed") {
    updateData.completedAt = null;
  } else {
    updateData.completedAt = existing.completedAt || new Date();
  }

  const logMsg =
    commitMessage && commitMessage.trim() !== ""
      ? commitMessage
      : changes.length > 0
        ? changes.map((c) => c.field).join(", ") + " 수정"
        : "📝 문서 업데이트";

  const updated = await Idea.findByIdAndUpdate(
    _id,
    {
      ...updateData,
      $push: { historyLogs: { message: logMsg, changes, updatedAt: new Date() } },
    },
    { returnDocument: "after" },
  );

  return NextResponse.json({ success: true, data: updated }, { status: 200 });
}

// 4. 삭제
async function handleDelete(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 },
    );
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

  const existing = await Idea.findById(id);
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "admin";
  const isAuthor = existing.authorEmail && existing.authorEmail === session.user.email;

  if (!isAdmin && !isAuthor) {
    return NextResponse.json({ success: false, error: "삭제 권한이 없습니다." }, { status: 403 });
  }

  await Idea.findByIdAndDelete(id);
  return NextResponse.json({ success: true }, { status: 200 });
}

// withAudit 래퍼를 적용하여 아이디어 조회, 생성, 수정, 삭제 시 관리자 로그에 자동 수집
export const GET = withAudit(handleGet, "프로젝트 로드맵 아이디어 조회");
export const POST = withAudit(handlePost, "새로운 기능 아이디어 등록");
export const PUT = withAudit(handlePut, "기능 아이디어 수정 및 커밋");
export const DELETE = withAudit(handleDelete, "기능 아이디어 삭제");
