"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Folder, RefreshCw, UserCheck, Mail, Globe2, Palette, LogOut } from "lucide-react";
import { SwitchToggle } from "../common/SwitchToggle";
import { ThemeModal } from "@/components/theme/ThemeModal";
import { useSettings } from "../SettingsContext";
import { toast } from "@/lib/toast";

export function GeneralSettingsModule() {
  const { data: session } = useSession();
  const { markSaved } = useSettings();

  const userEmail = session?.user?.email || "로그인되지 않음";
  const userName =
    session?.user?.name || (session?.user?.email ? session.user.email.split("@")[0] : "사용자");

  const [discoverable, setDiscoverable] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("onequiz_settings_discoverable");
      if (saved !== null) return saved === "true";
    }
    return true;
  });

  const [emailUpdates, setEmailUpdates] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("onequiz_settings_email_updates");
      if (saved !== null) return saved === "true";
    }
    return false;
  });

  const [language, setLanguage] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("onequiz_settings_language") || "ko";
    }
    return "ko";
  });

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const handleToggleDiscoverable = (val: boolean) => {
    setDiscoverable(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_settings_discoverable", String(val));
    }
    markSaved();
    toast.success(val ? "프로필 검색 허용이 설정되었습니다." : "프로필 검색이 숨김 처리되었습니다.");
  };

  const handleToggleEmailUpdates = (val: boolean) => {
    setEmailUpdates(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_settings_email_updates", String(val));
    }
    markSaved();
    toast.success(val ? "업데이트 알림 메일 수신이 켜졌습니다." : "업데이트 알림 메일 수신이 해제되었습니다.");
  };

  const handleChangeLanguage = (lang: string) => {
    setLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_settings_language", lang);
    }
    markSaved();
    toast.success(
      `화면 언어가 '${lang === "ko" ? "한국어" : lang === "en" ? "English" : "日本語"}'(으)로 설정되었습니다.`
    );
  };

  return (
    <div className="space-y-3.5">
      {/* 1. Google 계정 연동 및 동의한 권한 카드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-surface-container text-on-surface flex items-center justify-center shrink-0">
              <Folder size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="ui-card-title text-on-surface">Google</span>
                <span className="ui-badge px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                  연결됨
                </span>
              </div>
              <p className="ui-caption text-on-surface-variant font-mono mt-0.5">{userEmail}</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm("Google 계정 연동을 해제하시겠습니까?")) {
                markSaved();
                toast.success("Google 계정 연동이 해제되었습니다.");
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface ui-caption font-medium transition-colors cursor-pointer"
          >
            <RefreshCw size={11} />
            <span>연동 해제</span>
          </button>
        </div>

        {/* 동의한 권한 목록 */}
        <div className="space-y-2 pt-2 border-t border-outline-variant">
          <span className="block ui-caption font-semibold text-on-surface-variant">동의한 권한</span>

          <div className="space-y-1.5">
            {[
              "캘린더 읽기",
              "캘린더 일정 만들기·수정",
              "드라이브(원퀴즈가 만든 파일만)",
              "연락처 읽기",
              "연락처 수정",
            ].map((perm) => (
              <div key={perm} className="flex items-center justify-between">
                <span className="ui-body text-on-surface">{perm}</span>
                <span className="ui-caption text-primary font-bold">허용</span>
              </div>
            ))}
          </div>
        </div>

        <p className="ui-caption text-on-surface-variant pt-2 border-t border-outline-variant leading-relaxed">
          원퀴즈는 캘린더·드라이브·연락처를 필요할 때 Google에서 직접 읽고, 데이터베이스에 복사해 두지 않습니다.
        </p>
      </div>

      {/* 2. 다른 이용자가 나를 찾을 수 있게 카드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <UserCheck size={15} className="text-primary" />
          <h2 className="ui-card-title text-on-surface">다른 이용자가 나를 찾을 수 있게</h2>
        </div>

        <div className="space-y-1.5 ui-body text-on-surface-variant leading-relaxed">
          <p>
            <strong className="font-semibold text-on-surface">기본으로 켜져 있습니다.</strong> 다른 이용자가
            검색으로 회원님을 찾을 수 있고, 그때{" "}
            <strong className="font-semibold text-on-surface">이름과 프로필 사진</strong>이 그 사람에게
            보입니다. 끄면 검색 결과에 나타나지 않습니다.
          </p>
          <p>찾은 사람은 회원님을 자기 프로젝트에 초대할 수 있고, 회원님은 그 초대를 거절할 수 있습니다.</p>
        </div>

        <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-md border border-outline-variant">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface flex items-center justify-center font-bold ui-body shrink-0 border border-outline-variant">
              {userName ? userName[0].toUpperCase() : "U"}
            </div>
            <div>
              <p className="ui-card-title text-on-surface">{userName}</p>
              <p className="ui-caption text-on-surface-variant">이 이름과 사진이 보입니다</p>
            </div>
          </div>

          <SwitchToggle
            checked={discoverable}
            onChange={handleToggleDiscoverable}
            activeLabel="찾을 수 있음"
            inactiveLabel="찾을 수 없음"
          />
        </div>
      </div>

      {/* 3. 업데이트 메일 받기 카드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Mail size={15} className="text-secondary" />
            <h2 className="ui-card-title text-on-surface">업데이트 메일 받기</h2>
          </div>

          <SwitchToggle
            checked={emailUpdates}
            onChange={handleToggleEmailUpdates}
            activeLabel="받기"
            inactiveLabel="받지 않음"
          />
        </div>

        <p className="ui-body text-on-surface-variant leading-relaxed">
          원퀴즈의 새 기능과 바뀐 점을 이메일로 알려 드립니다. 광고 메일은 보내지 않습니다. 끄면 이후의 안내 메일을
          보내지 않습니다.
        </p>
      </div>

      {/* 4. 화면 언어 카드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-1.5">
          <Globe2 size={15} className="text-primary" />
          <h2 className="ui-card-title text-on-surface">화면 언어</h2>
        </div>

        <p className="ui-body text-on-surface-variant leading-relaxed">
          앱 화면에 쓰는 언어입니다. 공지사항처럼 따로 쓴 글은 번역이 없으면 한국어로 보입니다.
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {[
            { id: "ko", label: "한국어" },
            { id: "en", label: "English" },
            { id: "ja", label: "日本語" },
          ].map((l) => (
            <button
              key={l.id}
              onClick={() => handleChangeLanguage(l.id)}
              className={`px-3 py-1.5 rounded-md border transition-colors cursor-pointer ui-button ${
                language === l.id
                  ? "bg-primary text-on-primary border-primary font-semibold"
                  : "bg-surface-container-low text-on-surface border-outline-variant font-light hover:bg-surface-container"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. 테마 및 계정 세션 관리 카드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="ui-card-title text-on-surface">테마 및 계정 관리</h2>
          <p className="ui-caption text-on-surface-variant mt-0.5">
            원하는 테마로 색상 환경을 전환하거나 안전하게 로그아웃할 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant ui-button transition-colors cursor-pointer"
          >
            <Palette size={14} className="text-primary" />
            <span>테마 변경</span>
          </button>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface ui-button font-light transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>로그아웃</span>
          </button>
        </div>
      </div>

      {/* 24개 테마 모달 */}
      <ThemeModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />
    </div>
  );
}
