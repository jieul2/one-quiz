import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Group from "@/models/Group";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 1. 내가 가입한 그룹 및 추천 스터디 그룹 목록
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    await dbConnect();

    // 내가 속한 그룹
    const myGroups = userEmail
      ? await Group.find({ "members.email": userEmail }).sort({ updatedAt: -1 }).lean()
      : [];

    // 추천/공개 스터디 그룹 (최근 10개)
    const publicGroups = await Group.find({}).sort({ createdAt: -1 }).limit(10).lean();

    return NextResponse.json({
      success: true,
      myGroups,
      publicGroups,
    });
  } catch (error) {
    console.error("GET /api/groups error:", error);
    return NextResponse.json(
      { error: "스터디 그룹 목록을 불러오지 못했습니다." },
      { status: 500 }
    );
  }
}

// 2. 신규 스터디 그룹 생성
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { name, description = "", category = "시험대비" } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "그룹 이름을 입력해주세요." }, { status: 400 });
    }

    await dbConnect();

    // 고유한 초대 코드 생성
    let inviteCode = generateInviteCode();
    let existing = await Group.findOne({ inviteCode });
    while (existing) {
      inviteCode = generateInviteCode();
      existing = await Group.findOne({ inviteCode });
    }

    const ownerEmail = session.user.email;
    const ownerName =
      session.user.name || (session.user.email ? session.user.email.split("@")[0] : "스터디장");

    const newGroup = await Group.create({
      name: name.trim(),
      description: description.trim(),
      category,
      ownerEmail,
      ownerName,
      inviteCode,
      members: [
        {
          email: ownerEmail,
          name: ownerName,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
      sharedItems: [
        {
          type: "quiz",
          title: "정보처리기사 1회 기출 오답노트",
          link: "/exam",
          sharedBy: ownerName,
          createdAt: new Date(),
        },
      ],
      channels: ["일반", "공지사항", "질문답변", "자료공유"],
    });

    return NextResponse.json({ success: true, group: newGroup }, { status: 201 });
  } catch (error) {
    console.error("POST /api/groups error:", error);
    return NextResponse.json(
      { error: "그룹 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
