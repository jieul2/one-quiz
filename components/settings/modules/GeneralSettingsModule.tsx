"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Folder, RefreshCw, UserCheck, Mail, Globe2, Palette, Sun, Moon, LogOut, GraduationCap } from "lucide-react";
import { SwitchToggle } from "../common/SwitchToggle";
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

  // 🌟 기출문제 풀이 기본 설정 (기본값 20문제)
  const [defaultQuestionCount, setDefaultQuestionCount] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("onequiz_default_question_count") || "20";
    }
    return "20";
  });

  const [defaultUnsolvedOnly, setDefaultUnsolvedOnly] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("onequiz_default_unsolved_only") === "true";
    }
    return false;
  });

  const [defaultSequential, setDefaultSequential] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("onequiz_default_sequential") === "true";
    }
    return false;
  });

  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = (resolvedTheme || theme) === "dark";

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

  const handleChangeQuestionCount = (count: string) => {
    setDefaultQuestionCount(count);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_default_question_count", count);
    }
    markSaved();
    const countLabel = count === "all" ? "전체 문제" : `${count}문제`;
    toast.success(`기출문제 기본 풀이 개수가 '${countLabel}'(으)로 설정되었습니다.`);
  };

  const handleToggleDefaultUnsolved = (val: boolean) => {
    setDefaultUnsolvedOnly(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_default_unsolved_only", String(val));
    }
    markSaved();
    toast.success(val ? "기출문제 풀이 시 '안 푼 문제 우선'이 기본 적용됩니다." : "기본 '안 푼 문제 우선'이 해제되었습니다.");
  };

  const handleToggleDefaultSequential = (val: boolean) => {
    setDefaultSequential(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_default_sequential", String(val));
    }
    markSaved();
    toast.success(val ? "기출문제 풀이 시 '순차적 번호순' 출제가 기본 적용됩니다." : "기본 '순차적 번호순' 출제가 해제되었습니다.");
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

      {/* 4. 기출문제 풀이 기본 설정 카드 */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <GraduationCap size={16} className="text-primary" />
            <h2 className="ui-card-title text-on-surface">기출문제 풀이 기본 설정</h2>
          </div>
          <span className="ui-badge px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold text-xs">
            기본 {defaultQuestionCount === "all" ? "전체" : `${defaultQuestionCount}개`}
          </span>
        </div>

        <p className="ui-body text-on-surface-variant leading-relaxed">
          기출문제 풀이를 시작할 때 한 번에 출제될 기본 문제 수를 설정합니다. 풀이 화면에서도 언제든 변경할 수 있습니다.
        </p>

        {/* 문항 수 선택 버튼 그룹 */}
        <div>
          <span className="block ui-caption font-semibold text-on-surface-variant mb-1.5">한 번에 풀 문제 수</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "10", label: "10문제" },
              { id: "20", label: "20문제 (기본)" },
              { id: "30", label: "30문제" },
              { id: "all", label: "전체 문제" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleChangeQuestionCount(opt.id)}
                className={`px-3 py-2 rounded-lg border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-center ${
                  defaultQuestionCount === opt.id
                    ? "bg-primary text-on-primary border-primary shadow-xs ring-1 ring-primary"
                    : "bg-surface-container-low text-on-surface border-outline-variant hover:bg-surface-container"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 부가 기본 옵션 (안 푼 문제 우선, 번호순 순차 출제) */}
        <div className="space-y-2 pt-2 border-t border-outline-variant">
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="ui-body font-medium text-on-surface">안 푼 문제 우선 출제</span>
              <p className="ui-caption text-on-surface-variant">풀이 이력이 없거나 적은 문제를 우선적으로 선정합니다.</p>
            </div>
            <SwitchToggle
              checked={defaultUnsolvedOnly}
              onChange={handleToggleDefaultUnsolved}
              activeLabel="적용"
              inactiveLabel="미적용"
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <span className="ui-body font-medium text-on-surface">순차적 보기 (번호순 정렬)</span>
              <p className="ui-caption text-on-surface-variant">문제를 랜덤 셔플하지 않고 원래 기출 번호 순서대로 나열합니다.</p>
            </div>
            <SwitchToggle
              checked={defaultSequential}
              onChange={handleToggleDefaultSequential}
              activeLabel="순서대로"
              inactiveLabel="랜덤 셔플"
            />
          </div>
        </div>
      </div>

      {/* 5. 화면 언어 카드 */}
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
            라이트 또는 블랙/다크 테마 환경을 전환하거나 안전하게 로그아웃할 수 있습니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 1클릭 즉시 테마 전환 버튼 */}
          <button
            type="button"
            onClick={() => {
              const nextTheme = isDark ? "light" : "dark";
              setTheme(nextTheme);
              toast.success(nextTheme === "dark" ? "다크 모드가 적용되었습니다." : "라이트 모드가 적용되었습니다.");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant ui-button transition-all cursor-pointer active:scale-95"
            title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
          >
            {isDark ? (
              <>
                <Sun size={14} className="text-amber-500" />
                <span>라이트 모드로 전환</span>
              </>
            ) : (
              <>
                <Moon size={14} className="text-primary" />
                <span>다크 모드로 전환</span>
              </>
            )}
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
    </div>
  );
}
