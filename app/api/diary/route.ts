import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

function isTodayInKST(targetDate: Date) {
  const now = new Date();
  const targetKST = new Date(targetDate.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const nowKST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));

  return (
    targetKST.getFullYear() === nowKST.getFullYear() &&
    targetKST.getMonth() === nowKST.getMonth() &&
    targetKST.getDate() === nowKST.getDate()
  );
}

async function handleGet(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
  }

  await dbConnect();
  const diaries = await Diary.find({ userEmail: session.user.email }).sort({ createdAt: -1 });
  return NextResponse.json(diaries);
}

async function handlePost(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
  }

  const { items, weather, title, content } = await req.json();

  let rawItems = items;
  if (!rawItems && title && content) {
    rawItems = [{ title, content, images: [] }];
  }

  if (!rawItems || !Array.isArray(rawItems)) {
    return NextResponse.json({ error: "올바른 항목 데이터가 필요합니다." }, { status: 400 });
  }

  const validItems = rawItems.filter(
    (item) =>
      item.title?.trim() !== "" ||
      item.content?.trim() !== "" ||
      (item.images && item.images.length > 0),
  );

  if (validItems.length === 0) {
    return NextResponse.json({ error: "제목과 내용을 모두 입력해주세요." }, { status: 400 });
  }

  await dbConnect();

  const { startOfDay, endOfDay } = getKSTDateRange();

  const existingTodayDiary = await Diary.findOne({
    userEmail: session.user.email,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  if (existingTodayDiary) {
    return NextResponse.json(
      { error: "하루에 일기는 오직 1개만 작성할 수 있습니다." },
      { status: 400 },
    );
  }

  const newDiary = await Diary.create({
    userEmail: session.user.email,
    weather: weather || "sunny", // 👈 날씨 저장 (기본값: sunny)
    items: validItems,
    createdAt: new Date(),
  });

  return NextResponse.json(newDiary, { status: 201 });
}

async function handlePut(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
  }

  const { id, items, weather } = await req.json();
  if (!items || !Array.isArray(items)) {
    return NextResponse.json({ error: "올바른 항목 데이터가 필요합니다." }, { status: 400 });
  }

  const validItems = items.filter(
    (item) =>
      item.title?.trim() !== "" ||
      item.content?.trim() !== "" ||
      (item.images && item.images.length > 0),
  );

  if (validItems.length === 0) {
    return NextResponse.json(
      { error: "저장할 유효한 내용이 최소 한 개 이상 있어야 합니다." },
      { status: 400 },
    );
  }

  await dbConnect();

  const diary = await Diary.findById(id);
  if (!diary) {
    return NextResponse.json({ error: "일기를 찾을 수 없습니다." }, { status: 404 });
  }

  if (diary.userEmail !== session.user.email) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const isToday = isTodayInKST(new Date(diary.createdAt));

  if (!isToday) {
    return NextResponse.json({ error: "자정이 지난 일기는 수정할 수 없습니다." }, { status: 400 });
  }

  if (weather) diary.weather = weather; // 👈 날씨 업데이트
  diary.items = validItems;
  await diary.save();

  return NextResponse.json({ message: "수정 완료", diary });
}

export const GET = withAudit(handleGet, "일기 목록 조회");
export const POST = withAudit(handlePost, "새로운 일기 작성");
export const PUT = withAudit(handlePut, "일기 수정");
