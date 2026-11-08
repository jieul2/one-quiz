import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import BlogPost from "@/models/BlogPost";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    await dbConnect();

    // id 또는 slug로 검색
    const isObjectId = id.match(/^[0-9a-fA-F]{24}$/);
    const filter = isObjectId ? { _id: id } : { slug: id };

    const post = await BlogPost.findOneAndUpdate(
      filter,
      { $inc: { views: 1 } },
      { new: true, returnDocument: "after" }
    ).lean();

    if (!post) {
      return NextResponse.json({ error: "아티클을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("GET /api/blog/[id] error:", error);
    return NextResponse.json(
      { error: "아티클 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

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
    const { action } = body;

    await dbConnect();

    const post = await BlogPost.findById(id);
    if (!post) {
      return NextResponse.json({ error: "아티클을 찾을 수 없습니다." }, { status: 404 });
    }

    if (action === "toggle_like") {
      const userEmail = session.user.email;
      const idx = post.likes.indexOf(userEmail);
      if (idx > -1) {
        post.likes.splice(idx, 1);
      } else {
        post.likes.push(userEmail);
      }
      await post.save();
      return NextResponse.json({ success: true, likes: post.likes });
    }

    return NextResponse.json({ error: "지원하지 않는 액션입니다." }, { status: 400 });
  } catch (error) {
    console.error("PUT /api/blog/[id] error:", error);
    return NextResponse.json(
      { error: "아티클 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

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

    const post = await BlogPost.findById(id);
    if (!post) {
      return NextResponse.json({ error: "아티클을 찾을 수 없습니다." }, { status: 404 });
    }

    if (post.authorEmail !== session.user.email && session.user.role !== "admin") {
      return NextResponse.json({ error: "작성자 또는 관리자만 삭제할 수 있습니다." }, { status: 403 });
    }

    await BlogPost.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "아티클이 삭제되었습니다." });
  } catch (error) {
    console.error("DELETE /api/blog/[id] error:", error);
    return NextResponse.json(
      { error: "아티클 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
