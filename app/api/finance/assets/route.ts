import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { FinanceAsset } from "@/models/Finance";
import { withAudit } from "@/lib/withAudit";

// GET: 사용자의 전체 자산 및 순자산(Net Worth) 계산
async function handleGet() {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const assets = await FinanceAsset.find({ userEmail }).sort({ createdAt: -1 }).lean();

    let totalSavings = 0;
    let totalRealEstate = 0;
    let totalStock = 0;
    let totalInsuranceMonthly = 0;
    let totalLoan = 0;
    let totalLoanMonthly = 0;

    assets.forEach((a) => {
      if (a.type === "savings") totalSavings += a.amount;
      else if (a.type === "real_estate") totalRealEstate += a.amount;
      else if (a.type === "stock") totalStock += a.amount;
      else if (a.type === "loan") {
        totalLoan += a.amount;
        totalLoanMonthly += a.monthlyPayment || 0;
      } else if (a.type === "insurance") {
        totalInsuranceMonthly += a.monthlyPayment || a.amount;
      }
    });

    const grossAssets = totalSavings + totalRealEstate + totalStock;
    const netWorth = grossAssets - totalLoan;

    return NextResponse.json(
      {
        assets,
        summary: {
          grossAssets,
          netWorth,
          totalSavings,
          totalRealEstate,
          totalStock,
          totalLoan,
          totalLoanMonthly,
          totalInsuranceMonthly,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/finance/assets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "자산 목록 조회 실패" },
      { status: 500 }
    );
  }
}

// POST: 신규 자산/부채 등록
async function handlePost(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const {
      id,
      type,
      name,
      institution,
      amount,
      monthlyPayment = 0,
      interestRate = 0,
      repaymentType = "equal_principal_interest",
      startDate,
      endDate,
      memo,
    } = body;

    if (!type || !name || amount === undefined) {
      return NextResponse.json({ error: "자산 유형, 이름, 금액을 입력해주세요." }, { status: 400 });
    }

    let saved;
    if (id) {
      saved = await FinanceAsset.findOneAndUpdate(
        { _id: id, userEmail },
        {
          $set: {
            type,
            name: name.trim(),
            institution: institution?.trim(),
            amount: Number(amount),
            monthlyPayment: Number(monthlyPayment),
            interestRate: Number(interestRate),
            repaymentType,
            startDate,
            endDate,
            memo: memo?.trim(),
          },
        },
        { returnDocument: "after" }
      );
    } else {
      saved = await FinanceAsset.create({
        userEmail,
        type,
        name: name.trim(),
        institution: institution?.trim(),
        amount: Number(amount),
        monthlyPayment: Number(monthlyPayment),
        interestRate: Number(interestRate),
        repaymentType,
        startDate,
        endDate,
        memo: memo?.trim(),
      });
    }

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("POST /api/finance/assets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "자산 등록 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 자산 삭제
async function handleDelete(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "삭제할 자산 ID가 필요합니다." }, { status: 400 });
    }

    const deleted = await FinanceAsset.findOneAndDelete({ _id: id, userEmail });
    if (!deleted) {
      return NextResponse.json({ error: "자산 정보를 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "자산이 삭제되었습니다." }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/finance/assets error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "자산 삭제 실패" },
      { status: 500 }
    );
  }
}

export const GET = withAudit(handleGet, "자산 및 순자산 조회");
export const POST = withAudit(handlePost, "자산 등록 및 수정");
export const DELETE = withAudit(handleDelete, "자산 삭제");
