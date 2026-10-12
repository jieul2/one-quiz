import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Diary from '@/models/Diary';
import { withAudit } from '@/lib/withAudit';

// 1. 본인 일기 목록 조회
async function handleGet(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
  }

  await dbConnect();
  const diaries = await Diary.find({ userEmail: session.user.email }).sort({ createdAt: -1 });
  return NextResponse.json(diaries);
}

// 2. 새 일기 작성 (변경 스키마 items 배열 구조 반영)
async function handlePost(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
  }

  const { title, content } = await req.json();
  if (!title || !content) {
    return NextResponse.json({ error: '제목과 내용을 모두 입력해주세요.' }, { status: 400 });
  }

  await dbConnect();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const existingTodayDiary = await Diary.findOne({
    userEmail: session.user.email,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  if (existingTodayDiary) {
    return NextResponse.json({ error: '하루에 일기는 오직 1개만 작성할 수 있습니다.' }, { status: 400 });
  }

  // 👈 변경된 items 배열 구조로 새 일기 문서 생성
  const newDiary = await Diary.create({
    userEmail: session.user.email,
    items: [{ title, content }],
    createdAt: new Date(),
  });

  return NextResponse.json(newDiary, { status: 201 });
}

// 3. 일기 수정 (빈 항목 자동 필터링 로직 포함)
async function handlePut(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
  }

  const { id, items } = await req.json();
  if (!items || !Array.isArray(items)) {
    return NextResponse.json({ error: '올바른 항목 데이터가 필요합니다.' }, { status: 400 });
  }

  const validItems = items.filter(
    (item) => item.title?.trim() !== '' || item.content?.trim() !== ''
  );

  if (validItems.length === 0) {
    return NextResponse.json({ error: '저장할 유효한 내용이 최소 한 개 이상 있어야 합니다.' }, { status: 400 });
  }

  await dbConnect();

  const diary = await Diary.findById(id);
  if (!diary) {
    return NextResponse.json({ error: '일기를 찾을 수 없습니다.' }, { status: 404 });
  }

  if (diary.userEmail !== session.user.email) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const createdAtDate = new Date(diary.createdAt);
  const nowDate = new Date();

  const isToday =
    createdAtDate.getFullYear() === nowDate.getFullYear() &&
    createdAtDate.getMonth() === nowDate.getMonth() &&
    createdAtDate.getDate() === nowDate.getDate();

  if (!isToday) {
    return NextResponse.json({ error: '자정이 지난 일기는 수정할 수 없습니다.' }, { status: 400 });
  }

  diary.items = validItems;
  await diary.save();

  return NextResponse.json({ message: '수정 완료', diary });
}

export const GET = withAudit(handleGet, '일기 목록 조회');
export const POST = withAudit(handlePost, '새로운 일기 작성');
export const PUT = withAudit(handlePut, '일기 수정');