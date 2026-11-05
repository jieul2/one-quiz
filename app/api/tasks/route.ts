import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Task from "@/models/Task";
import { withAudit } from "@/lib/withAudit";

// 1. 할일 목록 조회
async function handleGet() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 },
    );
  }

  await dbConnect();
  const tasks = await Task.find({ authorEmail: session.user.email }).sort({
    order: 1,
    createdAt: 1,
  });

  return NextResponse.json(tasks, { status: 200 });
}

// 2. 할일 등록 또는 일괄 동기화
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

  // 일괄 저장 (Batch sync/reorder)
  if (Array.isArray(body)) {
    // 기존 유저의 할일 삭제 후 새로 삽입
    await Task.deleteMany({ authorEmail: session.user.email });
    const tasksToInsert = body.map((item, idx) => ({
      authorEmail: session.user.email,
      categoryId: item.categoryId || "cat-today",
      title: item.title,
      memo: item.memo || "",
      dueDate: item.dueDate || null,
      completed: !!item.completed,
      order: typeof item.order === "number" ? item.order : idx,
    }));
    const created = await Task.insertMany(tasksToInsert);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  }

  // 단일 등록
  const newTask = await Task.create({
    authorEmail: session.user.email,
    categoryId: body.categoryId || "cat-today",
    title: body.title,
    memo: body.memo || "",
    dueDate: body.dueDate || null,
    completed: !!body.completed,
    order: typeof body.order === "number" ? body.order : 0,
  });

  return NextResponse.json({ success: true, data: newTask }, { status: 201 });
}

// 3. 할일 수정
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
  const { id, _id, ...updateFields } = body;
  const taskId = _id || id;

  if (!taskId) {
    return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
  }

  const updated = await Task.findOneAndUpdate(
    { _id: taskId, authorEmail: session.user.email },
    { ...updateFields },
    { returnDocument: "after" },
  );

  if (!updated) {
    return NextResponse.json(
      { success: false, error: "할일을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: updated }, { status: 200 });
}

// 4. 할일 삭제
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

  if (!id) {
    return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 });
  }

  const deleted = await Task.findOneAndDelete({ _id: id, authorEmail: session.user.email });
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "삭제할 할일을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export const GET = withAudit(handleGet, "할일 목록 조회");
export const POST = withAudit(handlePost, "할일 등록");
export const PUT = withAudit(handlePut, "할일 수정");
export const DELETE = withAudit(handleDelete, "할일 삭제");
