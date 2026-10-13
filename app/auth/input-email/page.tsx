"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, Send, ShieldCheck } from "lucide-react";

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
    } catch (e) {
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
        // 👈 NextAuth 세션에 이메일 값을 명확히 주입하여 업데이트
        await update({
          ...session,
          user: {
            ...session?.user,
            email: email.trim(),
          },
        });

        // 메인으로 강제 이동 및 새로고침
        window.location.href = "/";
      } else {
        setErrorMsg(data.error || "인증 번호가 일치하지 않습니다.");
      }
    } catch (e) {
      setErrorMsg("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-[#121212]">
      <div className="bg-white dark:bg-[#1e1e1e] p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md text-center space-y-6">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 flex items-center justify-center">
          <Mail size={28} />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
            실제 이메일 본인 인증
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            서비스 이용을 위해 <b>실제로 사용하는 이메일 주소</b>를 인증해 주세요.
          </p>
        </div>

        {!isCodeSent ? (
          <form onSubmit={handleSendCode} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                이메일 주소
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 p-3 bg-gray-50 dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:border-yellow-500 text-gray-900 dark:text-white"
                  required
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white dark:text-black font-bold rounded-xl transition-all text-xs cursor-pointer flex items-center gap-1 shrink-0"
                >
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>인증번호 받기</span>
                </button>
              </div>
            </div>

            {errorMsg && <p className="text-xs text-red-500 font-medium text-center">{errorMsg}</p>}
            {successMsg && (
              <p className="text-xs text-green-600 font-medium text-center">{successMsg}</p>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4 text-left">
            <div className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/30 text-xs text-yellow-700 dark:text-yellow-400">
              <b>{email}</b>로 발송된 6자리 인증 번호를 입력해주세요.
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                인증 번호 6자리
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full p-3 text-center tracking-widest font-mono text-lg bg-gray-50 dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-yellow-500 text-gray-900 dark:text-white"
                required
              />
            </div>

            {errorMsg && <p className="text-xs text-red-500 font-medium text-center">{errorMsg}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCodeSent(false)}
                className="py-3 px-4 bg-gray-100 dark:bg-[#2d2d2d] text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                이메일 재입력
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white dark:text-black font-bold py-3 px-4 rounded-xl transition-all shadow-md text-sm cursor-pointer flex items-center justify-center gap-2"
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
  );
}
