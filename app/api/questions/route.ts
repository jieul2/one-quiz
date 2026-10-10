import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Question from '@/models/Question';

export async function GET() {
  try {
    await dbConnect();
    const questions = await Question.find({}).sort({ subject: 1, examType: 1, questionNumber: 1 });
    return NextResponse.json(questions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const newQuestion = await Question.create(body);
    return NextResponse.json({ success: true, data: newQuestion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create question' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const resetAll = searchParams.get('resetAll');

    // 전체 풀이 기록 초기화 요청 처리
    if (resetAll === 'true') {
      await Question.updateMany({}, { $set: { history: [] } });
      return NextResponse.json({ success: true, message: 'All histories reset' }, { status: 200 });
    }

    if (!id) return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });
    await Question.findByIdAndDelete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete or reset' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, ...updateData } = body;
    if (!_id) return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });
    
    const updatedQuestion = await Question.findByIdAndUpdate(_id, updateData, { returnDocument: 'after' });
    return NextResponse.json({ success: true, data: updatedQuestion }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update question' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { _id, isCorrect } = body;
    
    if (!_id) return NextResponse.json({ success: false, error: 'Question ID is required' }, { status: 400 });

    const updatedQuestion = await Question.findByIdAndUpdate(
      _id,
      { $push: { history: { isCorrect, timestamp: new Date() } } },
      { returnDocument: 'after' }
    );
    return NextResponse.json({ success: true, data: updatedQuestion }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to record history' }, { status: 500 });
  }
}