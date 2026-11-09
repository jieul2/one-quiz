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
    const { imageUrl, mockSample } = body;

    // 모의 샘플 영수증 또는 이미지 기반 자동 파싱
    const samples = [
      {
        merchant: "스타벅스 강남대로점",
        amount: 11400,
        date: new Date().toISOString().slice(0, 10),
        category: "카페/간식",
        tags: ["#커피", "#스타벅스", "#직장인"],
        items: ["아메리카노 T (4,500원)", "바닐라라떼 G (6,900원)"],
        paymentMethod: "신용카드",
        confidence: 0.98,
      },
      {
        merchant: "이마트 역삼점",
        amount: 48900,
        date: new Date().toISOString().slice(0, 10),
        category: "식비",
        tags: ["#장보기", "#이마트", "#생필품"],
        items: ["신선 계란 30구 (7,980원)", "서울우유 1L (2,980원)", "삼겹살 600g (16,800원)", "채소/라면류 (21,140원)"],
        paymentMethod: "신용카드",
        confidence: 0.95,
      },
      {
        merchant: "GS칼텍스 주유소",
        amount: 70000,
        date: new Date().toISOString().slice(0, 10),
        category: "교통",
        tags: ["#주유", "#교통비", "#고정비"],
        items: ["휘발유 42.16L (70,000원)"],
        paymentMethod: "신용카드",
        confidence: 0.99,
      },
      {
        merchant: "배달의민족 (BBQ치킨)",
        amount: 27000,
        date: new Date().toISOString().slice(0, 10),
        category: "식비",
        tags: ["#야식", "#배달", "#치킨"],
        items: ["황금올리브치킨 (23,000원)", "배달팁 (4,000원)"],
        paymentMethod: "카카오페이",
        confidence: 0.97,
      },
    ];

    const randomIndex = Math.floor(Math.random() * samples.length);
    const result = samples[mockSample !== undefined ? Number(mockSample) % samples.length : randomIndex];

    return NextResponse.json(
      {
        success: true,
        extracted: result,
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
