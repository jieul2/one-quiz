import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Group from "@/models/Group";

// 그룹에 기능/학습 자료 공유
export async function POST(
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
    const { type, title, link } = body;

    if (!type || !title || !link) {
      return NextResponse.json(
        { error: "공유할 항목의 유형, 제목, 링크를 입력해주세요." },
        { status: 400 }
      );
    }

    await dbConnect();

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ error: "그룹을 찾을 수 없습니다." }, { status: 404 });
    }

    const userName =
      session.user.name || (session.user.email ? session.user.email.split("@")[0] : "학습자");

    group.sharedItems.unshift({
      type,
      title: title.trim(),
      link: link.trim(),
      sharedBy: userName,
      createdAt: new Date(),
    });

    await group.save();

    return NextResponse.json({
      success: true,
      message: "그룹에 학습 자료가 공유되었습니다.",
      sharedItems: group.sharedItems,
    });
  } catch (error) {
    console.error("POST /api/groups/[id]/share error:", error);
    return NextResponse.json(
      { error: "자료 공유 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
