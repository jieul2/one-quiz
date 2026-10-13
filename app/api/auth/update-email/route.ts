import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "올바른 이메일이 아닙니다." }, { status: 400 });
    }

    await dbConnect();
    const db = mongoose.connection.db;

    // NextAuth 기본 User 컬렉션에서 현재 사용자의 id 또는 기존 이메일로 검색하여 업데이트
    // (NextAuth Adapter 설정에 따라 컬렉션명이 'users'일 수 있습니다)
    const usersCollection = db?.collection("users");

    if (usersCollection) {
      // session에 들어있는 고유 identifier(name 혹은 sub 등)나 기존 email로 찾음
      const identifier = session.user.email || session.user.name;

      await usersCollection.updateOne(
        { $or: [{ email: identifier }, { name: identifier }] },
        { $set: { email: email } },
      );
    }

    return NextResponse.json(
      { success: true, message: "이메일이 성공적으로 등록되었습니다." },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
