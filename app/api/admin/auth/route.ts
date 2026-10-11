import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { withAudit } from '@/lib/withAudit';

// 관리자 비밀번호 검증 핸들러
async function handlePost(req: Request) {
  const session = await getServerSession();
  const { password } = await req.json();
  const adminPass = process.env.ADMIN_PASS || '1234'; // 설정되지 않은 경우 기본값

  if (password === adminPass) {
    return NextResponse.json({ success: true }, { status: 200 });
  } else {
    // 비밀번호 불일치 시 401 반환 (withAudit이 자동으로 에러 상태 코드와 함께 감사 로그 기록)
    return NextResponse.json({ success: false, error: '비밀번호가 일치하지 않습니다.' }, { status: 401 });
  }
}

// withAudit으로 래핑하여 export (시도한 사용자 이메일과 성공/실패 여부가 로그에 자동 수집됨)
export const POST = withAudit(handlePost, '관리자 비밀번호 인증 시도');