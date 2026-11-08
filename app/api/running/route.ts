import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import RunningLog from "@/models/RunningLog";

// AI 러닝 코치 피드백 생성 함수
function generateAiRunningCoachFeedback(
  distanceKm: number,
  durationMinutes: number,
  paceMinutes: number,
  paceSeconds: number,
  heartRateAvg?: number
): string {
  const paceDecimal = paceMinutes + paceSeconds / 60;
  let intensity = "유산소 회복 런 (Zone 2)";
  let tips = "";
  let recoveryHours = 24;

  if (paceDecimal < 4.5) {
    intensity = "고강도 템포/스피드 런 (Zone 4~5)";
    recoveryHours = 48;
    tips = "빠른 페이스로 심폐 지구력과 젖산 역치가 크게 자극되었습니다. 폼롤러로 대퇴사두근과 비복근을 꼼꼼히 이완하고 48시간의 충분한 수면 회복을 권장합니다.";
  } else if (paceDecimal < 5.5) {
    intensity = "안정적인 지속주 (Zone 3~4)";
    recoveryHours = 36;
    tips = "케이던스와 호흡 밸런스가 매우 이상적인 페이스입니다. 장거리 마라톤 페이스 유지 능력이 향상되고 있습니다. 단백질과 전해질 보충을 잊지 마세요.";
  } else if (paceDecimal < 6.5) {
    intensity = "기초 유산소 빌드업 (Zone 2~3)";
    recoveryHours = 24;
    tips = "지방 연소 효율과 모세혈관 발달에 가장 탁월한 황금 존입니다. 대화가 가능한 편안한 호흡을 유지하며 기초 심폐 엔진을 탄탄히 다졌습니다.";
  } else {
    intensity = "리커버리 및 가벼운 조깅 (Zone 1~2)";
    recoveryHours = 18;
    tips = "관절과 인대에 무리를 주지 않는 부드러운 리커버리 러닝이었습니다. 다음 강훈련 전 혈액순환과 피로 물질 배출에 큰 도움이 됩니다.";
  }

  const heartRateComment = heartRateAvg && heartRateAvg > 0
    ? ` 평균 심박수 ${heartRateAvg}bpm으로 안정적인 심폐 밴드를 유지했습니다.`
    : "";

  return `🏃 [AI 러닝 코치 리포트]
• 운동 분류: ${intensity} (${distanceKm}km / ${durationMinutes}분 완주)
• 맞춤 분석: ${tips}${heartRateComment}
• 권장 휴식: 다음 런까지 약 ${recoveryHours}시간의 가벼운 스트레칭 및 수분 섭취를 추천합니다. 오늘도 훌륭한 러닝이었습니다! 🔥`;
}

// 1. 러닝 기록 목록 및 통계 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const logs = await RunningLog.find({ userEmail: session.user.email }).sort({
      date: -1,
      createdAt: -1,
    });

    const totalRuns = logs.length;
    const totalDistance = logs.reduce((acc, cur) => acc + (cur.distanceKm || 0), 0);
    const totalDuration = logs.reduce((acc, cur) => acc + (cur.durationMinutes || 0), 0);
    const totalCalories = logs.reduce((acc, cur) => acc + (cur.calories || 0), 0);

    let avgPaceStr = "-";
    if (totalDistance > 0 && totalDuration > 0) {
      const avgPaceDecimal = totalDuration / totalDistance;
      const paceMin = Math.floor(avgPaceDecimal);
      const paceSec = Math.round((avgPaceDecimal - paceMin) * 60);
      avgPaceStr = `${paceMin}'${String(paceSec).padStart(2, "0")}"`;
    }

    return NextResponse.json({
      logs,
      stats: {
        totalRuns,
        totalDistanceKm: Number(totalDistance.toFixed(2)),
        totalDurationMinutes: totalDuration,
        totalCalories,
        avgPace: avgPaceStr,
      },
    });
  } catch (error) {
    console.error("Running logs fetch error:", error);
    return NextResponse.json({ error: "기록을 불러오지 못했습니다." }, { status: 500 });
  }
}

// 2. 신규 러닝 기록 생성 (AI 코치 자동 분석 포함)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const {
      distanceKm,
      durationMinutes,
      pace,
      calories,
      heartRateAvg,
      cadence,
      location,
      shoes,
      weather,
      memo,
      proofImageUrl,
      date,
    } = body;

    if (!distanceKm || !durationMinutes) {
      return NextResponse.json(
        { error: "거리(km)와 달린 시간(분)은 필수 입력 항목입니다." },
        { status: 400 }
      );
    }

    // 페이스 계산 (예: 5'30" 형식 파싱 또는 분/km 계산)
    let paceMinutes = 5;
    let paceSeconds = 30;
    let computedPaceStr = pace;

    if (!computedPaceStr) {
      const rawPace = durationMinutes / distanceKm;
      paceMinutes = Math.floor(rawPace);
      paceSeconds = Math.round((rawPace - paceMinutes) * 60);
      computedPaceStr = `${paceMinutes}'${String(paceSeconds).padStart(2, "0")}"`;
    } else {
      const parts = computedPaceStr.replace(/["']/g, " ").trim().split(/\s+/);
      if (parts.length >= 2) {
        paceMinutes = parseInt(parts[0], 10) || 5;
        paceSeconds = parseInt(parts[1], 10) || 0;
      }
    }

    // AI 러닝 코치 피드백 자동 생성
    const aiFeedback = generateAiRunningCoachFeedback(
      Number(distanceKm),
      Number(durationMinutes),
      paceMinutes,
      paceSeconds,
      heartRateAvg ? Number(heartRateAvg) : undefined
    );

    // 대략적인 칼로리 계산 (입력되지 않은 경우: 체중 65kg 기준 1km당 약 65kcal)
    const computedCalories = calories
      ? Number(calories)
      : Math.round(Number(distanceKm) * 65);

    await dbConnect();
    const newLog = await RunningLog.create({
      userEmail: session.user.email,
      userName: session.user.name || "러너",
      date: date ? new Date(date) : new Date(),
      distanceKm: Number(distanceKm),
      durationMinutes: Number(durationMinutes),
      pace: computedPaceStr,
      calories: computedCalories,
      heartRateAvg: heartRateAvg ? Number(heartRateAvg) : undefined,
      cadence: cadence ? Number(cadence) : undefined,
      location: location || "야외 러닝 코스",
      shoes: shoes || "",
      weather: weather || "맑음",
      memo: memo || "",
      proofImageUrl: proofImageUrl || "",
      aiFeedback,
    });

    return NextResponse.json({ success: true, log: newLog }, { status: 201 });
  } catch (error) {
    console.error("Running log create error:", error);
    return NextResponse.json({ error: "러닝 기록 저장 실패" }, { status: 500 });
  }
}

// 3. 러닝 기록 삭제
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "삭제할 ID가 없습니다." }, { status: 400 });
    }

    await dbConnect();
    const log = await RunningLog.findById(id);
    if (!log) {
      return NextResponse.json({ error: "기록을 찾을 수 없습니다." }, { status: 404 });
    }

    if (log.userEmail !== session.user.email && session.user.role !== "admin") {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }

    await RunningLog.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "기록이 삭제되었습니다." });
  } catch (error) {
    console.error("Running log delete error:", error);
    return NextResponse.json({ error: "삭제 처리 중 오류 발생" }, { status: 500 });
  }
}
