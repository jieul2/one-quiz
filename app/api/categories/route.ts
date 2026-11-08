import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Category, { CategoryType } from "@/models/Category";
import { DEFAULT_CATEGORIES } from "@/lib/defaultCategories";
import { withAudit } from "@/lib/withAudit";

// 1. 카테고리 목록 조회 (특정 type 또는 전체)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as CategoryType | null;
    const includeInactive = searchParams.get("includeInactive") === "true";

    await dbConnect();

    // 특정 type이 지정된 경우
    if (type && DEFAULT_CATEGORIES[type]) {
      const query: Record<string, unknown> = { type };
      if (!includeInactive) {
        query.isActive = true;
      }

      let categories = await Category.find(query).sort({ order: 1, createdAt: 1 }).lean();

      // DB에 해당 type의 카테고리가 하나도 없다면 기본값 자동 시딩
      if (categories.length === 0) {
        const defaults = DEFAULT_CATEGORIES[type];
        const seedDocs = defaults.map((item) => ({
          type,
          name: item.name,
          slug: item.slug,
          description: item.description,
          color: item.color,
          order: item.order,
          isActive: true,
          isDefault: item.order === 1,
        }));

        await Category.insertMany(seedDocs, { ordered: false }).catch(() => {});
        categories = await Category.find(query).sort({ order: 1, createdAt: 1 }).lean();
      }

      return NextResponse.json({ success: true, categories });
    }

    // 전체 카테고리 조회 (관리자용)
    const query: Record<string, unknown> = {};
    if (!includeInactive) {
      query.isActive = true;
    }
    const categories = await Category.find(query).sort({ type: 1, order: 1, createdAt: 1 }).lean();

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { error: "카테고리 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

// 2. 신규 카테고리 등록 (관리자 전용)
export const POST = withAudit(async (req: Request) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { type, name, description = "", color = "primary", order = 0 } = body;

    if (!type || !name || !name.trim()) {
      return NextResponse.json(
        { error: "카테고리 유형과 이름을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    await dbConnect();

    // 슬러그 생성 (영어/숫자는 그대로, 한글은 타임스탬프 결합으로 유니크 보장)
    const baseSlug = name
      .trim()
      .toLowerCase()
      .replace(/[\s/\\_]+/g, "-")
      .replace(/[^a-z0-9가-힣-]/g, "");
    const slug = baseSlug ? `${baseSlug}-${Date.now().toString(36)}` : `cat-${Date.now().toString(36)}`;

    // 중복 체크
    const existing = await Category.findOne({ type, name: name.trim() });
    if (existing) {
      return NextResponse.json(
        { error: "동일한 유형에 이미 존재하는 카테고리 이름입니다." },
        { status: 409 }
      );
    }

    const newCategory = await Category.create({
      type,
      name: name.trim(),
      slug,
      description: description.trim(),
      color,
      order: Number(order) || 0,
      isActive: true,
      isDefault: false,
    });

    return NextResponse.json({ success: true, category: newCategory }, { status: 201 });
  } catch (error) {
    console.error("POST /api/categories error:", error);
    return NextResponse.json(
      { error: "카테고리를 등록하지 못했습니다." },
      { status: 500 }
    );
  }
});
