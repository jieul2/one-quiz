import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Category, { CategoryType } from "@/models/Category";
import { DEFAULT_CATEGORIES } from "@/lib/defaultCategories";
import { withAudit } from "@/lib/withAudit";

// 기본 카테고리 전체 복원 (관리자 전용)
export const POST = withAudit(async (req: Request) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as CategoryType | null;

    if (!type || !DEFAULT_CATEGORIES[type]) {
      return NextResponse.json({ error: "유효한 카테고리 유형이 아닙니다." }, { status: 400 });
    }

    await dbConnect();

    // 기존 카테고리 삭제 후 기본값 재삽입
    await Category.deleteMany({ type });

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

    const inserted = await Category.insertMany(seedDocs);

    return NextResponse.json({
      success: true,
      message: `'${type}' 기본 카테고리가 복원되었습니다.`,
      categories: inserted,
    });
  } catch (error) {
    console.error("POST /api/categories/reset error:", error);
    return NextResponse.json({ error: "기본 카테고리 복원에 실패했습니다." }, { status: 500 });
  }
});
