import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { Transaction } from "@/models/Finance";
import { withAudit } from "@/lib/withAudit";

// GET: 가계부 거래 내역 조회
async function handleGet(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(request.url);
    const monthKey = searchParams.get("monthKey"); // "2026-11"
    const scope = searchParams.get("scope") || "personal";
    const type = searchParams.get("type"); // "expense" | "income" | "transfer"
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");

    const query: Record<string, unknown> = { userEmail, scope };

    if (monthKey) {
      query.date = { $regex: `^${monthKey}` };
    }
    if (type) {
      query.type = type;
    }
    if (category && category !== "all") {
      query.category = category;
    }
    if (tag) {
      query.tags = tag;
    }

    const transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 }).lean();

    return NextResponse.json(transactions, { status: 200 });
  } catch (error) {
    console.error("GET /api/finance/transactions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "내역 조회 실패" },
      { status: 500 }
    );
  }
}

// POST: 신규 가계부 거래 등록
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
      scope = "personal",
      groupId,
      type,
      amount,
      category,
      isRecurring = false,
      recurringCycle,
      date,
      title,
      memo,
      tags = [],
      images = [],
      paymentMethod = "카드",
      ocrData,
      splitMembers = [],
    } = body;

    if (!type || amount === undefined || !category || !date || !title) {
      return NextResponse.json({ error: "필수 항목(유형, 금액, 분류, 날짜, 내용)을 입력해주세요." }, { status: 400 });
    }

    const newTransaction = await Transaction.create({
      userEmail,
      scope,
      groupId,
      type,
      amount: Number(amount),
      category,
      isRecurring: Boolean(isRecurring),
      recurringCycle,
      date,
      title: title.trim(),
      memo: memo?.trim(),
      tags: Array.isArray(tags) ? tags : [],
      images: Array.isArray(images) ? images : [],
      paymentMethod,
      ocrData,
      payerEmail: userEmail,
      splitMembers,
    });

    return NextResponse.json(newTransaction, { status: 201 });
  } catch (error) {
    console.error("POST /api/finance/transactions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "거래 내역 저장 실패" },
      { status: 500 }
    );
  }
}

// PUT: 거래 내역 수정 (날짜 캘린더 드래그앤드롭 변경 등)
async function handlePut(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "수정할 항목 ID가 필요합니다." }, { status: 400 });
    }

    const updated = await Transaction.findOneAndUpdate(
      { _id: id, userEmail },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!updated) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("PUT /api/finance/transactions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "거래 내역 수정 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 거래 내역 삭제
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
      return NextResponse.json({ error: "삭제할 항목 ID가 필요합니다." }, { status: 400 });
    }

    const deleted = await Transaction.findOneAndDelete({ _id: id, userEmail });
    if (!deleted) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "삭제 완료" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/finance/transactions error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "거래 내역 삭제 실패" },
      { status: 500 }
    );
  }
}

export const GET = withAudit(handleGet, "가계부 내역 조회");
export const POST = withAudit(handlePost, "가계부 거래 등록");
export const PUT = withAudit(handlePut, "가계부 거래 수정");
export const DELETE = withAudit(handleDelete, "가계부 거래 삭제");
