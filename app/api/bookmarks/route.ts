import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import { withAudit } from "@/lib/withAudit";

// 1. 북마크 목록 조회
async function handleGet() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const items = await Bookmark.find({ authorEmail: session.user.email }).sort({
    createdAt: -1,
  });

  return NextResponse.json(items, { status: 200 });
}

// 2. 북마크 저장 (배치 또는 단일 생성)
async function handlePost(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const body = await req.json();

  if (Array.isArray(body)) {
    await Bookmark.deleteMany({ authorEmail: session.user.email });
    const docs = body.map((b) => ({
      authorEmail: session.user.email,
      id: b.id || `bm-${Date.now()}-${Math.random()}`,
      title: b.title,
      url: b.url,
      category: b.category || "자격시험",
      starred: Boolean(b.starred),
    }));
    const created = await Bookmark.insertMany(docs);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  }

  const created = await Bookmark.create({
    authorEmail: session.user.email,
    id: body.id || `bm-${Date.now()}`,
    title: body.title,
    url: body.url,
    category: body.category || "자격시험",
    starred: Boolean(body.starred),
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

// 3. 북마크 삭제
async function handleDelete(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "삭제할 id가 필요합니다." },
      { status: 400 }
    );
  }

  await Bookmark.deleteOne({ authorEmail: session.user.email, id });
  return NextResponse.json({ success: true }, { status: 200 });
}

export const GET = withAudit(handleGet, "북마크 목록 조회");
export const POST = withAudit(handlePost, "북마크 저장/동기화");
export const DELETE = withAudit(handleDelete, "북마크 항목 삭제");
