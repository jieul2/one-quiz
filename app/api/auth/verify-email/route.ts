import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

const verificationCodes = new Map<string, { code: string; expires: number }>();

// 1. 인증 번호 전송 (POST)
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "올바른 이메일 형식이 아닙니다." }, { status: 400 });
    }

    await dbConnect();
    const db = mongoose.connection.db;
    const usersCollection = db?.collection("users");

    // 👈 1. 이미 다른 유저가 사용 중인 이메일인지 중복 검사
    if (usersCollection) {
      const existingUser = await usersCollection.findOne({ email: email.trim() });
      if (existingUser) {
        return NextResponse.json(
          { error: "이미 다른 계정에 등록되어 있는 이메일입니다." },
          { status: 400 },
        );
      }
    }

    // 6자리 랜덤 인증 번호 생성
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 3 * 60 * 1000; // 유효기간 3분

    verificationCodes.set(email, { code: verificationCode, expires });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"oneQuiz" <${process.env.EMAIL_SERVER_USER}>`,
      to: email,
      subject: "[oneQuiz] 이메일 주소 인증 번호 안내",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #ca8a04;">oneQuiz 이메일 인증</h2>
          <p>서비스 이용을 위한 인증 번호 6자리입니다.</p>
          <div style="background: #f4f4f4; padding: 15px; font-size: 24px; font-weight: bold; text-align: center; letter-spacing: 5px; border-radius: 5px;">
            ${verificationCode}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 15px;">본 인증 번호는 3분 동안만 유효합니다.</p>
        </div>
      `,
    });

    return NextResponse.json(
      { success: true, message: "인증 번호가 발송되었습니다." },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "이메일 발송에 실패했습니다. 환경 변수를 확인해주세요." },
      { status: 500 },
    );
  }
}

// 2. 인증 번호 검증 및 최종 등록 (PUT)
export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "인증되지 않은 사용자입니다." }, { status: 401 });
    }

    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json(
        { error: "이메일과 인증 번호를 모두 입력해주세요." },
        { status: 400 },
      );
    }

    await dbConnect();
    const db = mongoose.connection.db;
    const usersCollection = db?.collection("users");

    // 👈 2. 최종 등록 시점에도 중복 여부 재확인
    if (usersCollection) {
      const existingUser = await usersCollection.findOne({ email: email.trim() });
      if (existingUser) {
        return NextResponse.json(
          { error: "이미 다른 계정에 등록되어 있는 이메일입니다." },
          { status: 400 },
        );
      }
    }

    const record = verificationCodes.get(email);
    if (!record) {
      return NextResponse.json(
        { error: "인증 요청 기록이 없거나 만료되었습니다. 다시 시도해주세요." },
        { status: 400 },
      );
    }

    if (Date.now() > record.expires) {
      verificationCodes.delete(email);
      return NextResponse.json(
        { error: "인증 시간이 만료되었습니다. 다시 요청해주세요." },
        { status: 400 },
      );
    }

    if (record.code !== code.trim()) {
      return NextResponse.json({ error: "인증 번호가 일치하지 않습니다." }, { status: 400 });
    }

    verificationCodes.delete(email);

    if (usersCollection) {
      const identifier = session.user.email || session.user.name;
      await usersCollection.updateOne(
        { $or: [{ email: identifier }, { name: identifier }] },
        { $set: { email: email } },
      );
    }

    return NextResponse.json(
      { success: true, message: "이메일 인증 및 등록 완료" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
