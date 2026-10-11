import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';

// GET: 페이지네이션 파라미터(page, limit)를 받아 DB에서 필요한 구간만 조회
export async function GET(request: Request) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const query = email && email !== 'ALL' ? { email } : {};
    
    // 전체 일치하는 문서 개수 계산 (페이지네이션 계산용)
    const total = await AuditLog.countDocuments(query);

    // skip과 limit을 적용하여 해당 페이지 데이터만 조회
    const skip = (page - 1) * limit;
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json({ error: '로그를 불러오지 못했습니다.' }, { status: 500 });
  }
}

// POST: 새로운 감사 로그 수집 및 기록
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    const { userId, email, method, endpoint, statusCode, level, ip, userAgent, responseTime, message } = body;

    const newLog = await AuditLog.create({
      userId,
      email: email || 'anonymous',
      method: method || 'GET',
      endpoint: endpoint || '/',
      statusCode: statusCode || 200,
      level: level || 'INFO',
      ip: ip || request.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: userAgent || request.headers.get('user-agent') || 'Unknown',
      responseTime: responseTime || 0,
      message: message || 'System activity',
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, logId: newLog._id }, { status: 201 });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return NextResponse.json({ error: '로그 기록 실패' }, { status: 500 });
  }
}