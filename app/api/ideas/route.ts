import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import mongoose from 'mongoose';

const HistoryLogSchema = new mongoose.Schema({
  message: { type: String, required: true }, // 커밋 메시지
  changes: [{ // 구체적으로 어떤 필드가 바뀌었는지 담는 배열
    field: String,
    oldValue: String,
    newValue: String
  }],
  updatedAt: { type: Date, default: Date.now },
});

const IdeaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'idea' }, 
  priority: { type: String, default: 'medium' }, 
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  historyLogs: [HistoryLogSchema],
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
    
    const newDocData = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: body.status === 'completed' ? new Date() : null,
      historyLogs: [{ message: '✨ 최초 아이디어 생성', changes: [], updatedAt: new Date() }],
    };

    const newIdea = await Idea.create(newDocData);
    return NextResponse.json({ success: true, data: newIdea }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create idea' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, status, priority, title, description, commitMessage } = body;
    if (!_id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });

    const existing = await Idea.findById(_id);
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    // 변경된 필드 감지 (Diff 비교)
    const changes: any[] = [];
    if (existing.title !== title) {
      changes.push({ field: '제목 (Title)', oldValue: existing.title, newValue: title });
    }
    if (existing.description !== description) {
      changes.push({ field: '설명 (Description)', oldValue: existing.description || '(없음)', newValue: description || '(없음)' });
    }
    if (existing.status !== status) {
      changes.push({ field: '상태 (Status)', oldValue: existing.status, newValue: status });
    }
    if (existing.priority !== priority) {
      changes.push({ field: '우선순위 (Priority)', oldValue: existing.priority, newValue: priority });
    }

    const updateData: any = { title, description, status, priority, updatedAt: new Date() };

    // 완료일 처리
    if (status === 'completed' && existing.status !== 'completed') {
      updateData.completedAt = new Date();
    } else if (status !== 'completed') {
      updateData.completedAt = null;
    } else {
      updateData.completedAt = existing.completedAt || new Date();
    }

    const logMsg = commitMessage && commitMessage.trim() !== '' 
      ? commitMessage 
      : (changes.length > 0 ? changes.map(c => c.field).join(', ') + ' 수정' : '📝 문서 업데이트');

    const updated = await Idea.findByIdAndUpdate(
      _id,
      { 
        ...updateData,
        $push: { historyLogs: { message: logMsg, changes, updatedAt: new Date() } }
      },
      { returnDocument: 'after' }
    );

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