import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Group from "@/models/Group";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    await dbConnect();

    const group = await Group.findById(id).lean();
    if (!group) {
      return NextResponse.json({ error: "그룹을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ success: true, group });
  } catch (error) {
    console.error("GET /api/groups/[id] error:", error);
    return NextResponse.json(
      { error: "그룹 정보를 불러오는 중 오류가 발생했습니다." },
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

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ error: "그룹을 찾을 수 없습니다." }, { status: 404 });
    }

    if (group.ownerEmail !== session.user.email && session.user.role !== "admin") {
      return NextResponse.json({ error: "그룹장만 삭제할 수 있습니다." }, { status: 403 });
    }

    await Group.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "그룹이 삭제되었습니다." });
  } catch (error) {
    console.error("DELETE /api/groups/[id] error:", error);
    return NextResponse.json(
      { error: "그룹 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
