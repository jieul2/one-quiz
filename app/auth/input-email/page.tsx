"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, Send, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function InputEmailPage() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("올바른 이메일 형식으로 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsCodeSent(true);
        setSuccessMsg("인증 번호가 발송되었습니다. 메일함을 확인해주세요.");
      } else {
        setErrorMsg(data.error || "인증 번호 발송 실패");
      }
    } catch {
      setErrorMsg("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      setErrorMsg("6자리 인증 번호를 올바르게 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        // NextAuth 세션에 이메일 값을 명확히 주입하여 업데이트
        await update({
          ...session,
          user: {
            ...session?.user,
            email: email.trim(),
          },
        });

        // 메인으로 이동 및 세션 리프레시
        router.push("/");
        router.refresh();
      } else {
        setErrorMsg(data.error || "인증 번호가 일치하지 않습니다.");
      }
    } catch {
      setErrorMsg("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-surface-container-lowest p-8 md:p-10 rounded-3xl shadow-xl border border-outline-variant w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Mail size={30} />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">
              실제 이메일 본인 인증
            </h1>
            <p className="text-xs text-on-surface-variant">
              서비스 이용을 위해 <b>실제로 사용하는 이메일 주소</b>를 인증해 주세요.
            </p>
          </div>

          {!isCodeSent ? (
            <form onSubmit={handleSendCode} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  이메일 주소
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 p-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm focus:outline-none focus:border-primary text-on-surface"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 bg-primary hover:opacity-90 disabled:opacity-50 text-on-primary font-bold rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>인증번호 받기</span>
                  </button>
                </div>
              </div>

              {errorMsg && <p className="text-xs text-destructive font-medium text-center">{errorMsg}</p>}
              {successMsg && (
                <p className="text-xs text-primary font-medium text-center">{successMsg}</p>
              )}
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
              <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 text-xs text-primary">
                <b>{email}</b>로 발송된 6자리 인증 번호를 입력해주세요.
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1.5">
                  인증 번호 6자리
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-3 text-center tracking-widest font-mono text-lg bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:border-primary text-on-surface"
                  required
                />
              </div>

              {errorMsg && <p className="text-xs text-destructive font-medium text-center">{errorMsg}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCodeSent(false)}
                  className="py-3 px-4 bg-surface-container-low hover:bg-surface-container text-on-surface font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  이메일 재입력
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-primary hover:opacity-90 disabled:opacity-50 text-on-primary font-bold py-3 px-4 rounded-xl transition-all shadow-xs text-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> 확인 중...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> 인증 완료 및 시작하기
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
