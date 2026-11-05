import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Idea from "@/models/Idea";
import { withAudit } from "@/lib/withAudit";

interface DocShape {
  id?: string;
  _id?: { toString(): string } | string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  isPublic?: boolean;
  assignee?: string;
  promotedToProjectId?: string;
  startDate?: string;
  endDate?: string;
  color?: string;
  createdAt?: string | Date;
}

// 1. 백로그(아이디어) 목록 조회
async function handleGet() {
  await dbConnect();
  const ideas = await Idea.find({}).sort({ createdAt: -1 }).lean();
  const mapped = ideas.map((doc: DocShape) => ({
    ...doc,
    id: doc.id || doc._id?.toString() || `idea-${Date.now()}`,
    _id: doc._id?.toString(),
    title: doc.title,
    description: doc.description || "",
    status: doc.status || "idea",
    priority: doc.priority || "medium",
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    isPublic: doc.isPublic !== undefined ? doc.isPublic : true,
    assignee: doc.assignee || "",
    promotedToProjectId: doc.promotedToProjectId || "",
    startDate: doc.startDate || "",
    endDate: doc.endDate || "",
    color: doc.color || "#0284c7",
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  }));
  return NextResponse.json(mapped, { status: 200 });
}

// 2. 백로그 저장 (단일 또는 전체 배치 동기화)
async function handlePost(req: Request) {
  const session = await getServerSession(authOptions);
  await dbConnect();
  const body = await req.json();

  if (Array.isArray(body)) {
    if (body.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 200 });
    }

    const defaultAuthor = session?.user?.email || "guest@onequiz.com";
    const now = new Date();

    const operations = body.map((item) => {
      const isObjectId = item._id && String(item._id).length === 24;
      const itemId = item.id || (item._id ? String(item._id) : `idea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      const filter = isObjectId ? { _id: item._id } : { id: itemId };

      const docData: Record<string, unknown> = {
        id: itemId,
        title: item.title,
        description: item.description || "",
        status: item.status || "idea",
        priority: item.priority || "medium",
        tags: Array.isArray(item.tags) ? item.tags : [],
        isPublic: item.isPublic !== undefined ? item.isPublic : true,
        assignee: item.assignee,
        promotedToProjectId: item.promotedToProjectId,
        startDate: item.startDate,
        endDate: item.endDate,
        color: item.color || "#0284c7",
        updatedAt: now,
      };

      return {
        updateOne: {
          filter,
          update: {
            $set: docData,
            $setOnInsert: {
              authorEmail: item.authorEmail || defaultAuthor,
              createdAt: now,
              historyLogs: [{ message: "✨ 최초 백로그 생성", changes: [], updatedAt: now }],
            },
          },
          upsert: true,
        },
      };
    });

    await Idea.bulkWrite(operations);
    return NextResponse.json({ success: true, count: operations.length }, { status: 201 });
  }

  // 단일 아이템
  const targetId = body._id || body.id;
  if (targetId && String(targetId).length === 24) {
    const updated = await Idea.findByIdAndUpdate(
      targetId,
      {
        ...body,
        updatedAt: new Date(),
      },
      { returnDocument: "after", upsert: true }
    );
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  }

  const created = await Idea.create({
    ...body,
    authorEmail: body.authorEmail || session?.user?.email || "guest@onequiz.com",
    createdAt: new Date(),
    updatedAt: new Date(),
    historyLogs: [{ message: "✨ 최초 백로그 생성", changes: [], updatedAt: new Date() }],
  });
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

// 3. 삭제
async function handleDelete(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });

  if (id.length === 24) {
    await Idea.findByIdAndDelete(id);
  } else {
    await Idea.deleteOne({ id });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

export const GET = withAudit(handleGet, "백로그 아이디어 목록 조회");
export const POST = withAudit(handlePost, "백로그 아이디어 동기화 및 저장");
export const DELETE = withAudit(handleDelete, "백로그 아이디어 삭제");
