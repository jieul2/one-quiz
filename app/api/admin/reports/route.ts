import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Report from '@/models/Report';

// GET: 관리자가 미해결된 신고 알림 목록 조회
export async function GET() {
  try {
    await dbConnect();
    const reports = await Report.find({ status: 'PENDING' }).sort({ createdAt: -1 });
    return NextResponse.json(reports, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return NextResponse.json({ error: '신고 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

// POST: 유저가 문제 오류 신고 접수
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { questionId, subject, examType, questionNumber, questionText, userEmail, reportReason } = body;

    const newReport = await Report.create({
      questionId,
      subject,             // 과목명 저장
      examType,           // 회차 저장
      questionNumber,     // 문항 번호 저장
      questionText,
      userEmail: userEmail || 'anonymous',
      reportReason,
    });

    return NextResponse.json({ success: true, reportId: newReport._id }, { status: 201 });
  } catch (error) {
    console.error('Failed to create report:', error);
    return NextResponse.json({ error: '신고 접수 실패' }, { status: 500 });
  }
}

// PUT: 관리자가 신고 건을 '처리 완료(RESOLVED)'로 변경
export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { reportId } = await request.json();

    await Report.findByIdAndUpdate(reportId, { status: 'RESOLVED' });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Failed to update report:', error);
    return NextResponse.json({ error: '상태 변경 실패' }, { status: 500 });
  }
}