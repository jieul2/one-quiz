import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Report from "@/models/Report";
import Feedback from "@/models/Feedback";
import { sendFeedbackNotificationEmail } from "@/lib/email";

// GET: 관리자가 미해결된 신고 알림 목록 조회
export async function GET() {
  try {
    await dbConnect();
    const reports = await Report.find({ status: "PENDING" }).sort({ createdAt: -1 });
    return NextResponse.json(reports, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json({ error: "신고 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

// POST: 유저가 문제 오류 신고 접수 -> Report 컬렉션 저장 및 관리자 Feedback 접수함 자동 연동
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { questionId, subject, examType, questionNumber, questionText, userEmail, reportReason } =
      body;

    const email = userEmail && userEmail !== "anonymous" ? userEmail : "anonymous@one-quiz.com";

    // 1. 기존 Report 컬렉션에 저장 (기존 스키마 원형 유지)
    const newReport = await Report.create({
      questionId: questionId || undefined,
      subject,
      examType,
      questionNumber: questionNumber !== undefined ? Number(questionNumber) : undefined,
      questionText,
      userEmail: email,
      reportReason,
      status: "PENDING",
    });

    // 2. 관리자 피드백 접수함(Feedback 컬렉션)에 동기화 생성
    const titleParts = [
      subject,
      examType,
      questionNumber !== undefined ? `${questionNumber}번` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const reportTitle = `[문제 오류 신고] ${titleParts || "문항 오류"}`.trim();
    const reportContent = `[신고 사유]\n${reportReason}\n\n[문제 지문]\n${questionText || "지문 정보 없음"}\n\n[과목/회차/문항]: ${subject || "-"} / ${examType || "-"} / ${questionNumber ?? "-"}번`;

    const newFeedback = await Feedback.create({
      userEmail: email,
      userName: "문제 오류 제보",
      type: "report",
      title: reportTitle,
      content: reportContent,
      status: "pending",
      questionId: questionId || undefined,
      subject: subject || undefined,
      examType: examType || undefined,
      questionNumber: questionNumber !== undefined ? Number(questionNumber) : undefined,
      reportId: newReport._id,
    });

    // 3. 관리자 알림 이메일 비동기 발송
    sendFeedbackNotificationEmail({
      type: "report",
      title: reportTitle,
      content: reportContent,
      userEmail: email,
      userName: "문제 오류 제보",
    }).catch((err) => console.error("Failed to send report email notification:", err));

    return NextResponse.json(
      {
        success: true,
        reportId: newReport._id,
        feedbackId: newFeedback._id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json({ error: "신고 접수 실패" }, { status: 500 });
  }
}

// PUT: 관리자가 신고 건을 '처리 완료(RESOLVED)'로 변경 -> Feedback 컬렉션 상태도 동기화
export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { reportId } = await request.json();

    if (!reportId) {
      return NextResponse.json({ error: "신고 ID가 필요합니다." }, { status: 400 });
    }

    await Report.findByIdAndUpdate(reportId, { status: "RESOLVED" });

    // 연동된 Feedback 문서도 해결 완료로 동기화
    await Feedback.findOneAndUpdate({ reportId }, { status: "resolved" });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to update report:", error);
    return NextResponse.json({ error: "상태 변경 실패" }, { status: 500 });
  }
}
