import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { CustomThemeProvider } from "@/components/theme/CustomThemeProvider";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { AlertDialogContainer } from "@/components/ui/AlertDialogContainer";

export const metadata: Metadata = {
  title: "원퀴즈 (OneQuiz) - 올인원 통합 워크스페이스 플랫폼",
  description: "일정, 업무, 지식, 프로젝트, 커뮤니티, 라이프스타일까지 하나로 연결하는 올인원 통합 웹 플랫폼",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/PretendardVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-sans antialiased overflow-x-hidden transition-colors duration-200">
        <Providers>
          <CustomThemeProvider>
            {children}
            <ToastContainer />
            <AlertDialogContainer />
          </CustomThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
