import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import LearningLog from "@/models/LearningLog";
import Diary from "@/models/Diary";
import QuestionAttempt from "@/models/QuestionAttempt";

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const email = session.user.email;
    await dbConnect();

    // 1. 최근 180일(약 26주) 날짜 범위 계산
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 180);
    const startDateStr = formatDate(startDate);
    const todayStr = formatDate(today);

    // 2. LearningLog DB 데이터 조회
    const logs = await LearningLog.find({
      userEmail: email,
      date: { $gte: startDateStr, $lte: todayStr },
    }).lean();

    const logMap = new Map<string, (typeof logs)[0]>();
    logs.forEach((l) => logMap.set(l.date, l));

    // 3. 일기(Diary) 데이터 연동 (일기 작성 일자 보정)
    try {
      const diaries = await Diary.find({
        userEmail: email,
        date: { $gte: startDateStr, $lte: todayStr },
      }).select("date title createdAt").lean();

      diaries.forEach((d) => {
        if (!logMap.has(d.date)) {
          logMap.set(d.date, {
            date: d.date,
            studyMinutes: 30, // 일기 작성 기본 활동 점수 30분 환산
            questionsSolved: 0,
            questionsCorrect: 0,
            diaryWritten: true,
            tasksCompleted: 0,
            subjectBreakdown: [],
            recentActivities: [
              {
                type: "diary" as const,
                title: `학습 일기 작성: ${d.title || "오늘의 회고"}`,
                timestamp: d.createdAt || new Date(),
              },
            ],
          } as unknown as (typeof logs)[0]);
        } else {
          const entry = logMap.get(d.date)!;
          entry.diaryWritten = true;
        }
      });
    } catch (e) {
      console.error("Diary sync error:", e);
    }

    // 4. 기출문제(QuestionAttempt) 사용자별 독립 풀이 이력 연동
    const subjectMap = new Map<string, { solved: number; correct: number }>();
    let totalQuestions = 0;
    let totalCorrect = 0;

    try {
      const userAttempts = await QuestionAttempt.find({
        userEmail: email,
        timestamp: { $gte: startDate },
      }).lean();

      userAttempts.forEach((att) => {
        const sub = att.subject || "공통 과목";
        if (!subjectMap.has(sub)) {
          subjectMap.set(sub, { solved: 0, correct: 0 });
        }
        const sStat = subjectMap.get(sub)!;

        sStat.solved += 1;
        totalQuestions += 1;
        if (att.isCorrect) {
          sStat.correct += 1;
          totalCorrect += 1;
        }

        // 해당 문제 풀이 날짜의 잔디 카운트 반영
        if (att.timestamp) {
          const hDateStr = formatDate(new Date(att.timestamp));
          if (hDateStr >= startDateStr && hDateStr <= todayStr) {
            if (!logMap.has(hDateStr)) {
              logMap.set(hDateStr, {
                date: hDateStr,
                studyMinutes: 10,
                questionsSolved: 1,
                questionsCorrect: att.isCorrect ? 1 : 0,
                diaryWritten: false,
                tasksCompleted: 0,
                subjectBreakdown: [{ subject: sub, solved: 1, correct: att.isCorrect ? 1 : 0 }],
                recentActivities: [],
              } as unknown as (typeof logs)[0]);
            } else {
              const entry = logMap.get(hDateStr)!;
              entry.questionsSolved = (entry.questionsSolved || 0) + 1;
              if (att.isCorrect) {
                entry.questionsCorrect = (entry.questionsCorrect || 0) + 1;
              }
            }
          }
        }
      });
    } catch (e) {
      console.error("QuestionAttempt history sync error:", e);
    }

    // 5. 180일간의 연속 일자 히트맵(잔디) 배열 생성
    const heatmap: {
      date: string;
      count: number;
      level: 0 | 1 | 2 | 3 | 4;
      studyMinutes: number;
      questionsSolved: number;
      diaryWritten: boolean;
    }[] = [];

    const cur = new Date(startDate);
    let totalMinutes = 0;
    let monthlyActiveDays = 0;
    const currentMonthPrefix = todayStr.slice(0, 7);

    while (cur <= today) {
      const dStr = formatDate(cur);
      const entry = logMap.get(dStr);

      const mins = entry?.studyMinutes || 0;
      const qSolved = entry?.questionsSolved || 0;
      const diary = !!entry?.diaryWritten;
      const tasks = entry?.tasksCompleted || 0;

      // 종합 활동 점수 (문제 1개 = 1점, 일기 = 3점, 타이머 15분 = 1점, 할일 = 1점)
      const activityScore = qSolved + (diary ? 3 : 0) + Math.floor(mins / 15) + tasks;

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (activityScore >= 8) level = 4;
      else if (activityScore >= 5) level = 3;
      else if (activityScore >= 3) level = 2;
      else if (activityScore >= 1) level = 1;

      totalMinutes += mins;
      if (activityScore > 0 && dStr.startsWith(currentMonthPrefix)) {
        monthlyActiveDays += 1;
      }

      heatmap.push({
        date: dStr,
        count: activityScore,
        level,
        studyMinutes: mins,
        questionsSolved: qSolved,
        diaryWritten: diary,
      });

      cur.setDate(cur.getDate() + 1);
    }

    // 6. 스트릭(연속 학습일) 계산
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // 역순으로 최근부터 오늘/어제 연속일 계산
    const checkDate = new Date(today);
    while (true) {
      const dStr = formatDate(checkDate);
      const dayData = logMap.get(dStr);
      const score = (dayData?.questionsSolved || 0) + (dayData?.diaryWritten ? 1 : 0) + (dayData?.studyMinutes ? 1 : 0);

      if (score > 0) {
        currentStreak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // 오늘 아직 안 했지만 어제까지 했는지 1회 체크
        if (currentStreak === 0 && dStr === todayStr) {
          checkDate.setDate(checkDate.getDate() - 1);
          const yesterdayStr = formatDate(checkDate);
          const yData = logMap.get(yesterdayStr);
          const yScore = (yData?.questionsSolved || 0) + (yData?.diaryWritten ? 1 : 0) + (yData?.studyMinutes ? 1 : 0);
          if (yScore > 0) {
            currentStreak += 1;
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
          }
        }
        break;
      }
    }

    // 전체 구간 중 최장 스트릭 산출
    heatmap.forEach((h) => {
      if (h.count > 0) {
        tempStreak += 1;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    });

    // 7. 과목별 정답률 통계 정돈
    const subjectStats = Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      solved: data.solved,
      correct: data.correct,
      accuracy: data.solved > 0 ? Math.round((data.correct / data.solved) * 100) : 0,
    })).sort((a, b) => b.solved - a.solved);

    // 8. 최근 학습 활동 피드
    const allRecentActivities: { type: string; title: string; timestamp: Date }[] = [];
    logs.forEach((l) => {
      if (Array.isArray(l.recentActivities)) {
        allRecentActivities.push(...l.recentActivities);
      }
    });
    allRecentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      heatmap,
      stats: {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        totalStudyMinutes: totalMinutes,
        totalStudyHours: Math.round((totalMinutes / 60) * 10) / 10,
        totalQuestionsSolved: totalQuestions,
        totalQuestionsCorrect: totalCorrect,
        overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
        monthlyActiveDays,
      },
      subjectStats,
      recentActivities: allRecentActivities.slice(0, 10),
    });
  } catch (error) {
    console.error("GET /api/learning-log error:", error);
    return NextResponse.json(
      { error: "러닝 기록 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 스터디 타이머 시간 누적 저장 또는 수동 학습 기록
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const email = session.user.email;
    const body = await req.json();
    const { minutes, date, title } = body;

    const targetDate = date || formatDate(new Date());
    const addedMinutes = Math.max(1, Number(minutes) || 1);

    await dbConnect();

    const activityTitle = title || `${addedMinutes}분 집중 스터디 세션 완료`;

    const updated = await LearningLog.findOneAndUpdate(
      { userEmail: email, date: targetDate },
      {
        $inc: { studyMinutes: addedMinutes },
        $push: {
          recentActivities: {
            $each: [
              {
                type: "timer",
                title: activityTitle,
                timestamp: new Date(),
              },
            ],
            $slice: -20, // 최근 20개만 유지
          },
        },
      },
      { returnDocument: "after", upsert: true }
    );

    return NextResponse.json({ success: true, log: updated });
  } catch (error) {
    console.error("POST /api/learning-log error:", error);
    return NextResponse.json(
      { error: "학습 기록 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
