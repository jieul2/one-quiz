import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  image: { type: String },
  role: { type: String, default: 'user' }, // 'admin' 또는 'user'
  lastLoginAt: { type: Date, default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export async function GET() {
  try {
    await dbConnect();
    const users = await User.find({}).sort({ lastLoginAt: -1 });
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const { _id, role } = await req.json();
    if (!_id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const updated = await User.findByIdAndUpdate(_id, { role }, { returnDocument: 'after' });
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}