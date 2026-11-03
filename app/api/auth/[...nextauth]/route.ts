import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { withAudit } from "@/lib/withAudit";

const handler = NextAuth(authOptions);

export const GET = withAudit(handler, "NextAuth 인증 GET 요청");
export const POST = withAudit(handler, "NextAuth 소셜 로그인/로그아웃 POST 요청");
