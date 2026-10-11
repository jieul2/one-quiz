import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';
import { withAudit } from '@/lib/withAudit';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  image: { type: String },
  role: { type: String, default: 'user' }, // 'admin' 또는 'user'
  lastLoginAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// 1. 회원 목록 조회
async function handleGet() {
  await dbConnect();
  const users = await User.find({}).sort({ lastLoginAt: -1 });
  return NextResponse.json(users, { status: 200 });
}

// 2. 회원 권한(Role) 변경
async function handlePut(req: Request) {
  await dbConnect();
  const { _id, role } = await req.json();
  if (!_id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

  const updated = await User.findByIdAndUpdate(_id, { role }, { returnDocument: 'after' });
  return NextResponse.json({ success: true, data: updated }, { status: 200 });
}

// withAudit 래퍼를 적용하여 회원 목록 조회 및 권한 변경 작업이 감사 로그에 자동으로 수집됨
export const GET = withAudit(handleGet, '전체 회원 목록 조회');
export const PUT = withAudit(handlePut, '사용자 권한(Role) 변경');