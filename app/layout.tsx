import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { CustomThemeProvider } from "@/components/theme/CustomThemeProvider";
import { ToastContainer } from "@/components/ui/ToastContainer";

export const metadata: Metadata = {
  title: "원퀴즈 (OneQuiz) - 나혼자 공부하는 플랫폼",
  description: "기출문제 자가 학습, 일정, 일기장, 프로젝트 보드를 통합한 올인원 스터디 웹 워크스페이스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="font-sans antialiased overflow-x-hidden transition-colors duration-200">
        <Providers>
          <CustomThemeProvider>
            {children}
            <ToastContainer />
          </CustomThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
