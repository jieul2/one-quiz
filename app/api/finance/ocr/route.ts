import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withAudit } from "@/lib/withAudit";

// POST: 영수증 사진/텍스트 자동 OCR 파싱 시뮬레이터 및 데이터 추출
async function handlePost(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const { imageUrl, mockSample, receiptType } = body;

    // 모의 샘플 영수증 또는 이미지 기반 자동 파싱
    const samples = [
      {
        merchant: "스타벅스 강남대로점",
        amount: 12300,
        totalAmount: 12300,
        date: new Date().toISOString().slice(0, 10),
        category: "카페/간식",
        tags: ["#커피", "#스타벅스", "#디저트"],
        items: ["아이스 아메리카노 T (4,500원)", "클라우드 치즈케이크 (7,800원)"],
        paymentMethod: "카드",
        confidence: 0.98,
      },
      {
        merchant: "이마트 역삼점",
        amount: 45800,
        totalAmount: 45800,
        date: new Date().toISOString().slice(0, 10),
        category: "식비",
        tags: ["#장보기", "#이마트", "#생필품"],
        items: ["서울우유 1L (2,980원)", "포스트 아몬드 후레이크 (6,800원)", "신선 삼겹살 (18,900원)", "친환경 주방세제 (4,120원)"],
        paymentMethod: "카드",
        confidence: 0.95,
      },
      {
        merchant: "맛있는 삼겹살 역삼점",
        amount: 38000,
        totalAmount: 38000,
        date: new Date().toISOString().slice(0, 10),
        category: "식비",
        tags: ["#저녁외식", "#삼겹살", "#회식"],
        items: ["생삼겹살 2인분 (32,000원)", "차돌된장찌개 (6,000원)"],
        paymentMethod: "카드",
        confidence: 0.96,
      },
      {
        merchant: "GS칼텍스 셀프주유소",
        amount: 70000,
        totalAmount: 70000,
        date: new Date().toISOString().slice(0, 10),
        category: "교통",
        tags: ["#주유", "#교통비", "#고정비"],
        items: ["휘발유 42.16L (70,000원)"],
        paymentMethod: "카드",
        confidence: 0.99,
      },
    ];

    let result = samples[0];
    if (receiptType === "cafe") result = samples[0];
    else if (receiptType === "mart") result = samples[1];
    else if (receiptType === "restaurant") result = samples[2];
    else if (receiptType === "fuel") result = samples[3];
    else if (mockSample !== undefined) result = samples[Number(mockSample) % samples.length];
    else result = samples[Math.floor(Math.random() * samples.length)];

    return NextResponse.json(
      {
        success: true,
        extracted: result,
        ocrResult: result,
        imageUrl: imageUrl || "",
        message: `'${result.merchant}' 영수증 분석이 완료되었습니다. (인식 신뢰도: ${Math.round(result.confidence * 100)}%)`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/finance/ocr error:", error);
    return NextResponse.json({ error: "영수증 OCR 분석 실패" }, { status: 500 });
  }
}

export const POST = withAudit(handlePost, "영수증 OCR 자동 인식");
