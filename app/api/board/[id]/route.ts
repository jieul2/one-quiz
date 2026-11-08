import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CommunityPost from "@/models/CommunityPost";

// 1. 단건 상세 조회 (조회수 +1)
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    await dbConnect();

    const post = await CommunityPost.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true, returnDocument: "after" }
    ).lean();

    if (!post) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("GET /api/board/[id] error:", error);
    return NextResponse.json(
      { error: "게시글 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 2. 좋아요 및 댓글 등록 (PUT)
export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await req.json();
    const { action, commentText } = body;

    await dbConnect();

    const post = await CommunityPost.findById(id);
    if (!post) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    const userEmail = session.user.email;
    const userName =
      session.user.name || (session.user.email ? session.user.email.split("@")[0] : "학습자");

    if (action === "toggle_like") {
      const idx = post.likes.indexOf(userEmail);
      if (idx > -1) {
        post.likes.splice(idx, 1);
      } else {
        post.likes.push(userEmail);
      }
      await post.save();
      return NextResponse.json({ success: true, likes: post.likes });
    }

    if (action === "add_comment") {
      if (!commentText || !commentText.trim()) {
        return NextResponse.json({ error: "댓글 내용을 입력해주세요." }, { status: 400 });
      }

      post.comments.push({
        id: String(Date.now()),
        authorEmail: userEmail,
        authorName: userName,
        content: commentText.trim(),
        createdAt: new Date(),
      });

      await post.save();
      return NextResponse.json({ success: true, comments: post.comments });
    }

    return NextResponse.json({ error: "지원하지 않는 액션입니다." }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/board/[id] error:", error);
    return NextResponse.json(
      { error: "게시글 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 3. 게시글 삭제
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await props.params;
    await dbConnect();

    const post = await CommunityPost.findById(id);
    if (!post) {
      return NextResponse.json({ error: "게시글을 찾을 수 없습니다." }, { status: 404 });
    }

    if (post.authorEmail !== session.user.email && session.user.role !== "admin") {
      return NextResponse.json({ error: "작성자 또는 관리자만 삭제할 수 있습니다." }, { status: 403 });
    }

    await CommunityPost.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "게시글이 삭제되었습니다." });
  } catch (error) {
    console.error("DELETE /api/board/[id] error:", error);
    return NextResponse.json(
      { error: "게시글 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
