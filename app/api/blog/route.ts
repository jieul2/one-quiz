import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

// 1. 블로그 아티클 목록 조회 (카테고리, 태그, 검색)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");
    const limit = Number(searchParams.get("limit")) || 20;

    await dbConnect();

    const query: Record<string, unknown> = { isPublished: true };
    if (category && category !== "전체") {
      query.category = category;
    }
    if (tag) {
      query.tags = tag;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const posts = await BlogPost.find(query).sort({ createdAt: -1 }).limit(limit).lean();

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error("GET /api/blog error:", error);
    return NextResponse.json(
      { error: "블로그 글 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

// 2. 새 블로그 아티클 등록
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { title, excerpt = "", content, category = "공부법", tags = [] } = body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json(
        { error: "제목과 본문 내용을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const authorEmail = session.user.email;
    const authorName =
      session.user.name || (session.user.email ? session.user.email.split("@")[0] : "에디터");

    // 슬러그 생성 (영문/숫자/한글 기반 + 타임스탬프)
    const baseSlug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, "")
      .replace(/\s+/g, "-");
    const slug = `${baseSlug || "post"}-${Date.now().toString(36)}`;

    // 예상 읽기 시간 계산 (분당 약 400자 기준)
    const readTime = Math.max(1, Math.round(content.length / 400));

    await dbConnect();

    const newPost = await BlogPost.create({
      authorEmail,
      authorName,
      title: title.trim(),
      slug,
      excerpt: excerpt.trim() || (typeof content === "string" ? content.slice(0, 120) : ""),
      content: content.trim(),
      category,
      tags: Array.isArray(tags) ? tags : [],
      readTime,
      views: 0,
      likes: [],
      isPublished: true,
    });

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (error) {
    console.error("POST /api/blog error:", error);
    return NextResponse.json(
      { error: "아티클 발행 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
