"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ArrowLeft, User, ShieldCheck } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <AppShell>
      <div className="w-full max-w-4xl mx-auto space-y-6 text-on-surface py-2">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
          <div>
            <h1 className="ui-page-title">개인정보처리방침</h1>
            <p className="ui-page-subtitle mt-1">
              원퀴즈(one-quiz)는 이용자의 소중한 개인정보를 안전하게 보호하며, 최소한의 정보만을 처리합니다.
            </p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container ui-button text-on-surface transition-colors shrink-0"
          >
            <ArrowLeft size={14} />
            <span>홈으로 복귀</span>
          </Link>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 sm:p-8 space-y-8 text-on-surface leading-relaxed">
          {/* 사이드 프로젝트 개인정보 보호 안내 */}
          <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface-variant space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-on-surface">
              <ShieldCheck size={16} className="text-primary" />
              <span>개인 개발자 프로젝트 개인정보 안내</span>
            </div>
            <p>
              원퀴즈는 비영리 개인 사이드 프로젝트로 운영되며, 소셜 로그인(Google, Kakao)을 통한 회원 식별 및 개별 워크스페이스 데이터 격리 저장 목적 외에는 이용자의 개인정보를 일절 사용하거나 외부에 제공하지 않습니다.
            </p>
          </div>

          {/* 제 1 조 */}
          <section className="space-y-2">
            <h2 className="ui-section-title text-on-surface">1. 수집하는 개인정보 항목 및 목적</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse border border-outline-variant">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface font-semibold">
                    <th className="p-2.5 border border-outline-variant">수집 경로</th>
                    <th className="p-2.5 border border-outline-variant">수집 항목</th>
                    <th className="p-2.5 border border-outline-variant">목적 및 보유 기간</th>
                  </tr>
                </thead>
                <tbody className="text-on-surface-variant">
                  <tr>
                    <td className="p-2.5 border border-outline-variant font-medium">소셜 로그인 (Google / Kakao)</td>
                    <td className="p-2.5 border border-outline-variant">이메일, 프로필 이름, 프로필 사진 URL, 고유 계정 ID</td>
                    <td className="p-2.5 border border-outline-variant">계정 생성 및 사용자 식별 (회원 탈퇴 시 즉시 파기)</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 border border-outline-variant font-medium">이용자 직접 작성 데이터</td>
                    <td className="p-2.5 border border-outline-variant">학습 풀이 기록, 캘린더 일정, 개인 할일, 일기, 가계부 내역, 스케치 이미지</td>
                    <td className="p-2.5 border border-outline-variant">개인 워크스페이스 기능 제공 (본인 삭제 또는 회원 탈퇴 시 즉시 파기)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 제 2 조 */}
          <section className="space-y-2">
            <h2 className="ui-section-title text-on-surface">2. 데이터 저장소 및 보안 조치</h2>
            <ul className="list-disc pl-5 space-y-1.5 ui-body text-on-surface-variant">
              <li>
                <strong>계정별 독립 격리:</strong> 모든 데이터는 로그인한 사용자의 고유 계정 식별자 기반으로 엄격히 분리되어 타인에게 노출되지 않습니다.
              </li>
              <li>
                <strong>클라우드 데이터베이스:</strong> MongoDB Atlas의 암호화된 데이터베이스에 보관되며 인가된 API 엔드포인트를 통해서만 접근됩니다.
              </li>
              <li>
                <strong>이미지 파일 보관:</strong> 일기 및 스케치 업로드 이미지는 Cloudinary 보안 클라우드 스토리지에 저장됩니다.
              </li>
            </ul>
          </section>

          {/* 제 3 조 */}
          <section className="space-y-2">
            <h2 className="ui-section-title text-on-surface">3. 제3자 제공 및 마케팅 활용 금지</h2>
            <p className="ui-body text-on-surface-variant">
              운영자는 이용자의 어떠한 개인정보도 영리 목적으로 제3자에게 판매하거나 마케팅/광고 용도로 활용하지 않습니다.
            </p>
          </section>

          {/* 제 4 조 */}
          <section className="space-y-2">
            <h2 className="ui-section-title text-on-surface">4. 이용자의 권리 및 데이터 삭제</h2>
            <p className="ui-body text-on-surface-variant">
              이용자는 언제든지 본인이 작성한 데이터(일정, 할일, 일기, 지출 내역 등)를 직접 수정하거나 삭제할 수 있으며, 계정 데이터 전체 파기를 원할 경우 언제든지 운영자에게 요청하실 수 있습니다.
            </p>
          </section>

          {/* 개인정보 관리 및 문의 섹션 */}
          <section className="pt-6 border-t border-outline-variant space-y-3 text-xs text-on-surface-variant">
            <h3 className="font-bold text-on-surface text-sm">개인정보 관리 및 개발자 정보</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <User size={16} className="text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-on-surface">개인정보 관리자</div>
                  <div className="text-on-surface-variant mt-0.5">박다훈 (개발자)</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                <div>
                  <div className="font-semibold text-on-surface">GitHub 저장소 &amp; 프로필</div>
                  <a
                    href="https://github.com/jieul2"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline mt-0.5 inline-block"
                  >
                    github.com/jieul2
                  </a>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant pt-1">
              개인정보 관련 문의나 데이터 삭제 요청은 GitHub Issues 또는 서비스 내 [피드백 제안] 모달을 통해 전달해주시면 지체 없이 처리해 드립니다.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
