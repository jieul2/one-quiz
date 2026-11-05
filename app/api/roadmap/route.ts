import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ProjectRoadmap from "@/models/ProjectRoadmap";
import { withAudit } from "@/lib/withAudit";

// 1. 로드맵 조회
async function handleGet(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");

  const query: Record<string, unknown> = { authorEmail: session.user.email };
  if (projectId) {
    query.projectId = projectId;
  }

  const roadmap = await ProjectRoadmap.findOne(query);
  return NextResponse.json(roadmap || null, { status: 200 });
}

// 2. 로드맵 생성/동기화 (Upsert)
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
  const projectId = body.projectId || body.id || "proj-1";

  const roadmapData = {
    authorEmail: session.user.email,
    projectId,
    name: body.name || "프로젝트 로드맵",
    description: body.description || "",
    startDate: body.startDate || "2026-10-15",
    endDate: body.endDate || "2026-11-04",
    isPublic: body.isPublic !== undefined ? body.isPublic : true,
    members: body.members || [],
    items: body.items || [],
  };

  const updated = await ProjectRoadmap.findOneAndUpdate(
    { authorEmail: session.user.email, projectId },
    roadmapData,
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  return NextResponse.json({ success: true, data: updated }, { status: 200 });
}

export const GET = withAudit(handleGet, "로드맵 데이터 조회");
export const POST = withAudit(handlePost, "로드맵 데이터 동기화 및 저장");
