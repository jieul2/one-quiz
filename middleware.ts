import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 1. 이메일 정보가 없는 유저 감지 (소셜 로그인 등에서 이메일 미제공 시)
    // 단, 이미 이메일 입력 페이지(/auth/input-email)에 있는 경우는 무한 리다이렉트 방지를 위해 제외
    if (token && !token.email && !path.startsWith("/auth/input-email")) {
      return NextResponse.redirect(new URL("/auth/input-email", req.url));
    }

    // 2. 관리자 권한이 필요한 하위 페이지(/admin/questions 등) 접근 시 검증
    if (path.startsWith("/admin/") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
    },
  },
);

export const config = {
  // 👈 이메일 입력 페이지(/auth/input-email)와 보호가 필요한 페이지들을 매치에 포함시킵니다.
  matcher: ["/admin/:path*", "/diary/:path*", "/exam/:path*", "/auth/input-email"],
};
