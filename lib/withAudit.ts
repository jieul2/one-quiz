import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createAuditLog } from '@/lib/logger';

export function withAudit(handler: Function, actionDescription?: string) {
  return async function (request: Request, context?: any) {
    const startTime = Date.now();
    const session = await getServerSession();
    const email = session?.user?.email || 'anonymous';
    const method = request.method as 'GET' | 'POST' | 'PUT' | 'DELETE';
    const endpoint = new URL(request.url).pathname;
    
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    let statusCode = 200;
    let errorMessage = '';

    try {
      // 실제 API 핸들러 실행
      const response = await handler(request, context);
      statusCode = response.status || 200;

      const responseTime = Date.now() - startTime;
      
      // 성공 로그 기록
      await createAuditLog({
        email,
        method,
        endpoint,
        statusCode,
        level: method === 'GET' ? 'INFO' : 'SECURITY',
        ip,
        userAgent,
        responseTime,
        message: actionDescription || `[${method}] ${endpoint} 요청 성공`,
      });

      return response;
    } catch (error: any) {
      statusCode = 500;
      errorMessage = error.message || 'Unknown error';
      const responseTime = Date.now() - startTime;

      // 에러 발생 로그 기록
      await createAuditLog({
        email,
        method,
        endpoint,
        statusCode,
        level: 'ERROR',
        ip,
        userAgent,
        responseTime,
        message: `[오류 발생] ${endpoint} - ${errorMessage}`,
      });

      return NextResponse.json({ error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
    }
  };
}