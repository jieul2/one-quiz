import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Diary from "@/models/Diary";
import { withAudit } from "@/lib/withAudit";

function getKSTDateRange() {
  const now = new Date();
  const kstString = now.toLocaleString("en-US", { timeZone: "Asia/Seoul" });
  const kstDate = new Date(kstString);

  const startKST = new Date(kstDate);
  startKST.setHours(0, 0, 0, 0);

  const endKST = new Date(kstDate);
  endKST.setHours(23, 59, 59, 999);

  const offset = 9 * 60 * 60 * 1000;
  return {
    startOfDay: new Date(startKST.getTime() - offset),
    endOfDay: new Date(endKST.getTime() - offset),
  };
}

async function handlePost(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "로그인한 사용자만 일기에 그림을 추가할 수 있습니다." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { imageUrl, title, content } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "추가할 이미지 URL이 유효하지 않습니다." },
        { status: 400 }
      );
    }

    await dbConnect();
    const { startOfDay, endOfDay } = getKSTDateRange();

    // 오늘 작성된 KST 일기 검색
    const existingTodayDiary = await Diary.findOne({
      userEmail: session.user.email,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const sketchItem = {
      title: title ? `🎨 스케치: ${title.trim()}` : "🎨 오늘의 스케치",
      content:
        content?.trim() ||
        "그림판에서 생성한 오늘의 드로잉 스케치입니다.",
      images: [imageUrl],
    };

    if (existingTodayDiary) {
      // 오늘 일기가 이미 있는 경우: 일기 내 항목(items)에 스케치 추가
      existingTodayDiary.items.push(sketchItem);
      await existingTodayDiary.save();

      return NextResponse.json({
        success: true,
        message: "오늘 일기에 스케치가 성공적으로 추가되었습니다.",
        diary: existingTodayDiary,
        isNewDiary: false,
      });
    } else {
      // 오늘 일기가 아직 없는 경우: 새 일기 문서 생성 후 스케치 항목 등록
      const newDiary = await Diary.create({
        userEmail: session.user.email,
        weather: "sunny",
        items: [sketchItem],
        createdAt: new Date(),
      });

      return NextResponse.json(
        {
          success: true,
          message: "오늘 일기가 생성되고 스케치가 성공적으로 등록되었습니다.",
          diary: newDiary,
          isNewDiary: true,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("POST /api/diary/drawing error:", error);
    return NextResponse.json(
      { error: "오늘 일기에 그림을 추가하지 못했습니다." },
      { status: 500 }
    );
  }
}

export const POST = withAudit(handlePost, "그림판 스케치를 오늘 일기에 추가");
