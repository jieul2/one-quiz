import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from './providers';
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "oneQuiz",
  description: "나혼자 공부하는 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning은 next-themes 사용 시 발생하는 경고를 방지합니다.
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-200 transition-colors duration-300`}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}


