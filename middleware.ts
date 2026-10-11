export { default } from "next-auth/middleware";

// 보호할 하위 어드민 경로 설정
export const config = {
  matcher: [
    "/admin/questions",
    "/admin/accounts",
    "/admin/logs",
    "/admin/settings"
  ],
};