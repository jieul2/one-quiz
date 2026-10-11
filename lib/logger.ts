import dbConnect from '@/lib/mongodb';
import AuditLog from '@/models/AuditLog';

export async function createAuditLog({
  email = 'anonymous',
  method,
  endpoint,
  statusCode = 200,
  level = 'INFO',
  ip = '127.0.0.1',
  userAgent = 'Unknown',
  responseTime = 0,
  message,
}: {
  email?: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  statusCode?: number;
  level?: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  ip?: string;
  userAgent?: string;
  responseTime?: number;
  message: string;
}) {
  try {
    await dbConnect();
    await AuditLog.create({
      email,
      method,
      endpoint,
      statusCode,
      level,
      ip,
      userAgent,
      responseTime,
      message,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Audit Log Generation Error:', error);
  }
}