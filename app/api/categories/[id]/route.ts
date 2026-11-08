import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import { withAudit } from "@/lib/withAudit";

// 1. 카테고리 정보 수정 (관리자 전용)
export const PUT = withAudit(
  async (req: Request, context?: { params: Promise<{ id: string }> }) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session || session.user?.role !== "admin") {
        return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
      }

      if (!context?.params) {
        return NextResponse.json({ error: "파라미터가 유효하지 않습니다." }, { status: 400 });
      }

      const { id } = await context.params;
      const body = await req.json();
      const { name, description, color, order, isActive } = body;

      await dbConnect();

      const category = await Category.findById(id);
      if (!category) {
        return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
      }

      if (typeof name === "string" && name.trim()) {
        category.name = name.trim();
      }
      if (typeof description === "string") {
        category.description = description.trim();
      }
      if (typeof color === "string") {
        category.color = color;
      }
      if (typeof order === "number") {
        category.order = order;
      }
      if (typeof isActive === "boolean") {
        category.isActive = isActive;
      }

      await category.save();

      return NextResponse.json({ success: true, category });
    } catch (error) {
      console.error("PUT /api/categories/[id] error:", error);
      return NextResponse.json({ error: "카테고리 수정에 실패했습니다." }, { status: 500 });
    }
  }
);

// 2. 카테고리 삭제 (관리자 전용)
export const DELETE = withAudit(
  async (req: Request, context?: { params: Promise<{ id: string }> }) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session || session.user?.role !== "admin") {
        return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
      }

      if (!context?.params) {
        return NextResponse.json({ error: "파라미터가 유효하지 않습니다." }, { status: 400 });
      }

      const { id } = await context.params;

      await dbConnect();

      const deleted = await Category.findByIdAndDelete(id);
      if (!deleted) {
        return NextResponse.json({ error: "삭제할 카테고리를 찾을 수 없습니다." }, { status: 404 });
      }

      return NextResponse.json({ success: true, message: "카테고리가 삭제되었습니다." });
    } catch (error) {
      console.error("DELETE /api/categories/[id] error:", error);
      return NextResponse.json({ error: "카테고리 삭제에 실패했습니다." }, { status: 500 });
    }
  }
);
