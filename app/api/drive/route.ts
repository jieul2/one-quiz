import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import DriveDoc from "@/models/DriveDoc";
import { withAudit } from "@/lib/withAudit";

// 1. 드라이브 문서 목록 조회
async function handleGet() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const docs = await DriveDoc.find({ authorEmail: session.user.email }).sort({
    updatedAt: -1,
  });

  return NextResponse.json(docs, { status: 200 });
}

// 2. 드라이브 문서 저장 (배치 또는 단일)
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
    await DriveDoc.deleteMany({ authorEmail: session.user.email });
    const docs = body.map((d) => ({
      authorEmail: session.user.email,
      id: d.id || `doc-${Date.now()}-${Math.random()}`,
      name: d.name,
      type: d.type || "text",
      size: d.size || "12 KB",
    }));
    const created = await DriveDoc.insertMany(docs);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  }

  const created = await DriveDoc.create({
    authorEmail: session.user.email,
    id: body.id || `doc-${Date.now()}`,
    name: body.name,
    type: body.type || "text",
    size: body.size || "12 KB",
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

// 3. 드라이브 문서 삭제
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

  await DriveDoc.deleteOne({ authorEmail: session.user.email, id });
  return NextResponse.json({ success: true }, { status: 200 });
}

export const GET = withAudit(handleGet, "드라이브 파일 목록 조회");
export const POST = withAudit(handlePost, "드라이브 파일 저장/동기화");
export const DELETE = withAudit(handleDelete, "드라이브 파일 삭제");
