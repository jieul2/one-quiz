import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // 1. 이미 로그인된 상태에서 로그인 페이지 접근 시 이전 목적지 또는 홈으로 리다이렉트
    if (token && path === "/auth/signin") {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "/";
      return NextResponse.redirect(new URL(callbackUrl, req.url));
    }

    // 2. 이메일 정보가 없는 유저 감지 (소셜 로그인 등에서 이메일 미제공 시)
    // 단, 이미 이메일 입력 페이지(/auth/input-email)에 있는 경우는 무한 리다이렉트 방지를 위해 제외
    if (token && !token.email && !path.startsWith("/auth/input-email")) {
      return NextResponse.redirect(new URL("/auth/input-email", req.url));
    }

    // 3. 비로그인 상태의 API 요청 차단 (401 Unauthorized 반환)
    if (path.startsWith("/api/") && !path.startsWith("/api/auth")) {
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // 4. 관리자 권한이 필요한 하위 페이지(/admin/questions 등) 접근 시 검증
    if (path.startsWith("/admin/") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // /auth 및 /api/auth 경로는 인증 없이 접근 허용
        if (path.startsWith("/auth") || path.startsWith("/api/auth")) {
          return true;
        }

        // /api 경로는 middleware 본문에서 401 JSON 처리를 위해 통과
        if (path.startsWith("/api/")) {
          return true;
        }

        // 그 외 모든 시스템 페이지(UI)는 로그인이 되어 있어야 함 (token 존재 필수)
        // token이 없으면 NextAuth가 자동으로 pages.signIn(/auth/signin?callbackUrl=...)으로 리다이렉트
        return !!token;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|fonts|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|ico|css|js)$).*)",
  ],
};
