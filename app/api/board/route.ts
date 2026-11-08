import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CommunityPost from "@/models/CommunityPost";

// 1. 게시판 글 목록 조회 (카테고리, 검색어, 정렬)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "latest"; // latest or popular
    const limit = Number(searchParams.get("limit")) || 30;

    await dbConnect();

    const query: Record<string, unknown> = {};
    if (category && category !== "전체") {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const sortOption: Record<string, 1 | -1> =
      sort === "popular" ? { views: -1, createdAt: -1 } : { createdAt: -1 };

    const posts = await CommunityPost.find(query).sort(sortOption).limit(limit).lean();

    return NextResponse.json({ success: true, posts });
  } catch (error) {
    console.error("GET /api/board error:", error);
    return NextResponse.json(
      { error: "게시글 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

// 2. 새 게시글 등록
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { category = "자유", title, content, tags = [], linkedCalendarDate } = body;

    if (!title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json(
        { error: "제목과 본문 내용을 모두 입력해주세요." },
        { status: 400 }
      );
    }

    const authorEmail = session.user.email;
    const authorName =
      session.user.name || (session.user.email ? session.user.email.split("@")[0] : "학습자");

    await dbConnect();

    const newPost = await CommunityPost.create({
      authorEmail,
      authorName,
      category,
      title: title.trim(),
      content: content.trim(),
      tags: Array.isArray(tags) ? tags : [],
      linkedCalendarDate: linkedCalendarDate || null,
      views: 0,
      likes: [],
      comments: [],
    });

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });
  } catch (error) {
    console.error("POST /api/board error:", error);
    return NextResponse.json(
      { error: "게시글 등록 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
