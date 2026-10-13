import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import CalendarEvent from "@/models/CalendarEvent";
import { withAudit } from "@/lib/withAudit";

// 1. 일정 조회 (본인 일정 + 추후 그룹 일정까지 확장 가능)
async function handleGet(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 },
    );
  }

  await dbConnect();
  const events = await CalendarEvent.find({ authorEmail: session.user.email }).sort({
    startDate: 1,
  });
  return NextResponse.json(events, { status: 200 });
}

// 2. 일정 생성
async function handlePost(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 },
    );
  }

  await dbConnect();
  const body = await req.json();

  const newEvent = await CalendarEvent.create({
    ...body,
    authorEmail: session.user.email,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return NextResponse.json({ success: true, data: newEvent }, { status: 201 });
}

// 3. 일정 수정
async function handlePut(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 },
    );
  }

  await dbConnect();
  const body = await req.json();
  const { _id, ...updateData } = body;

  if (!_id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

  const existing = await CalendarEvent.findById(_id);
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  // 작성자 본인 혹은 관리자만 수정 가능
  const isAdmin = session.user.role === "admin";
  const isAuthor = existing.authorEmail === session.user.email;
  if (!isAdmin && !isAuthor) {
    return NextResponse.json({ success: false, error: "권한이 없습니다." }, { status: 403 });
  }

  const updated = await CalendarEvent.findByIdAndUpdate(
    _id,
    { ...updateData, updatedAt: new Date() },
    { returnDocument: "after" },
  );

  return NextResponse.json({ success: true, data: updated }, { status: 200 });
}

// 4. 일정 삭제
async function handleDelete(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 },
    );
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

  const existing = await CalendarEvent.findById(id);
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "admin";
  const isAuthor = existing.authorEmail === session.user.email;
  if (!isAdmin && !isAuthor) {
    return NextResponse.json({ success: false, error: "삭제 권한이 없습니다." }, { status: 403 });
  }

  await CalendarEvent.findByIdAndDelete(id);
  return NextResponse.json({ success: true }, { status: 200 });
}

export const GET = withAudit(handleGet, "캘린더 일정 조회");
export const POST = withAudit(handlePost, "캘린더 일정 생성");
export const PUT = withAudit(handlePut, "캘린더 일정 수정");
export const DELETE = withAudit(handleDelete, "캘린더 일정 삭제");
