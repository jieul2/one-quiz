import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Question from "@/models/Question";
import QuestionAttempt from "@/models/QuestionAttempt";
import LearningLog from "@/models/LearningLog";
import { withAudit } from "@/lib/withAudit";

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function handlePost(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "로그인한 사용자만 문제 풀이 이력을 안전하게 기록할 수 있습니다." },
        { status: 401 }
      );
    }

    const email = session.user.email;
    const body = await req.json();
    const { isCorrect, userAnswer = "" } = body;

    const { id: questionId } = await context.params;

    if (!questionId) {
      return NextResponse.json(
        { error: "문제 ID(questionId)가 유효하지 않습니다." },
        { status: 400 }
      );
    }

    await dbConnect();

    // 1. 문제 정보 확인
    const question = await Question.findById(questionId).select("subject examType title").lean();
    if (!question) {
      return NextResponse.json({ error: "존재하지 않는 문제입니다." }, { status: 404 });
    }

    const now = new Date();

    // 2. 사용자별 독립 풀이 이력(QuestionAttempt) 컬렉션에 영구 기록
    const attempt = await QuestionAttempt.create({
      userEmail: email,
      questionId,
      isCorrect: Boolean(isCorrect),
      userAnswer: String(userAnswer || ""),
      subject: question.subject || "",
      examType: question.examType || "",
      timestamp: now,
    });

    // 3. Question 문서 내 history 배열에도 사용자 이메일과 함께 동기화 (하위 호환성 유지)
    await Question.findByIdAndUpdate(questionId, {
      $push: {
        history: {
          userEmail: email,
          isCorrect: Boolean(isCorrect),
          timestamp: now,
        },
      },
    });

    // 4. 당일 러닝 로그(LearningLog) 자동 누적 연동
    const todayStr = formatDate(now);
    await LearningLog.findOneAndUpdate(
      { userEmail: email, date: todayStr },
      {
        $inc: {
          questionsSolved: 1,
          ...(isCorrect ? { questionsCorrect: 1 } : {}),
        },
        $push: {
          recentActivities: {
            $each: [
              {
                type: "question",
                title: `기출 풀이 (${isCorrect ? "정답" : "오답"}): ${question.title?.slice(0, 30) || "문제"}`,
                timestamp: now,
              },
            ],
            $slice: -20,
          },
        },
      },
      { returnDocument: "after", upsert: true }
    );

    // 5. 이 사용자의 해당 문제 전체 풀이 이력 반환
    const userHistory = await QuestionAttempt.find({
      userEmail: email,
      questionId,
    })
      .sort({ timestamp: 1 })
      .select("isCorrect timestamp userAnswer")
      .lean();

    return NextResponse.json({
      success: true,
      attempt,
      history: userHistory,
    });
  } catch (error) {
    console.error("POST /api/questions/[id]/history error:", error);
    return NextResponse.json(
      { error: "문제 풀이 기록 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export const POST = withAudit(handlePost, "사용자 개별 문제 풀이 기록");
