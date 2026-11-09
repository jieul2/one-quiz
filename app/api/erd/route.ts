import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ProjectSpec from "@/models/ProjectSpec";
import { withAudit } from "@/lib/withAudit";

// GET: 프로젝트 명세서 목록 또는 특정 명세서 단건 조회
async function handleGet(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const spec = await ProjectSpec.findOne({ _id: id, userEmail });
      if (!spec) {
        return NextResponse.json({ error: "해당 프로젝트 명세서를 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json(spec, { status: 200 });
    }

    // 프로젝트 목록 요약 조회
    const specs = await ProjectSpec.find({ userEmail })
      .select("_id title description version status updatedAt createdAt tables revisions")
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = specs.map((s) => ({
      _id: s._id,
      title: s.title,
      description: s.description,
      version: s.version,
      status: s.status,
      tableCount: Array.isArray(s.tables) ? s.tables.length : 0,
      revisionCount: Array.isArray(s.revisions) ? s.revisions.length : 0,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("GET /api/erd error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "명세서 조회 실패" },
      { status: 500 }
    );
  }
}

// POST: 신규 생성, 업데이트, 형상관리 커밋(버전 스냅샷), 롤백(되돌리기)
async function handlePost(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { action, id } = body;

    // 1. 형상관리 버전 커밋 (Revision Snapshot 생성)
    if (action === "commit" && id) {
      const { version, message, snapshot } = body;
      if (!version || !message) {
        return NextResponse.json(
          { error: "버전 번호와 커밋 메시지를 입력해주세요." },
          { status: 400 }
        );
      }

      const newRevision = {
        version,
        message,
        authorEmail: userEmail,
        createdAt: new Date(),
        snapshot: snapshot || {},
      };

      const updated = await ProjectSpec.findOneAndUpdate(
        { _id: id, userEmail },
        {
          $set: {
            version,
            ...(snapshot?.tables ? { tables: snapshot.tables } : {}),
            ...(snapshot?.relations ? { relations: snapshot.relations } : {}),
            ...(snapshot?.architectureMd !== undefined ? { architectureMd: snapshot.architectureMd } : {}),
            ...(snapshot?.functionalSpecs ? { functionalSpecs: snapshot.functionalSpecs } : {}),
            ...(snapshot?.apiSpecs ? { apiSpecs: snapshot.apiSpecs } : {}),
          },
          $push: { revisions: newRevision },
        },
        { returnDocument: "after" }
      );

      if (!updated) {
        return NextResponse.json({ error: "명세서를 찾을 수 없습니다." }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `버전 ${version} 커밋이 성공적으로 기록되었습니다.`,
        spec: updated,
      });
    }

    // 2. 형상관리 롤백 (특정 버전 스냅샷으로 복원)
    if (action === "rollback" && id) {
      const { targetVersion } = body;
      const targetDoc = await ProjectSpec.findOne({ _id: id, userEmail });
      if (!targetDoc) {
        return NextResponse.json({ error: "명세서를 찾을 수 없습니다." }, { status: 404 });
      }

      const revision = targetDoc.revisions.find((r) => r.version === targetVersion);
      if (!revision || !revision.snapshot) {
        return NextResponse.json(
          { error: `버전 ${targetVersion} 스냅샷을 찾을 수 없습니다.` },
          { status: 404 }
        );
      }

      targetDoc.tables = revision.snapshot.tables || [];
      targetDoc.relations = revision.snapshot.relations || [];
      targetDoc.architectureMd = revision.snapshot.architectureMd || "";
      targetDoc.functionalSpecs = revision.snapshot.functionalSpecs || [];
      targetDoc.apiSpecs = revision.snapshot.apiSpecs || [];
      targetDoc.version = revision.version;

      // 롤백 이력도 새 리비전으로 자동 기록
      targetDoc.revisions.push({
        version: `${revision.version}-restored`,
        message: `버전 ${revision.version} 스냅샷으로 복원됨`,
        authorEmail: userEmail,
        createdAt: new Date(),
        snapshot: revision.snapshot,
      });

      await targetDoc.save();

      return NextResponse.json({
        success: true,
        message: `버전 ${targetVersion}으로 성공적으로 복원되었습니다.`,
        spec: targetDoc,
      });
    }

    // 3. 일반 저장 및 자동 저장 (Upsert or Update)
    const {
      title,
      description,
      version = "1.0.0",
      status = "in_progress",
      tables = [],
      relations = [],
      architectureMd = "",
      functionalSpecs = [],
      apiSpecs = [],
    } = body;

    let saved;
    if (id) {
      saved = await ProjectSpec.findOneAndUpdate(
        { _id: id, userEmail },
        {
          $set: {
            title: title || "시스템 아키텍처 및 ERD 명세서",
            description,
            version,
            status,
            tables,
            relations,
            architectureMd,
            functionalSpecs,
            apiSpecs,
          },
        },
        { returnDocument: "after", upsert: true }
      );
    } else {
      // 신규 명세서 생성
      saved = await ProjectSpec.create({
        userEmail,
        title: title || "시스템 아키텍처 및 ERD 명세서",
        description,
        version,
        status,
        tables,
        relations,
        architectureMd,
        functionalSpecs,
        apiSpecs,
        revisions: [
          {
            version: "1.0.0",
            message: "초기 프로젝트 아키텍처 및 ERD 스냅샷 생성",
            authorEmail: userEmail,
            createdAt: new Date(),
            snapshot: {
              tables,
              relations,
              architectureMd,
              functionalSpecs,
              apiSpecs,
            },
          },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      message: "프로젝트 명세서가 저장되었습니다.",
      spec: saved,
    });
  } catch (error) {
    console.error("POST /api/erd error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "명세서 저장 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 프로젝트 명세서 삭제
async function handleDelete(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 명세서 ID가 필요합니다." }, { status: 400 });
    }

    const deleted = await ProjectSpec.findOneAndDelete({ _id: id, userEmail });
    if (!deleted) {
      return NextResponse.json({ error: "삭제할 명세서를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "명세서가 삭제되었습니다." }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/erd error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "명세서 삭제 실패" },
      { status: 500 }
    );
  }
}

export const GET = withAudit(handleGet, "ERD 및 프로젝트 명세서 조회");
export const POST = withAudit(handlePost, "ERD 및 프로젝트 명세서 생성/업데이트/형상관리");
export const DELETE = withAudit(handleDelete, "ERD 및 프로젝트 명세서 삭제");
