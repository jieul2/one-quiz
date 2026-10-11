import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Diary from '@/models/Diary';

// 1. 본인 일기 목록 조회
export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    await dbConnect();
    const diaries = await Diary.find({ userEmail: session.user.email }).sort({ createdAt: -1 });
    return NextResponse.json(diaries);
  } catch (error) {
    return NextResponse.json({ error: '서버 오류 발생' }, { status: 500 });
  }
}

// 2. 새 일기 작성
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const { title, content } = await req.json();
    if (!title || !content) {
      return NextResponse.json({ error: '제목과 내용을 모두 입력해주세요.' }, { status: 400 });
    }

    await dbConnect();
    const newDiary = await Diary.create({
      userEmail: session.user.email,
      title,
      content,
      createdAt: new Date(),
    });

    return NextResponse.json(newDiary, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: '서버 오류 발생' }, { status: 500 });
  }
}

// 3. 일기 수정 (24시간 이내만 허용)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const { id, title, content } = await req.json();
    await dbConnect();

    const diary = await Diary.findById(id);
    if (!diary) {
      return NextResponse.json({ error: '일기를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 본인 일기인지 확인
    if (diary.userEmail !== session.user.email) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 24시간(86,400,000ms) 경과 여부 체크
    const now = new Date().getTime();
    const createdTime = new Date(diary.createdAt).getTime();
    const hoursPassed = (now - createdTime) / (1000 * 60 * 60);

    if (hoursPassed > 24) {
      return NextResponse.json({ error: '작성 후 24시간이 지난 일기는 수정할 수 없습니다.' }, { status: 400 });
    }

    diary.title = title;
    diary.content = content;
    await diary.save();

    return NextResponse.json({ message: '수정 완료', diary });
  } catch (error) {
    return NextResponse.json({ error: '서버 오류 발생' }, { status: 500 });
  }
}