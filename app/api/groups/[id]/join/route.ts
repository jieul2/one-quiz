import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Group from "@/models/Group";

// 초대 코드로 그룹 가입
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
    const { inviteCode } = body;

    await dbConnect();

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ error: "그룹을 찾을 수 없습니다." }, { status: 404 });
    }

    // 초대코드 검증
    if (inviteCode && group.inviteCode !== inviteCode.trim().toUpperCase()) {
      return NextResponse.json({ error: "초대 코드가 일치하지 않습니다." }, { status: 400 });
    }

    // 이미 가입된 멤버인지 확인
    const alreadyMember = group.members.some(
      (m: { email: string }) => m.email === session.user.email
    );

    if (alreadyMember) {
      return NextResponse.json({ success: true, message: "이미 가입된 그룹입니다.", group });
    }

    const userName =
      session.user.name || (session.user.email ? session.user.email.split("@")[0] : "학습자");

    group.members.push({
      email: session.user.email,
      name: userName,
      role: "member",
      joinedAt: new Date(),
    });

    await group.save();

    return NextResponse.json({ success: true, message: "그룹에 성공적으로 가입했습니다.", group });
  } catch (error) {
    console.error("POST /api/groups/[id]/join error:", error);
    return NextResponse.json(
      { error: "그룹 가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
