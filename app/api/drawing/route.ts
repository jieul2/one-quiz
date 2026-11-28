import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Drawing from "@/models/Drawing";
import CollaborationGroup from "@/models/CollaborationGroup";
import CollaborationInvite from "@/models/CollaborationInvite";
import { withAudit } from "@/lib/withAudit";
import { getCollabAccess, getUserCollabGroups } from "@/lib/collaborationServer";

// GET: 사용자의 드로잉 목록 또는 특정 드로잉 단건 조회 (본인 + 협업 수락된 드로잉)
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
      const drawing = await Drawing.findById(id).lean();
      if (!drawing) {
        return NextResponse.json({ error: "해당 그림을 찾을 수 없습니다." }, { status: 404 });
      }

      const access = await getCollabAccess(
        "drawing",
        id,
        userEmail,
        drawing.userEmail
      );
      if (!access.canRead) {
        return NextResponse.json(
          { error: "해당 그림에 접근할 권한이 없습니다." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          ...drawing,
          isOwner: access.isOwner,
          collabRole: access.role,
        },
        { status: 200 }
      );
    }

    const groups = await getUserCollabGroups("drawing", userEmail);
    const groupById = new Map(groups.map((g) => [g.targetId, g]));
    const sharedIds = groups
      .filter((g) => g.ownerEmail !== userEmail)
      .map((g) => g.targetId);

    const drawings = await Drawing.find({
      $or: [
        { userEmail },
        ...(sharedIds.length > 0 ? [{ _id: { $in: sharedIds } }] : []),
      ],
    })
      .select("_id userEmail title thumbnail backgroundPattern backgroundColor elements updatedAt createdAt")
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = drawings.map((d) => {
      const idStr = String(d._id);
      const isOwner = d.userEmail === userEmail;
      const group = groupById.get(idStr);
      const member = group?.members?.find((m) => m.email === userEmail);

      return {
        _id: d._id,
        title: d.title,
        thumbnail: d.thumbnail,
        backgroundPattern: d.backgroundPattern,
        backgroundColor: d.backgroundColor,
        elementCount: Array.isArray(d.elements) ? d.elements.length : 0,
        updatedAt: d.updatedAt,
        createdAt: d.createdAt,
        isOwner,
        isShared: !isOwner || (group?.members?.length || 0) > 0,
        collabRole: isOwner ? "owner" : member?.role || "viewer",
        ownerName: group?.ownerName || d.userEmail.split("@")[0],
        memberCount: (group?.members?.length || 0) + 1,
      };
    });

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch drawings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "드로잉 조회 실패" },
      { status: 500 }
    );
  }
}

// POST: 드로잉 신규 생성 또는 업데이트 (소유자 또는 editor 권한 협업자 허용)
async function handlePost(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const {
      id,
      title,
      elements,
      thumbnail,
      backgroundColor,
      backgroundPattern,
      canvasWidth,
      canvasHeight,
    } = body;

    let savedDrawing;

    if (id) {
      const existing = await Drawing.findById(id).lean();
      if (existing) {
        const access = await getCollabAccess(
          "drawing",
          String(id),
          userEmail,
          existing.userEmail
        );
        if (!access.canEdit) {
          return NextResponse.json(
            { error: "스케치 편집 권한이 없습니다." },
            { status: 403 }
          );
        }

        savedDrawing = await Drawing.findByIdAndUpdate(
          id,
          {
            $set: {
              title: title || "새로운 스케치",
              elements: elements || [],
              thumbnail,
              backgroundColor: backgroundColor || "#ffffff",
              backgroundPattern: backgroundPattern || "blank",
              canvasWidth: canvasWidth || 1920,
              canvasHeight: canvasHeight || 1080,
            },
          },
          { returnDocument: "after" }
        );
      } else {
        savedDrawing = await Drawing.create({
          userEmail,
          title: title || "새로운 스케치",
          elements: elements || [],
          thumbnail,
          backgroundColor: backgroundColor || "#ffffff",
          backgroundPattern: backgroundPattern || "blank",
          canvasWidth: canvasWidth || 1920,
          canvasHeight: canvasHeight || 1080,
        });
      }
    } else {
      savedDrawing = await Drawing.create({
        userEmail,
        title: title || "새로운 스케치",
        elements: elements || [],
        thumbnail,
        backgroundColor: backgroundColor || "#ffffff",
        backgroundPattern: backgroundPattern || "blank",
        canvasWidth: canvasWidth || 1920,
        canvasHeight: canvasHeight || 1080,
      });
    }

    return NextResponse.json(
      { success: true, drawing: savedDrawing },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to save drawing:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "드로잉 저장 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 드로잉 삭제 (소유자 전용)
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
      return NextResponse.json({ error: "삭제할 드로잉 ID가 필요합니다." }, { status: 400 });
    }

    const deleted = await Drawing.findOneAndDelete({ _id: id, userEmail });
    if (!deleted) {
      return NextResponse.json(
        { error: "삭제할 대상을 찾을 수 없거나 삭제 권한이 없습니다." },
        { status: 404 }
      );
    }

    await Promise.all([
      CollaborationGroup.deleteMany({ moduleType: "drawing", targetId: id }),
      CollaborationInvite.deleteMany({ moduleType: "drawing", targetId: id }),
    ]);

    return NextResponse.json(
      { success: true, message: "드로잉이 삭제되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete drawing:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "드로잉 삭제 실패" },
      { status: 500 }
    );
  }
}

export const GET = withAudit(handleGet, "드로잉 스케치 목록 및 단건 조회");
export const POST = withAudit(handlePost, "드로잉 스케치 저장 및 업데이트");
export const DELETE = withAudit(handleDelete, "드로잉 스케치 삭제");
