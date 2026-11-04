import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Idea, { IHistoryChange } from "@/models/Idea";
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
  completedAt?: string | Date;
}

// 1. 조회 (사용자의 실제 DB 데이터 로드)
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
    completedAt: doc.completedAt ? new Date(doc.completedAt).toISOString().slice(0, 10) : undefined,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  }));
  return NextResponse.json(mapped, { status: 200 });
}

// 2. 생성 (단일 생성 또는 배열 일괄 동기화)
async function handlePost(req: Request) {
  const session = await getServerSession(authOptions);
  await dbConnect();
  const body = await req.json();

  // 배열인 경우 (일괄 동기화)
  if (Array.isArray(body)) {
    const results = [];
    for (const item of body) {
      const docData = {
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
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
        authorEmail: item.authorEmail || session?.user?.email || "guest@onequiz.com",
        updatedAt: new Date(),
      };

      if (item._id && String(item._id).length === 24) {
        const updated = await Idea.findByIdAndUpdate(item._id, docData, { new: true, upsert: true });
        results.push(updated);
      } else {
        const created = await Idea.create({
          ...docData,
          createdAt: new Date(),
          historyLogs: [{ message: "✨ 최초 아이디어 생성", changes: [], updatedAt: new Date() }],
        });
        results.push(created);
      }
    }
    return NextResponse.json({ success: true, data: results }, { status: 201 });
  }

  // 단일 아이템 생성
  const newDocData = {
    ...body,
    authorEmail: body.authorEmail || session?.user?.email || "guest@onequiz.com",
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
  await dbConnect();
  const body = await req.json();
  const targetId = body._id || body.id;

  if (!targetId) {
    return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
  }

  let existing = null;
  if (String(targetId).length === 24) {
    existing = await Idea.findById(targetId);
  }

  const { status, priority, title, description, commitMessage, tags, isPublic, assignee, promotedToProjectId, startDate, endDate, color } = body;

  const changes: IHistoryChange[] = [];
  if (existing) {
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
    if (existing.status !== status) {
      changes.push({ field: "상태 (Status)", oldValue: existing.status, newValue: status });
    }
    if (existing.priority !== priority) {
      changes.push({ field: "우선순위 (Priority)", oldValue: existing.priority, newValue: priority });
    }
  }

  const updateData: Record<string, unknown> = {
    title,
    description,
    status: status || existing?.status || "idea",
    priority: priority || existing?.priority || "medium",
    tags: Array.isArray(tags) ? tags : existing?.tags || [],
    isPublic: isPublic !== undefined ? isPublic : existing?.isPublic ?? true,
    assignee: assignee !== undefined ? assignee : existing?.assignee,
    promotedToProjectId: promotedToProjectId !== undefined ? promotedToProjectId : existing?.promotedToProjectId,
    startDate: startDate !== undefined ? startDate : existing?.startDate,
    endDate: endDate !== undefined ? endDate : existing?.endDate,
    color: color !== undefined ? color : existing?.color,
    updatedAt: new Date(),
  };

  if (status === "completed" && existing?.status !== "completed") {
    updateData.completedAt = new Date();
  } else if (status && status !== "completed") {
    updateData.completedAt = null;
  }

  const logMsg =
    commitMessage && commitMessage.trim() !== ""
      ? commitMessage
      : changes.length > 0
        ? changes.map((c) => c.field).join(", ") + " 수정"
        : "📝 문서 업데이트";

  let updated = null;
  if (existing) {
    updated = await Idea.findByIdAndUpdate(
      targetId,
      {
        ...updateData,
        $push: { historyLogs: { message: logMsg, changes, updatedAt: new Date() } },
      },
      { returnDocument: "after" },
    );
  } else {
    updated = await Idea.create({
      ...updateData,
      createdAt: new Date(),
      historyLogs: [{ message: "✨ 최초 생성", changes: [], updatedAt: new Date() }],
    });
  }

  return NextResponse.json({ success: true, data: updated }, { status: 200 });
}

// 4. 삭제
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

export const GET = withAudit(handleGet, "프로젝트 로드맵 아이디어 조회");
export const POST = withAudit(handlePost, "새로운 기능 아이디어 등록");
export const PUT = withAudit(handlePut, "기능 아이디어 수정 및 커밋");
export const DELETE = withAudit(handleDelete, "기능 아이디어 삭제");
