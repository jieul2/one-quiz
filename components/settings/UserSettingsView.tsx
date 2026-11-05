"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  Settings,
  Mail,
  UserCheck,
  RefreshCw,
  Globe2,
  Calendar,
  FileText,
  CheckCircle2,
  Folder,
  Bookmark,
  Users,
  Network,
  FolderGit2,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  LogOut,
  Palette,
} from "lucide-react";
import { ThemeModal } from "@/components/theme/ThemeModal";
import { SaveStatusIndicator, SaveStatus } from "@/components/common/SaveStatusIndicator";
import { toast } from "@/lib/toast";

// 단정하고 심플한 Google 아이콘 (기능 아이콘 형태)
function GoogleMarkIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center font-bold text-[11px] text-primary ${className}`}>
      G
    </span>
  );
}

// 스위치 토글 컴포넌트 (테마 색상 primary / surface 준수)
function SwitchToggle({
  checked,
  onChange,
  activeLabel,
  inactiveLabel,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      {(activeLabel || inactiveLabel) && (
        <span className={`text-xs ${checked ? "font-semibold text-on-surface" : "font-light text-on-surface-variant"}`}>
          {checked ? activeLabel : inactiveLabel}
        </span>
      )}
      <div
        className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors duration-150 ${
          checked ? "bg-primary" : "bg-surface-container-high border border-outline-variant"
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-xs transform transition-transform duration-150 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
}

type SettingsTab =
  | "overview"
  | "calendar"
  | "notes"
  | "tasks"
  | "drive"
  | "bookmarks"
  | "contacts"
  | "mindmap"
  | "projects"
  | "chat"
  | "admin";

export function UserSettingsView() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");

  // 설정 상태 (로컬스토리지 연동)
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

  // 저장 상태 인디케이터 관리
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [savedTimeStr, setSavedTimeStr] = useState<string>("");

  const markSaved = () => {
    const now = new Date();
    setSavedTimeStr(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    setSaveStatus("saved");
  };

  const handleToggleDiscoverable = (val: boolean) => {
    setSaveStatus("saving");
    setDiscoverable(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_settings_discoverable", String(val));
    }
    markSaved();
    toast.success(val ? "프로필 검색 허용이 설정되었습니다." : "프로필 검색이 숨김 처리되었습니다.");
  };

  const handleToggleEmailUpdates = (val: boolean) => {
    setSaveStatus("saving");
    setEmailUpdates(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_settings_email_updates", String(val));
    }
    markSaved();
    toast.success(val ? "업데이트 알림 메일 수신이 켜졌습니다." : "업데이트 알림 메일 수신이 해제되었습니다.");
  };

  const handleChangeLanguage = (lang: string) => {
    setSaveStatus("saving");
    setLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("onequiz_settings_language", lang);
    }
    markSaved();
    toast.success(`화면 언어가 '${lang === "ko" ? "한국어" : lang === "en" ? "English" : "日本語"}'(으)로 설정되었습니다.`);
  };

  const userEmail = session?.user?.email || "로그인되지 않음";
  const userName = session?.user?.name || (session?.user?.email ? session.user.email.split("@")[0] : "사용자");
  const isAdmin = session?.user?.role === "admin";

  const navTabs: { id: SettingsTab; label: string; hasGoogle?: boolean; icon: React.ElementType }[] = [
    { id: "overview", label: "개요", icon: Settings },
    { id: "calendar", label: "캘린더", hasGoogle: true, icon: Calendar },
    { id: "notes", label: "노트", icon: FileText },
    { id: "tasks", label: "할일", icon: CheckCircle2 },
    { id: "drive", label: "드라이브", hasGoogle: true, icon: Folder },
    { id: "bookmarks", label: "북마크", icon: Bookmark },
    { id: "contacts", label: "연락처", hasGoogle: true, icon: Users },
  ];

  const subNavTabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: "mindmap", label: "마인드맵", icon: Network },
    { id: "projects", label: "프로젝트", icon: FolderGit2 },
    { id: "chat", label: "채팅", icon: MessageSquare },
    ...(isAdmin ? [{ id: "admin" as SettingsTab, label: "관리자 설정", icon: ShieldAlert }] : []),
  ];

  return (
    <div className="w-full space-y-4 text-on-surface">
      {/* 상단 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant pb-3">
        <h1 className="ui-page-title">
          설정
        </h1>

        <div className="flex items-center gap-2">
          {/* 저장 상태 인디케이터 */}
          <SaveStatusIndicator status={saveStatus} savedAt={savedTimeStr} />

          <Link
            href="/admin/settings"
            className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface font-medium px-2.5 py-1.5 rounded-md bg-surface-container-low border border-outline-variant w-max transition-colors"
          >
            <ShieldAlert size={13} className="text-secondary" />
            <span>관리자 시스템 설정</span>
            <ChevronRight size={12} />
          </Link>
        </div>
      </div>

      {/* 2열 구조 (좌측 사이드 탭 + 우측 컨텐츠) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* ================= 좌측 세로 탭 메뉴 ================= */}
        <div className="md:col-span-3 space-y-0.5 bg-surface-container-lowest p-1.5 rounded-lg border border-outline-variant">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                  isActive
                    ? "bg-surface-container text-on-surface font-semibold"
                    : "text-on-surface-variant font-light hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <span>{tab.label}</span>
                {tab.hasGoogle && <GoogleMarkIcon />}
              </button>
            );
          })}

          <div className="h-px bg-outline-variant my-1.5 mx-1" />

          {subNavTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs transition-colors cursor-pointer ${
                  isActive
                    ? "bg-surface-container text-on-surface font-semibold"
                    : "text-on-surface-variant font-light hover:bg-surface-container-low hover:text-on-surface"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ================= 우측 상세 설정 컨텐츠 패널 ================= */}
        <div className="md:col-span-9 space-y-3.5">
          {activeTab === "overview" && (
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
                        <span className="font-semibold text-xs text-on-surface">Google</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-surface-container text-on-surface-variant">
                          연결됨
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant font-light font-mono mt-0.5">
                        {userEmail}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm("Google 계정 연동을 해제하시겠습니까?")) {
                        markSaved();
                        toast.success("Google 계정 연동이 해제되었습니다.");
                      }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface text-xs font-light transition-colors cursor-pointer"
                  >
                    <RefreshCw size={11} />
                    <span>연동 해제</span>
                  </button>
                </div>

                {/* 동의한 권한 목록 */}
                <div className="space-y-2 pt-2 border-t border-outline-variant text-xs">
                  <span className="block font-medium text-on-surface-variant text-[11px]">
                    동의한 권한
                  </span>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface font-light">캘린더 읽기</span>
                      <span className="text-primary font-medium text-xs">허용</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-on-surface font-light">캘린더 일정 만들기·수정</span>
                      <span className="text-primary font-medium text-xs">허용</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-on-surface font-light">드라이브(원퀴즈가 만든 파일만)</span>
                      <span className="text-primary font-medium text-xs">허용</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-on-surface font-light">연락처 읽기</span>
                      <span className="text-primary font-medium text-xs">허용</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-on-surface font-light">연락처 수정</span>
                      <span className="text-primary font-medium text-xs">허용</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant pt-2 border-t border-outline-variant font-light leading-relaxed">
                  원퀴즈는 캘린더·드라이브·연락처를 필요할 때 Google에서 직접 읽고, 데이터베이스에 복사해 두지 않습니다.
                </p>
              </div>

              {/* 2. 다른 이용자가 나를 찾을 수 있게 카드 */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-1.5">
                  <UserCheck size={15} className="text-primary" />
                  <h2 className="font-semibold text-xs text-on-surface">
                    다른 이용자가 나를 찾을 수 있게
                  </h2>
                </div>

                <div className="space-y-1.5 text-xs text-on-surface-variant font-light leading-relaxed">
                  <p>
                    <strong className="font-medium text-on-surface">기본으로 켜져 있습니다.</strong> 다른 이용자가 검색으로 회원님을 찾을 수 있고, 그때 <strong className="font-medium text-on-surface">이름과 프로필 사진</strong>이 그 사람에게 보입니다. 끄면 검색 결과에 나타나지 않습니다.
                  </p>
                  <p>
                    찾은 사람은 회원님을 자기 프로젝트에 초대할 수 있고, 회원님은 그 초대를 거절할 수 있습니다.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-md border border-outline-variant">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-surface-container text-on-surface flex items-center justify-center font-medium text-xs shrink-0 border border-outline-variant">
                      {userName ? userName[0].toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="font-medium text-xs text-on-surface">{userName}</p>
                      <p className="text-[10px] text-on-surface-variant font-light">이 이름과 사진이 보입니다</p>
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
                    <h2 className="font-semibold text-xs text-on-surface">업데이트 메일 받기</h2>
                  </div>

                  <SwitchToggle
                    checked={emailUpdates}
                    onChange={handleToggleEmailUpdates}
                    activeLabel="받기"
                    inactiveLabel="받지 않음"
                  />
                </div>

                <p className="text-xs text-on-surface-variant font-light leading-relaxed">
                  원퀴즈의 새 기능과 바뀐 점을 이메일로 알려 드립니다. 광고 메일은 보내지 않습니다. 끄면 이후의 안내 메일을 보내지 않습니다.
                </p>
              </div>

              {/* 4. 화면 언어 카드 */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Globe2 size={15} className="text-primary" />
                  <h2 className="font-semibold text-xs text-on-surface">화면 언어</h2>
                </div>

                <p className="text-xs text-on-surface-variant font-light leading-relaxed">
                  앱 화면에 쓰는 언어입니다. 공지사항처럼 따로 쓴 글은 번역이 없으면 한국어로 보입니다.
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1 text-xs">
                  {[
                    { id: "ko", label: "한국어" },
                    { id: "en", label: "English" },
                    { id: "ja", label: "日本語" },
                  ].map((l) => (
                    <button
                      key={l.id}
                      onClick={() => handleChangeLanguage(l.id)}
                      className={`px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
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
                  <h2 className="font-semibold text-xs text-on-surface">테마 및 계정 관리</h2>
                  <p className="text-xs text-on-surface-variant font-light mt-0.5">
                    원하는 테마로 색상 환경을 전환하거나 로그아웃할 수 있습니다.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setIsThemeModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant font-medium transition-colors cursor-pointer"
                  >
                    <Palette size={13} className="text-primary" />
                    <span>테마 변경</span>
                  </button>

                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-surface-container-low hover:bg-surface-container border border-outline-variant text-on-surface-variant hover:text-on-surface font-light transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>로그아웃</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= 캘린더 탭 ================= */}
          {activeTab === "calendar" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
                <Calendar size={15} className="text-primary" />
                <h2 className="font-semibold text-xs text-on-surface">캘린더 동기화 설정</h2>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-container-low border border-outline-variant">
                  <div>
                    <p className="font-medium text-on-surface">일정 자동 동기화</p>
                    <p className="text-[11px] text-on-surface-variant font-light">10분마다 일정을 동기화합니다.</p>
                  </div>
                  <SwitchToggle
                    checked={true}
                    onChange={() => {
                      markSaved();
                      toast.success("자동 동기화 설정이 변경되었습니다.");
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= 노트 탭 ================= */}
          {activeTab === "notes" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
                <FileText size={15} className="text-primary" />
                <h2 className="font-semibold text-xs text-on-surface">노트 & 일기 설정</h2>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-container-low border border-outline-variant">
                  <div>
                    <p className="font-medium text-on-surface">학습 일기 하루 1회 알림</p>
                    <p className="text-[11px] text-on-surface-variant font-light">매일 저녁 9시에 오늘의 회고 작성을 알려드립니다.</p>
                  </div>
                  <SwitchToggle
                    checked={true}
                    onChange={() => {
                      markSaved();
                      toast.success("일기 알림 설정이 변경되었습니다.");
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= 할일 탭 ================= */}
          {activeTab === "tasks" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
                <CheckCircle2 size={15} className="text-primary" />
                <h2 className="font-semibold text-xs text-on-surface">할일 보드 설정</h2>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-md bg-surface-container-low border border-outline-variant">
                  <div>
                    <p className="font-medium text-on-surface">완료 보드 기본 숨김</p>
                    <p className="text-[11px] text-on-surface-variant font-light">할일 페이지 접속 시 완료된 항목 칸을 기본으로 숨깁니다.</p>
                  </div>
                  <SwitchToggle
                    checked={true}
                    onChange={() => {
                      markSaved();
                      toast.success("완료 보드 기본 표시 설정이 저장되었습니다.");
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= 드라이브 탭 ================= */}
          {activeTab === "drive" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
                <Folder size={15} className="text-primary" />
                <h2 className="font-semibold text-xs text-on-surface">드라이브 스토리지 연동</h2>
              </div>
              <p className="text-xs text-on-surface-variant font-light">
                원퀴즈 전용 폴더에 기출 모의고사 PDF 및 학습 자료를 보관합니다.
              </p>
            </div>
          )}

          {/* ================= 북마크 탭 ================= */}
          {activeTab === "bookmarks" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
                <Bookmark size={15} className="text-primary" />
                <h2 className="font-semibold text-xs text-on-surface">북마크 설정</h2>
              </div>
              <p className="text-xs text-on-surface-variant font-light">
                자주 방문하는 학습 링크 및 즐겨찾기 폴더를 관리합니다.
              </p>
            </div>
          )}

          {/* ================= 연락처 탭 ================= */}
          {activeTab === "contacts" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
                <Users size={15} className="text-primary" />
                <h2 className="font-semibold text-xs text-on-surface">연락처 동기화</h2>
              </div>
              <p className="text-xs text-on-surface-variant font-light">
                스터디 팀원들을 로드맵에 초대하기 위한 주소록을 연동합니다.
              </p>
            </div>
          )}

          {/* ================= 마인드맵 탭 ================= */}
          {activeTab === "mindmap" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
                <Network size={15} className="text-primary" />
                <h2 className="font-semibold text-xs text-on-surface">마인드맵 캔버스 설정</h2>
              </div>
              <p className="text-xs text-on-surface-variant font-light">
                개념 정리 마인드맵 노드의 자동 정렬 및 배경 격자를 설정합니다.
              </p>
            </div>
          )}

          {/* ================= 프로젝트 탭 ================= */}
          {activeTab === "projects" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
                <FolderGit2 size={15} className="text-primary" />
                <h2 className="font-semibold text-xs text-on-surface">프로젝트 로드맵 설정</h2>
              </div>
              <p className="text-xs text-on-surface-variant font-light">
                간트 차트 타임라인 기본 줌 레벨과 팀원 댓글 알림을 설정합니다.
              </p>
            </div>
          )}

          {/* ================= 채팅 탭 ================= */}
          {activeTab === "chat" && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-1.5 border-b border-outline-variant pb-2.5">
                <MessageSquare size={15} className="text-primary" />
                <h2 className="font-semibold text-xs text-on-surface">채팅 설정</h2>
              </div>
              <p className="text-xs text-on-surface-variant font-light">
                메시지 전송 단축키 및 알림음을 설정합니다.
              </p>
            </div>
          )}

          {/* ================= 관리자 설정 탭 (관리자 권한 보유자 전용) ================= */}
          {activeTab === "admin" && isAdmin && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-outline-variant pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <ShieldAlert size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-on-surface">관리자 콘솔 & 시스템 제어</h2>
                    <p className="text-[11px] text-on-surface-variant font-light">
                      시스템 관리자({userEmail}) 전용 운영 패널입니다.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-bold">
                  ADMIN ROLE
                </span>
              </div>

              {/* 하위 콘솔 바로가기 그리드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/admin"
                  className="p-3.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant flex items-center justify-between transition-colors group"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                      콘솔 대시보드
                    </span>
                    <p className="text-[11px] text-on-surface-variant font-light">
                      전체 기출문제 및 사용자 통계 개요
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  href="/admin/questions"
                  className="p-3.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant flex items-center justify-between transition-colors group"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                      문항 데이터 관리
                    </span>
                    <p className="text-[11px] text-on-surface-variant font-light">
                      과목/회차별 문항 등록, 검수 및 수정
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  href="/admin/accounts"
                  className="p-3.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant flex items-center justify-between transition-colors group"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                      계정 & 권한 관리
                    </span>
                    <p className="text-[11px] text-on-surface-variant font-light">
                      사용자 목록 및 관리자 권한 부여
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  href="/admin/logs"
                  className="p-3.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-outline-variant flex items-center justify-between transition-colors group"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                      시스템 감사 로그
                    </span>
                    <p className="text-[11px] text-on-surface-variant font-light">
                      API 호출 및 보안 변경 로그 실시간 모니터링
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-on-surface-variant group-hover:text-primary transition-colors" />
                </Link>
              </div>

              {/* 관리자 콘솔 전체 화면 열기 버튼 */}
              <div className="pt-2">
                <Link
                  href="/admin"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90 transition-opacity shadow-xs"
                >
                  <ShieldAlert size={14} />
                  <span>관리자 전체 콘솔 열기</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <ThemeModal isOpen={isThemeModalOpen} onClose={() => setIsThemeModalOpen(false)} />
    </div>
  );
}
