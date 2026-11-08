import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Drawing from "@/models/Drawing";
import { withAudit } from "@/lib/withAudit";

// GET: 사용자의 드로잉 목록 또는 특정 드로잉 단건 조회
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
      const drawing = await Drawing.findOne({ _id: id, userEmail });
      if (!drawing) {
        return NextResponse.json({ error: "해당 그림을 찾을 수 없습니다." }, { status: 404 });
      }
      return NextResponse.json(drawing, { status: 200 });
    }

    // 갤러리 목록용 요약 데이터 조회
    const drawings = await Drawing.find({ userEmail })
      .select("_id title thumbnail backgroundPattern backgroundColor updatedAt createdAt")
      .sort({ updatedAt: -1 });

    return NextResponse.json(drawings, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch drawings:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "드로잉 조회 실패" },
      { status: 500 }
    );
  }
}

// POST: 드로잉 신규 생성 또는 업데이트 (저장)
async function handlePost(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { id, title, elements, thumbnail, backgroundColor, backgroundPattern, canvasWidth, canvasHeight } = body;

    let savedDrawing;

    if (id) {
      // 기존 드로잉 업데이트
      savedDrawing = await Drawing.findOneAndUpdate(
        { _id: id, userEmail },
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
        { returnDocument: "after", upsert: true }
      );
    } else {
      // 신규 드로잉 생성
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

// DELETE: 드로잉 삭제
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
      return NextResponse.json({ error: "삭제할 대상을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "드로잉이 삭제되었습니다." }, { status: 200 });
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
