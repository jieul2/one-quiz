import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Mindmap from "@/models/Mindmap";
import { withAudit } from "@/lib/withAudit";

// 1. 마인드맵 목록 조회
async function handleGet() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 },
    );
  }

  await dbConnect();
  const maps = await Mindmap.find({ authorEmail: session.user.email }).sort({
    createdAt: -1,
  });

  return NextResponse.json(maps, { status: 200 });
}

// 2. 마인드맵 생성
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

  if (Array.isArray(body)) {
    await Mindmap.deleteMany({ authorEmail: session.user.email });
    const items = body.map((m) => ({
      authorEmail: session.user.email,
      title: m.title,
      nodeCount: m.nodeCount || 5,
      lastEdited: m.lastEdited || "2026-11-04",
      rootNode: m.rootNode || m.title,
      branches: m.branches || [],
    }));
    const created = await Mindmap.insertMany(items);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  }

  const newMap = await Mindmap.create({
    authorEmail: session.user.email,
    title: body.title,
    nodeCount: body.nodeCount || 5,
    lastEdited: body.lastEdited || new Date().toISOString().slice(0, 10),
    rootNode: body.rootNode || body.title,
    branches: body.branches || [],
  });

  return NextResponse.json({ success: true, data: newMap }, { status: 201 });
}

// 3. 마인드맵 수정
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
  const mapId = _id || id;

  const updated = await Mindmap.findOneAndUpdate(
    { _id: mapId, authorEmail: session.user.email },
    { ...updateFields, lastEdited: new Date().toISOString().slice(0, 10) },
    { new: true },
  );

  if (!updated) {
    return NextResponse.json(
      { success: false, error: "마인드맵을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: updated }, { status: 200 });
}

// 4. 마인드맵 삭제
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
    return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
  }

  const deleted = await Mindmap.findOneAndDelete({ _id: id, authorEmail: session.user.email });
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: "마인드맵을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export const GET = withAudit(handleGet, "마인드맵 목록 조회");
export const POST = withAudit(handlePost, "마인드맵 등록");
export const PUT = withAudit(handlePut, "마인드맵 수정");
export const DELETE = withAudit(handleDelete, "마인드맵 삭제");
