import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

// 아이디어를 위한 임시/전용 스키마 정의 (없으면 자동 생성됨)
const IdeaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'planned' }, // planned(예정), progress(진행중), completed(완료)
  createdAt: { type: Date, default: Date.now },
});

const Idea = mongoose.models.Idea || mongoose.model('Idea', IdeaSchema);

export async function GET() {
  try {
    await dbConnect();
    const ideas = await Idea.find({}).sort({ createdAt: -1 });
    return NextResponse.json(ideas, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const newIdea = await Idea.create(body);
    return NextResponse.json({ success: true, data: newIdea }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create idea' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    await Idea.findByIdAndDelete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete idea' }, { status: 500 });
  }
}