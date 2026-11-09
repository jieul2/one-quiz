import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { FinanceBudget } from "@/models/Finance";
import { withAudit } from "@/lib/withAudit";

// GET: 월별 예산 조회
async function handleGet(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const monthKey = searchParams.get("monthKey") || new Date().toISOString().slice(0, 7);

    const budget = await FinanceBudget.findOne({ userEmail, monthKey });

    return NextResponse.json(budget || { userEmail, monthKey, totalBudget: 0, categoryBudgets: [] }, { status: 200 });
  } catch (error) {
    console.error("GET /api/finance/budgets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예산 조회 실패" },
      { status: 500 }
    );
  }
}

// POST: 월별 예산 설정/업데이트
async function handlePost(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { monthKey, totalBudget, categoryBudgets = [], rolloverToNextMonth = false } = body;

    if (!monthKey) {
      return NextResponse.json({ error: "예산 적용 연월(YYYY-MM)을 지정해주세요." }, { status: 400 });
    }

    const saved = await FinanceBudget.findOneAndUpdate(
      { userEmail, monthKey },
      {
        $set: {
          totalBudget: Number(totalBudget) || 0,
          categoryBudgets,
          rolloverToNextMonth: Boolean(rolloverToNextMonth),
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    return NextResponse.json(saved, { status: 200 });
  } catch (error) {
    console.error("POST /api/finance/budgets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예산 저장 실패" },
      { status: 500 }
    );
  }
}

export const GET = withAudit(handleGet, "가계부 예산 조회");
export const POST = withAudit(handlePost, "가계부 예산 설정");
