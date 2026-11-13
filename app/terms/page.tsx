"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { ArrowLeft, User, ShieldCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <AppShell>
      <div className="w-full max-w-4xl mx-auto space-y-6 text-on-surface py-2">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant">
          <div>
            <h1 className="ui-page-title">서비스 이용약관</h1>
            <p className="ui-page-subtitle mt-1">
              원퀴즈(one-quiz)는 개인 개발자가 개발 및 운영하는 웹 워크스페이스 사이드 프로젝트입니다.
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
          {/* 사이드 프로젝트 운영 안내 배너 */}
          <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-on-surface-variant space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-on-surface">
              <ShieldCheck size={16} className="text-primary" />
              <span>사이드 프로젝트 운영 안내</span>
            </div>
            <p>
              원퀴즈(one-quiz)는 비영리 개인 사이드 프로젝트로 운영되며, 이용자의 개인 데이터는 각 계정별로 안전하게 분리되어 저장됩니다. 서비스 이용과 관련된 제안이나 문의는 GitHub를 통해 자유롭게 전달하실 수 있습니다.
            </p>
          </div>

          {/* 제 1 조 */}
          <section className="space-y-2">
            <h2 className="ui-section-title text-on-surface">제 1 조 (목적 및 성격)</h2>
            <p className="ui-body text-on-surface-variant">
              본 약관은 개발자 <strong>박다훈</strong>(이하 &quot;운영자&quot;)이 개발하여 제공하는 웹 워크스페이스 플랫폼 원퀴즈(one-quiz, 이하 &quot;서비스&quot;)의 이용 조건, 절차 및 이용자와 운영자 간의 권리·의무를 정하는 것을 목적으로 합니다.
            </p>
          </section>

          {/* 제 2 조 */}
          <section className="space-y-2">
            <h2 className="ui-section-title text-on-surface">제 2 조 (제공되는 서비스)</h2>
            <ul className="list-disc pl-5 space-y-1.5 ui-body text-on-surface-variant">
              <li>
                <strong>학습 &amp; 자격증:</strong> 기출문제 풀이, 사용자별 풀이 이력 격리 보관, 마크다운/코드 뷰어
              </li>
              <li>
                <strong>워크스페이스:</strong> 일정 관리(캘린더), 개인 할일(Tasks), 일기장 및 지식노트, 스케치 그림판, 2D 마인드맵, 아이디어 캔버스, ERD &amp; 명세서
              </li>
              <li>
                <strong>라이프 &amp; 소통:</strong> 개인 스마트 가계부, 러닝 기록, 실시간 채팅, 웹 북마크 등
              </li>
            </ul>
          </section>

          {/* 제 3 조 */}
          <section className="space-y-2">
            <h2 className="ui-section-title text-on-surface">제 3 조 (이용자의 권리와 데이터 보호)</h2>
            <p className="ui-body text-on-surface-variant">
              1. 이용자가 서비스 내에 등록한 모든 데이터(학습 오답노트, 일정, 일기, 지출 내역, 다이어그램 등)의 저작권과 소유권은 작성자 본인에게 있습니다.
            </p>
            <p className="ui-body text-on-surface-variant">
              2. 운영자는 이용자의 사전 동의 없이 개인 데이터를 외부에 상업적으로 공개하거나 제3자에게 판매하지 않습니다.
            </p>
          </section>

          {/* 제 4 조 */}
          <section className="space-y-2">
            <h2 className="ui-section-title text-on-surface">제 4 조 (이용자의 주의 사항)</h2>
            <p className="ui-body text-on-surface-variant">
              이용자는 원활한 커뮤니티 및 서비스 유지를 위해 다음 행위를 삼가야 합니다:
            </p>
            <ul className="list-disc pl-5 space-y-1 ui-body text-on-surface-variant">
              <li>타인의 소셜 계정 또는 정보를 무단 도용하는 행위</li>
              <li>비정상적인 크롤링, 트래픽 유발 공격 등 서버 안정성을 해치는 행위</li>
              <li>타인의 지적재산권을 침해하거나 불법·유해 콘텐츠를 등록하는 행위</li>
            </ul>
          </section>

          {/* 제 5 조 */}
          <section className="space-y-2">
            <h2 className="ui-section-title text-on-surface">제 5 조 (책임의 한계 및 면책)</h2>
            <p className="ui-body text-on-surface-variant">
              본 서비스는 개인 사이드 프로젝트로 무료로 제공되며, 천재지변, 클라우드 호스팅 장애(Vercel, MongoDB Atlas 등) 또는 불가피한 서버 점검으로 인한 일시적인 접속 장애에 대해 법적인 손해배상 책임을 지지 않습니다.
            </p>
          </section>

          {/* 운영자 정보 섹션 (GitHub & 개발자 프로필) */}
          <section className="pt-6 border-t border-outline-variant space-y-3 text-xs text-on-surface-variant">
            <h3 className="font-bold text-on-surface text-sm">운영자 및 프로젝트 정보</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <User size={16} className="text-primary shrink-0" />
                <div>
                  <div className="font-semibold text-on-surface">개발 및 운영자</div>
                  <div className="text-on-surface-variant mt-0.5">박다훈 (개인 개발자)</div>
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
              기능 제안, 버그 리포트 또는 문의 사항은 상단 GitHub 프로필 또는 서비스 내 [피드백 제안] 모달을 통해 전달해주시면 검토 후 답변드립니다.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
