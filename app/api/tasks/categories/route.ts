import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import TaskCategory from "@/models/TaskCategory";
import { withAudit } from "@/lib/withAudit";

// 1. 카테고리 목록 조회
async function handleGet() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 },
    );
  }

  await dbConnect();
  const categories = await TaskCategory.find({ authorEmail: session.user.email }).sort({
    order: 1,
    createdAt: 1,
  });

  return NextResponse.json(categories, { status: 200 });
}

// 2. 카테고리 동기화 (전체 목록 저장)
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

  if (!Array.isArray(body)) {
    return NextResponse.json(
      { success: false, error: "Array of categories expected" },
      { status: 400 },
    );
  }

  // 기존 유저의 카테고리 삭제 후 재등록
  await TaskCategory.deleteMany({ authorEmail: session.user.email });
  const items = body.map((c, idx) => ({
    authorEmail: session.user.email,
    categoryId: c.id || c.categoryId,
    name: c.name,
    order: idx,
  }));

  const created = await TaskCategory.insertMany(items);
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

export const GET = withAudit(handleGet, "할일 카테고리 목록 조회");
export const POST = withAudit(handlePost, "할일 카테고리 동기화");
