import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Contact from "@/models/Contact";
import { withAudit } from "@/lib/withAudit";

// 1. 연락처 목록 조회
async function handleGet() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const contacts = await Contact.find({ authorEmail: session.user.email }).sort({
    createdAt: -1,
  });

  return NextResponse.json(contacts, { status: 200 });
}

// 2. 연락처 저장 (배치 또는 단일)
async function handlePost(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const body = await req.json();

  if (Array.isArray(body)) {
    await Contact.deleteMany({ authorEmail: session.user.email });
    const docs = body.map((c) => ({
      authorEmail: session.user.email,
      id: c.id || `cnt-${Date.now()}-${Math.random()}`,
      name: c.name,
      email: c.email || "",
      phone: c.phone || "",
      role: c.role || "팀원",
      label: c.label || "팀원",
    }));
    const created = await Contact.insertMany(docs);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  }

  const created = await Contact.create({
    authorEmail: session.user.email,
    id: body.id || `cnt-${Date.now()}`,
    name: body.name,
    email: body.email || "",
    phone: body.phone || "",
    role: body.role || "팀원",
    label: body.label || "팀원",
  });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

// 3. 연락처 삭제
async function handleDelete(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { success: false, error: "인증되지 않은 사용자입니다." },
      { status: 401 }
    );
  }

  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { success: false, error: "삭제할 id가 필요합니다." },
      { status: 400 }
    );
  }

  await Contact.deleteOne({ authorEmail: session.user.email, id });
  return NextResponse.json({ success: true }, { status: 200 });
}

export const GET = withAudit(handleGet, "연락처 목록 조회");
export const POST = withAudit(handlePost, "연락처 저장/동기화");
export const DELETE = withAudit(handleDelete, "연락처 항목 삭제");
