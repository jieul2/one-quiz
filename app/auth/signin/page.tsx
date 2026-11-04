"use client";

import { Suspense } from "react";
import { Lock } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useMounted } from "@/lib/hooks/useMounted";
import { AppShell } from "@/components/layout/AppShell";

function SignInContent() {
  const mounted = useMounted();
  const searchParams = useSearchParams();

  // 사용자가 원래 접근하려던 페이지 경로를 가져옴 (없으면 메인('/')으로 이동)
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  if (!mounted) return null;

  return (
    <AppShell>
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-surface-container-lowest p-8 md:p-10 rounded-3xl shadow-xl border border-outline-variant w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Lock size={30} />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              원퀴즈 (OneQuiz) 로그인
            </h1>
            <p className="text-xs text-on-surface-variant">
              소셜 계정으로 빠르고 안전하게 시작하세요.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {/* 구글 로그인 */}
            <button
              onClick={() => signIn("google", { callbackUrl })}
              className="w-full flex items-center justify-center gap-3 bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface font-bold py-3.5 px-4 rounded-xl transition-all shadow-xs cursor-pointer text-sm"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google 계정으로 계속하기</span>
            </button>

            {/* 카카오 로그인 */}
            <button
              onClick={() => signIn("kakao", { callbackUrl })}
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold py-3.5 px-4 rounded-xl transition-all shadow-xs cursor-pointer text-sm"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.84 5.32 4.62 6.74-.15.54-.56 1.96-.64 2.27-.1.38.14.38.3.26.12-.09 1.95-1.33 2.74-1.87.65.1 1.32.15 1.98.15 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
              </svg>
              <span>카카오 계정으로 계속하기</span>
            </button>
          </div>

          <div className="pt-2 border-t border-outline-variant">
            <Link
              href="/"
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors"
            >
              ← 메인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function CustomSignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-on-surface-variant text-sm">
          로딩 중...
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
