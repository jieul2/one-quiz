import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

const IdeaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'idea' }, // idea(아이디어), progress(개발중), completed(개발완료)
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

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updateData } = body;
    if (!_id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const updated = await Idea.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });
    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update idea' }, { status: 500 });
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