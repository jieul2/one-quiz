import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ProjectSpec from "@/models/ProjectSpec";
import CollaborationGroup from "@/models/CollaborationGroup";
import CollaborationInvite from "@/models/CollaborationInvite";
import { withAudit } from "@/lib/withAudit";
import { getCollabAccess, getUserCollabGroups } from "@/lib/collaborationServer";

// GET: 프로젝트 명세서 목록 또는 특정 명세서 단건 조회 (본인 + 협업 수락된 명세서)
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
      const spec = await ProjectSpec.findById(id).lean();
      if (!spec) {
        return NextResponse.json(
          { error: "해당 프로젝트 명세서를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      const access = await getCollabAccess("erd", id, userEmail, spec.userEmail);
      if (!access.canRead) {
        return NextResponse.json(
          { error: "해당 프로젝트 명세서에 접근할 권한이 없습니다." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          ...spec,
          isOwner: access.isOwner,
          collabRole: access.role,
        },
        { status: 200 }
      );
    }

    const groups = await getUserCollabGroups("erd", userEmail);
    const groupById = new Map(groups.map((g) => [g.targetId, g]));
    const sharedIds = groups
      .filter((g) => g.ownerEmail !== userEmail)
      .map((g) => g.targetId);

    const specs = await ProjectSpec.find({
      $or: [
        { userEmail },
        ...(sharedIds.length > 0 ? [{ _id: { $in: sharedIds } }] : []),
      ],
    })
      .select("_id userEmail title description version status updatedAt createdAt tables revisions")
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = specs.map((s) => {
      const idStr = String(s._id);
      const isOwner = s.userEmail === userEmail;
      const group = groupById.get(idStr);
      const member = group?.members?.find((m) => m.email === userEmail);

      return {
        _id: s._id,
        title: s.title,
        description: s.description,
        version: s.version,
        status: s.status,
        tableCount: Array.isArray(s.tables) ? s.tables.length : 0,
        revisionCount: Array.isArray(s.revisions) ? s.revisions.length : 0,
        updatedAt: s.updatedAt,
        createdAt: s.createdAt,
        isOwner,
        isShared: !isOwner || (group?.members?.length || 0) > 0,
        collabRole: isOwner ? "owner" : member?.role || "viewer",
        ownerName: group?.ownerName || s.userEmail.split("@")[0],
        memberCount: (group?.members?.length || 0) + 1,
      };
    });

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

    if (id) {
      const existingSpec = await ProjectSpec.findById(id).lean();
      if (existingSpec) {
        const access = await getCollabAccess(
          "erd",
          String(id),
          userEmail,
          existingSpec.userEmail
        );
        if (!access.canEdit) {
          return NextResponse.json(
            { error: "프로젝트 명세서를 수정할 권한이 없습니다." },
            { status: 403 }
          );
        }
      }
    }

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

      const updated = await ProjectSpec.findByIdAndUpdate(
        id,
        {
          $set: {
            version,
            ...(snapshot?.tables ? { tables: snapshot.tables } : {}),
            ...(snapshot?.relations ? { relations: snapshot.relations } : {}),
            ...(snapshot?.architectureMd !== undefined
              ? { architectureMd: snapshot.architectureMd }
              : {}),
            ...(snapshot?.functionalSpecs
              ? { functionalSpecs: snapshot.functionalSpecs }
              : {}),
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
      const targetDoc = await ProjectSpec.findById(id);
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
      saved = await ProjectSpec.findByIdAndUpdate(
        id,
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
        { returnDocument: "after" }
      );
    } else {
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

// DELETE: 프로젝트 명세서 삭제 (소유자 전용)
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
      return NextResponse.json(
        { error: "삭제할 명세서를 찾을 수 없거나 삭제 권한이 없습니다." },
        { status: 404 }
      );
    }

    await Promise.all([
      CollaborationGroup.deleteMany({ moduleType: "erd", targetId: id }),
      CollaborationInvite.deleteMany({ moduleType: "erd", targetId: id }),
    ]);

    return NextResponse.json(
      { success: true, message: "명세서가 삭제되었습니다." },
      { status: 200 }
    );
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
export const PUT = withAudit(handlePost, "ERD 및 프로젝트 명세서 수정");
export const DELETE = withAudit(handleDelete, "ERD 및 프로젝트 명세서 삭제");
