import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import Note from "@/models/Note";
import { withAudit } from "@/lib/withAudit";

// GET: 지식노트 목록 조회
async function handleGet(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const folder = searchParams.get("folder");
  const search = searchParams.get("search");

  const query: Record<string, unknown> = { userEmail: session.user.email };
  if (folder && folder !== "전체") {
    query.folder = folder;
  }
  if (search && search.trim()) {
    const q = search.trim();
    query.$or = [
      { title: { $regex: q, $options: "i" } },
      { content: { $regex: q, $options: "i" } },
      { tags: { $in: [new RegExp(q, "i")] } },
    ];
  }

  const notes = await Note.find(query).sort({ updatedAt: -1 });
  return NextResponse.json(notes, { status: 200 });
}

// POST: 신규 지식노트 생성 (일기에서 변환 포함)
async function handlePost(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
  }

  await dbConnect();
  const body = await req.json();
  const { title, content, folder, tags, sourceDiaryId } = body;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "노트 제목은 필수입니다." }, { status: 400 });
  }

  const newNote = await Note.create({
    userEmail: session.user.email,
    title: title.trim(),
    content: content || "",
    folder: folder && folder.trim() ? folder.trim() : "일반",
    tags: Array.isArray(tags) ? tags : [],
    sourceDiaryId: sourceDiaryId || null,
  });

  return NextResponse.json({ success: true, note: newNote }, { status: 201 });
}

// PUT: 지식노트 내용 수정
async function handlePut(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
  }

  await dbConnect();
  const body = await req.json();
  const { id, title, content, folder, tags } = body;

  if (!id) {
    return NextResponse.json({ error: "노트 ID가 필요합니다." }, { status: 400 });
  }

  const note = await Note.findOne({ _id: id, userEmail: session.user.email });
  if (!note) {
    return NextResponse.json({ error: "노트를 찾을 수 없거나 권한이 없습니다." }, { status: 404 });
  }

  if (title !== undefined) note.title = title.trim();
  if (content !== undefined) note.content = content;
  if (folder !== undefined) note.folder = folder.trim() || "일반";
  if (tags !== undefined && Array.isArray(tags)) note.tags = tags;
  note.updatedAt = new Date();

  await note.save();

  return NextResponse.json({ success: true, note }, { status: 200 });
}

// DELETE: 지식노트 삭제
async function handleDelete(req: Request) {
  const session = await getServerSession();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "삭제할 노트 ID가 필요합니다." }, { status: 400 });
  }

  const deleted = await Note.findOneAndDelete({ _id: id, userEmail: session.user.email });
  if (!deleted) {
    return NextResponse.json({ error: "노트를 찾을 수 없거나 권한이 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "노트가 삭제되었습니다." }, { status: 200 });
}

export const GET = withAudit(handleGet, "지식노트 목록 조회");
export const POST = withAudit(handlePost, "지식노트 생성");
export const PUT = withAudit(handlePut, "지식노트 수정");
export const DELETE = withAudit(handleDelete, "지식노트 삭제");
