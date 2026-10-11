import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/models/Question';
import { withAudit } from '@/lib/withAudit';

// 1. 문제 목록 조회
async function handleGet(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  // 특정 ID로 조회를 요청한 경우 단건 반환
  if (id) {
    const question = await Question.findById(id);
    if (!question) {
      return NextResponse.json({ error: '문제를 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json([question], { status: 200 }); // 일관성을 위해 배열 형태로 반환
  }

  const questions = await Question.find({}).sort({ subject: 1, examType: 1, questionNumber: 1 });
  return NextResponse.json(questions);
}

// 2. 새 문제 등록
async function handlePost(req: Request) {
  await dbConnect();
  const body = await req.json();
  const newQuestion = await Question.create(body);
  return NextResponse.json({ success: true, data: newQuestion }, { status: 201 });
}

// 3. 문제 삭제 또는 전체 풀이 기록 초기화
async function handleDelete(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const resetAll = searchParams.get('resetAll');

  // 전체 풀이 기록 초기화 요청 처리
  if (resetAll === 'true') {
    await Question.updateMany({}, { $set: { history: [] } });
    return NextResponse.json({ success: true, message: 'All histories reset' }, { status: 200 });
  }

  if (!id) return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });
  await Question.findByIdAndDelete(id);
  return NextResponse.json({ success: true }, { status: 200 });
}

// 4. 문제 정보 수정
async function handlePut(req: Request) {
  await dbConnect();
  const body = await req.json();
  const { _id, ...updateData } = body;
  if (!_id) return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });
  
  const updatedQuestion = await Question.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });
  return NextResponse.json({ success: true, data: updatedQuestion }, { status: 200 });
}

// 5. 사용자 문제 풀이 기록(정답/오답) 추가
async function handlePatch(req: Request) {
  await dbConnect();
  const body = await req.json();
  const { _id, isCorrect } = body;
  
  if (!_id) return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });

  const updatedQuestion = await Question.findByIdAndUpdate(
    _id,
    { $push: { history: { isCorrect, timestamp: new Date() } } },
    { returnDocument: 'after' }
  );
  return NextResponse.json({ success: true, data: updatedQuestion }, { status: 200 });
}

// withAudit 래퍼를 적용하여 기출문제 관리 및 풀이 기록 관련 모든 활동이 감사 로그에 자동 수집됨
export const GET = withAudit(handleGet, '기출문제 DB 목록 조회');
export const POST = withAudit(handlePost, '새로운 기출문제 등록');
export const DELETE = withAudit(handleDelete, '기출문제 삭제 또는 전체 풀이 기록 초기화');
export const PUT = withAudit(handlePut, '기출문제 정보 수정');
export const PATCH = withAudit(handlePatch, '사용자 문제 풀이 결과 기록');